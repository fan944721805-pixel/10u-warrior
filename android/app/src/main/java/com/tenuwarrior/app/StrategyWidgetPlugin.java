package com.tenuwarrior.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StrategyWidget")
public class StrategyWidgetPlugin extends Plugin {
    private JSObject pending;

    @Override public void load() {
        capture(getActivity().getIntent());
        // A new WebView session has not proved that it can read the ledger yet.
        StrategyWidgetProvider.invalidate(getContext());
    }
    private synchronized void capture(Intent intent) {
        if (intent == null || !intent.hasExtra("widgetBattleId")) return;
        pending = new JSObject();
        pending.put("battleId", intent.getStringExtra("widgetBattleId"));
        pending.put("agentId", intent.getStringExtra("widgetAgentId"));
        intent.removeExtra("widgetBattleId"); intent.removeExtra("widgetAgentId");
    }
    @Override protected void handleOnNewIntent(Intent intent) {
        capture(intent);
        notifyListeners("openStrategy", new JSObject(), true);
    }
    @PluginMethod public synchronized void consumeOpen(PluginCall call) {
        JSObject target = pending; pending = null;
        call.resolve(target == null ? new JSObject() : target);
    }
    @PluginMethod public void update(PluginCall call) {
        JSObject snapshot = call.getObject("snapshot");
        if (snapshot == null || snapshot.optJSONArray("rows") == null || snapshot.toString().length() > 1000000) {
            call.reject("Invalid widget snapshot"); return;
        }
        try { StrategyWidgetProvider.save(getContext(), snapshot); call.resolve(); }
        catch (Exception error) { call.reject("Widget snapshot unavailable"); }
    }
    @PluginMethod public void unavailable(PluginCall call) {
        StrategyWidgetProvider.invalidate(getContext()); call.resolve();
    }
    @PluginMethod public void pin(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
            boolean supported = Build.VERSION.SDK_INT >= 26 && manager.isRequestPinAppWidgetSupported();
            if (supported) supported = manager.requestPinAppWidget(new ComponentName(getContext(), StrategyWidgetProvider.class), null, null);
            JSObject result = new JSObject(); result.put("supported", supported); call.resolve(result);
        });
    }
}
