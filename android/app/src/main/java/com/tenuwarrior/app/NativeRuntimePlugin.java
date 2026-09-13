package com.tenuwarrior.app;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.system.Os;
import android.webkit.JavascriptInterface;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import android.content.*;
import android.os.*;
import java.util.ArrayList;
import java.util.List;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileInputStream;
import java.io.ByteArrayOutputStream;
import java.security.KeyStore;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

@CapacitorPlugin(name = "NativeRuntime", permissions = {
    @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" })
})
public class NativeRuntimePlugin extends Plugin {
    private SimulationService service;
    private boolean bound, visible = true;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final List<Runnable> waiting = new ArrayList<>();
    private final SimulationService.Client listener = (name, value) -> { if (visible) notifyListeners(name, value); };
    private final ServiceConnection connection = new ServiceConnection() {
        @Override public void onServiceConnected(ComponentName name, IBinder binder) {
            service = ((SimulationService.LocalBinder) binder).service(); service.attach(listener);
            List<Runnable> queue = new ArrayList<>(waiting); waiting.clear();
            for (Runnable action : queue) action.run();
        }
        @Override public void onServiceDisconnected(ComponentName name) { service = null; }
    };
    @Override public void load() {
        // The UI gets RPC only. Encrypted storage is exposed exclusively to the
        // service-owned runtime, eliminating concurrent writers on UI reload.
        main.post(() -> bound = getContext().bindService(new Intent(getContext(), SimulationService.class), connection, Context.BIND_AUTO_CREATE));
    }
    private void connected(PluginCall call, Runnable action) {
        main.post(() -> {
            if (service != null) { action.run(); return; }
            waiting.add(action);
            main.postDelayed(() -> { if (waiting.remove(action)) call.reject("Simulation service unavailable", "MOBILE_SERVICE_UNAVAILABLE"); }, 20000);
        });
    }
    @PluginMethod public void invoke(PluginCall call) {
        String method = call.getString("method", "");
        JSArray args = call.getArray("args", new JSArray());
        connected(call, () -> {
            try {
                // Promote before enabling the first battle, while the user action
                // still originates in a visible Activity.
                if ("create".equals(method) || ("setEnabled".equals(method) && args.optBoolean(1))) service.promote();
                service.invoke(method, args, call::resolve);
            } catch (RuntimeException error) { call.reject("Background execution unavailable", "MOBILE_BACKGROUND_START_DENIED"); }
        });
    }
    @PluginMethod public void status(PluginCall call) { connected(call, () -> call.resolve(service.status())); }
    @PluginMethod public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) { notificationsResult(call); return; }
        requestPermissionForAlias("notifications", call, "notificationsResult");
    }
    @PermissionCallback private void notificationsResult(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED); call.resolve(result);
    }
    @Override protected void handleOnPause() { visible = false; }
    @Override protected void handleOnResume() {
        visible = true;
        JSObject event = new JSObject(); event.put("battleId", "*"); notifyListeners("simulation", event);
    }
    @Override protected void handleOnDestroy() {
        main.post(() -> {
            if (service != null) service.detach(listener);
            if (bound) getContext().unbindService(connection);
            service = null; bound = false; waiting.clear();
        });
    }

    public static final class Storage {
        private final File root;
        private static final String ALIAS = "tenuwarrior-mobile-v1";
        Storage(File directory) { root = directory; }

        private File resolve(String virtual) throws Exception {
            if (!virtual.startsWith("/mobile/") || virtual.contains("..") || virtual.contains("\\")) throw new Exception("INVALID_PATH");
            File file = new File(root, virtual.substring(8)).getCanonicalFile();
            if (!file.getPath().startsWith(root.getCanonicalPath() + File.separator)) throw new Exception("INVALID_PATH");
            return file;
        }
        private SecretKey key() throws Exception {
            KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
            if (!store.containsAlias(ALIAS)) {
                // Never replace the key of an existing vault with a new key.
                File[] saved = root.listFiles();
                if (saved != null && saved.length > 0) throw new Exception("MOBILE_VAULT_UNAVAILABLE");
                KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
                generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
                generator.generateKey();
            }
            return (SecretKey) store.getKey(ALIAS, null);
        }
        private byte[] read(File file) throws Exception {
            ByteArrayOutputStream saved = new ByteArrayOutputStream();
            try (FileInputStream input = new FileInputStream(file)) {
                byte[] buffer = new byte[8192]; int count;
                while ((count = input.read(buffer)) != -1) saved.write(buffer, 0, count);
            }
            byte[] bytes = saved.toByteArray();
            if (bytes.length < 29 || bytes[0] != 1) throw new Exception("MOBILE_VAULT_UNAVAILABLE");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Arrays.copyOfRange(bytes, 1, 13)));
            return cipher.doFinal(Arrays.copyOfRange(bytes, 13, bytes.length));
        }
        private void write(File file, byte[] data) throws Exception {
            // Resolve/create the key before creating any directories in a new vault.
            SecretKey secretKey = key();
            File parent = file.getParentFile();
            if (!parent.isDirectory() && !parent.mkdirs()) throw new Exception("MOBILE_STORAGE_FAILED");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            File temp = File.createTempFile("pending-", ".tmp", parent);
            try {
                try (FileOutputStream output = new FileOutputStream(temp)) {
                    output.write(1); output.write(cipher.getIV()); output.write(cipher.doFinal(data)); output.getFD().sync();
                }
                Os.rename(temp.getAbsolutePath(), file.getAbsolutePath());
            } finally { if (temp.exists()) temp.delete(); }
        }
        @JavascriptInterface public synchronized String call(String raw) {
            JSONObject result = new JSONObject();
            try {
                JSONObject input = new JSONObject(raw);
                File file = resolve(input.getString("path"));
                String op = input.getString("op"); Object value = JSONObject.NULL;
                switch (op) {
                    case "exists": value = file.isFile(); break;
                    case "read": value = new String(read(file), java.nio.charset.StandardCharsets.UTF_8); break;
                    case "write":
                        if (input.optBoolean("exclusive") && file.exists()) throw new Exception("EEXIST");
                        write(file, input.getString("data").getBytes(java.nio.charset.StandardCharsets.UTF_8)); break;
                    case "mkdir":
                        key(); if (!file.isDirectory() && !file.mkdirs()) throw new Exception("MOBILE_STORAGE_FAILED"); break;
                    case "rename": {
                        File destination = resolve(input.getString("destination"));
                        File parent = destination.getParentFile();
                        if (!parent.isDirectory() && !parent.mkdirs()) throw new Exception("MOBILE_STORAGE_FAILED");
                        Os.rename(file.getAbsolutePath(), destination.getAbsolutePath()); break;
                    }
                    case "copy": write(resolve(input.getString("destination")), read(file)); break;
                    case "delete": if (file.exists() && !file.delete()) throw new Exception("MOBILE_STORAGE_FAILED"); break;
                    default: throw new Exception("INVALID_OPERATION");
                }
                result.put("ok", true); result.put("value", value);
            } catch (Exception error) {
                try { result.put("ok", false); result.put("code", "EEXIST".equals(error.getMessage()) ? "EEXIST" : "MOBILE_STORAGE_FAILED"); }
                catch (Exception ignored) { }
            }
            return result.toString();
        }
    }
}
