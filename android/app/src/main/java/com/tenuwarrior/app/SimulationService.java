package com.tenuwarrior.app;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.net.Uri;
import android.os.*;
import android.webkit.*;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;
import com.getcapacitor.JSObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

/** Sole owner of the runtime and ledger, independent of Activity recreation. */
public final class SimulationService extends Service {
    static final String RUN = "com.tenuwarrior.app.RUN_SIMULATION", PAUSE = "com.tenuwarrior.app.PAUSE_SIMULATION";
    private static final String ORIGIN = "appassets.androidplatform.net", CHANNEL = "simulation-running";
    private static final int NOTIFICATION = 1001;
    interface Client { void event(String name, JSObject value); }
    interface Reply { void complete(JSObject result); }
    public final class LocalBinder extends Binder { SimulationService service() { return SimulationService.this; } }
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<Integer, Runnable> timers = new HashMap<>();
    private final Map<Integer, Reply> replies = new HashMap<>();
    private final Set<Client> clients = new HashSet<>();
    private final List<Runnable> readyQueue = new ArrayList<>();
    private final ExecutorService network = Executors.newFixedThreadPool(8);
    private WebView engine;
    private PowerManager.WakeLock wakeLock;
    private boolean ready, foreground, destroyed, pauseRequested, idleScheduled;
    private String failure;
    private int sequence, active, unsettled;
    private long lastHeartbeat;
    private final Runnable idle = () -> { idleScheduled = false; if (active == 0 && unsettled == 0) demote(); };

    @Override public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= 26) getSystemService(NotificationManager.class).createNotificationChannel(
            new NotificationChannel(CHANNEL, getString(R.string.simulation_channel), NotificationManager.IMPORTANCE_LOW));
        wakeLock = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "tenuwarrior:simulation");
        wakeLock.setReferenceCounted(false);
        engine = new WebView(getApplicationContext());
        engine.getSettings().setJavaScriptEnabled(true);
        engine.getSettings().setAllowFileAccess(false); engine.getSettings().setAllowContentAccess(false);
        engine.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= 26) engine.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        engine.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && ORIGIN.equals(uri.getHost())) {
                    WebResourceResponse resource = loader.shouldInterceptRequest(uri);
                    if (resource != null) return resource;
                }
                return new WebResourceResponse("text/plain", "utf-8", 403, "Forbidden", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) { fail("MOBILE_RENDERER_STOPPED"); return true; }
        });
        engine.addJavascriptInterface(new NativeRuntimePlugin.Storage(new File(getFilesDir(), "mobile-runtime")), "WarriorStorageNative");
        engine.addJavascriptInterface(new HostBridge(), "WarriorServiceNative");
        engine.loadUrl("https://" + ORIGIN + "/assets/public/runtime-host.html");
        handler.postDelayed(() -> { if (!ready && failure == null) fail("MOBILE_SERVICE_START_TIMEOUT"); }, 20000);
    }
    @Override public IBinder onBind(Intent intent) { return new LocalBinder(); }
    void attach(Client client) { clients.add(client); }
    void detach(Client client) { clients.remove(client); }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && PAUSE.equals(intent.getAction())) {
            pauseRequested = true;
            whenReady(() -> invoke("pauseAll", new JSONArray(), result -> {
                pauseRequested = false;
                if (!result.optBoolean("ok")) fail("MOBILE_PAUSE_FAILED");
            }));
        }
        return START_NOT_STICKY;
    }
    void promote() {
        if (destroyed || failure != null) throw new IllegalStateException("MOBILE_SERVICE_UNAVAILABLE");
        handler.removeCallbacks(idle); idleScheduled = false;
        if (!foreground) {
            ContextCompat.startForegroundService(this, new Intent(this, SimulationService.class).setAction(RUN));
            if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIFICATION, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            else startForeground(NOTIFICATION, notification());
            foreground = true;
        }
        if (!wakeLock.isHeld()) wakeLock.acquire(10 * 60 * 1000L);
    }
    private Notification notification() {
        PendingIntent content = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent pause = PendingIntent.getService(this, 1, new Intent(this, SimulationService.class).setAction(PAUSE), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL).setSmallIcon(R.drawable.ic_simulation_notification)
            .setContentTitle(getString(R.string.simulation_title))
            .setContentText(getString(active > 0 ? R.string.simulation_running : R.string.simulation_settling))
            .setContentIntent(content).setOngoing(true).setOnlyAlertOnce(true)
            .addAction(0, getString(R.string.simulation_pause), pause).build();
    }
    private void demote() {
        if (foreground) { stopForeground(STOP_FOREGROUND_REMOVE); foreground = false; }
        if (wakeLock.isHeld()) wakeLock.release();
        stopSelf();
    }
    private void whenReady(Runnable action) {
        if (ready) action.run(); else if (failure == null && !destroyed) readyQueue.add(action);
    }
    void invoke(String method, JSONArray args, Reply callback) {
        if (failure != null || destroyed) { callback.complete(error(failure == null ? "MOBILE_SERVICE_UNAVAILABLE" : failure)); return; }
        final int id = ++sequence; replies.put(id, callback);
        handler.postDelayed(() -> { Reply pending = replies.remove(id); if (pending != null) pending.complete(error("MOBILE_REQUEST_TIMEOUT")); }, 120000);
        whenReady(() -> {
            if (!replies.containsKey(id)) return;
            if (pauseRequested && ("create".equals(method) || "setEnabled".equals(method))) {
                replies.remove(id).complete(error("MOBILE_PAUSE_PENDING")); return;
            }
            evaluate("WarriorServiceHost.dispatch(" + id + "," + JSONObject.quote(method) + "," + args.toString() + ")");
        });
    }
    JSObject status() {
        JSObject result = new JSObject(); result.put("ready", ready); result.put("foreground", foreground);
        result.put("activeBattles", active); result.put("unsettledAgents", unsettled); result.put("lastHeartbeat", lastHeartbeat);
        result.put("error", failure == null ? JSONObject.NULL : failure);
        result.put("notificationsEnabled", androidx.core.app.NotificationManagerCompat.from(this).areNotificationsEnabled()); return result;
    }
    private static JSObject error(String code) { JSObject result = new JSObject(); result.put("ok", false); result.put("code", code); return result; }
    private void evaluate(String js) { if (engine != null && !destroyed && failure == null) engine.evaluateJavascript(js, null); }
    private void emit(String name, JSObject value) { for (Client client : new ArrayList<>(clients)) client.event(name, value); }
    private void fail(String code) {
        if (failure != null) return;
        failure = code; ready = false;
        for (Runnable timer : timers.values()) handler.removeCallbacks(timer);
        timers.clear(); readyQueue.clear();
        for (Reply callback : replies.values()) callback.complete(error(code));
        replies.clear(); emit("serviceError", error(code));
        if (engine != null) { engine.destroy(); engine = null; }
        StrategyWidgetProvider.invalidate(this); demote();
    }
    @Override public void onTimeout(int startId, int fgsType) { fail("MOBILE_SERVICE_TIMEOUT"); }
    @Override public void onDestroy() {
        destroyed = true; handler.removeCallbacksAndMessages(null); timers.clear(); readyQueue.clear();
        for (Reply callback : replies.values()) callback.complete(error("MOBILE_SERVICE_STOPPED"));
        replies.clear(); clients.clear(); network.shutdownNow();
        if (engine != null) { engine.destroy(); engine = null; }
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }
    private final class HostBridge {
        @JavascriptInterface public String widgetConfig() { return getSharedPreferences("simulation-widget", MODE_PRIVATE).getString("config", "null"); }
        @JavascriptInterface public void saveWidgetConfig(String raw) {
            if (raw.length() <= 1000000) getSharedPreferences("simulation-widget", MODE_PRIVATE).edit().putString("config", raw).apply();
        }
        @JavascriptInterface public void widget(String raw) {
            if (raw.length() > 1000000) return;
            try { StrategyWidgetProvider.save(SimulationService.this, new JSONObject(raw)); } catch (JSONException ignored) {}
        }
        @JavascriptInterface public void widgetUnavailable() { StrategyWidgetProvider.invalidate(SimulationService.this); }
        @JavascriptInterface public void heartbeat() { handler.post(() -> lastHeartbeat = System.currentTimeMillis()); }
        @JavascriptInterface public void ready() {
            handler.post(() -> {
                if (failure != null || destroyed) return;
                ready = true; List<Runnable> queue = new ArrayList<>(readyQueue); readyQueue.clear();
                for (Runnable action : queue) action.run();
            });
        }
        @JavascriptInterface public void failed(String code) { handler.post(() -> fail(code)); }
        @JavascriptInterface public void reply(int id, String raw) {
            handler.post(() -> {
                Reply callback = replies.remove(id);
                if (callback != null) { try { callback.complete(new JSObject(raw)); } catch (JSONException e) { callback.complete(error("MOBILE_REPLY_INVALID")); } }
            });
        }
        @JavascriptInterface public void event(String name, String raw) {
            if (!Arrays.asList("simulation", "network", "price").contains(name)) return;
            handler.post(() -> { try { emit(name, new JSObject(raw)); } catch (JSONException ignored) {} });
        }
        @JavascriptInterface public void demand(int count, int pending) {
            handler.post(() -> {
                if (destroyed || failure != null) return;
                boolean changed = active != count || unsettled != pending; active = count; unsettled = pending;
                if (active > 0 || unsettled > 0) {
                    try { promote(); if (changed) getSystemService(NotificationManager.class).notify(NOTIFICATION, notification()); }
                    catch (RuntimeException e) { fail("MOBILE_BACKGROUND_START_DENIED"); }
                } else if (!idleScheduled) { idleScheduled = true; handler.postDelayed(idle, 2000); }
            });
        }
        @JavascriptInterface public void schedule(int id, long delay, boolean repeat) {
            handler.post(() -> {
                if (destroyed || failure != null) return;
                if (timers.size() > 4096) { fail("MOBILE_TIMER_LIMIT"); return; }
                Runnable timer = new Runnable() {
                    @Override public void run() {
                        if (timers.get(id) != this || destroyed || failure != null) return;
                        if (!repeat) timers.remove(id);
                        if (foreground) wakeLock.acquire(10 * 60 * 1000L);
                        evaluate("WarriorServiceHost.fire(" + id + ")");
                        if (repeat) handler.postDelayed(this, Math.max(1, delay));
                    }
                };
                timers.put(id, timer); handler.postDelayed(timer, Math.max(0, delay));
            });
        }
        @JavascriptInterface public void cancel(int id) { handler.post(() -> { Runnable timer = timers.remove(id); if (timer != null) handler.removeCallbacks(timer); }); }
        @JavascriptInterface public void http(int id, String raw) {
            network.execute(() -> {
                JSONObject result = new JSONObject(); HttpURLConnection connection = null;
                try {
                    JSONObject options = new JSONObject(raw); URL url = new URL(options.getString("url"));
                    if (!"https".equals(url.getProtocol()) || url.getUserInfo() != null) throw new IOException("HTTPS_REQUIRED");
                    connection = (HttpURLConnection) url.openConnection(); connection.setInstanceFollowRedirects(false);
                    connection.setConnectTimeout(8000); connection.setReadTimeout(15000);
                    String method = options.optString("method", "GET");
                    if (!"GET".equals(method) && !"POST".equals(method)) throw new IOException("METHOD_NOT_ALLOWED");
                    connection.setRequestMethod(method); JSONObject headers = options.optJSONObject("headers");
                    if (headers != null) for (Iterator<String> keys = headers.keys(); keys.hasNext();) {
                        String key = keys.next(); connection.setRequestProperty(key, headers.getString(key));
                    }
                    if (options.has("data")) {
                        connection.setDoOutput(true); byte[] data = options.get("data").toString().getBytes(StandardCharsets.UTF_8);
                        try (OutputStream out = connection.getOutputStream()) { out.write(data); }
                    }
                    int status = connection.getResponseCode();
                    InputStream input = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                    if (input != null) try (InputStream in = input) {
                        byte[] buffer = new byte[8192]; int count;
                        while ((count = in.read(buffer)) != -1) {
                            if (bytes.size() + count > 16 * 1024 * 1024) throw new IOException("RESPONSE_TOO_LARGE");
                            bytes.write(buffer, 0, count);
                        }
                    }
                    String body = bytes.toString("UTF-8"); Object data;
                    try { data = body.isEmpty() ? JSONObject.NULL : new JSONTokener(body).nextValue(); } catch (JSONException invalid) { data = body; }
                    JSONObject value = new JSONObject(); value.put("status", status); value.put("data", data);
                    result.put("ok", true); result.put("value", value);
                } catch (Exception e) {
                    try { result.put("ok", false); result.put("code", "MOBILE_NETWORK_UNAVAILABLE"); } catch (JSONException ignored) {}
                } finally { if (connection != null) connection.disconnect(); }
                String encoded = result.toString(); handler.post(() -> evaluate("WarriorServiceHost.httpResult(" + id + "," + encoded + ")"));
            });
        }
    }
}
