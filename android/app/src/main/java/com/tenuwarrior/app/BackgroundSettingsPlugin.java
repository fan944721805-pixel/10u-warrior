package com.tenuwarrior.app;

import android.app.ActivityManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.PowerManager;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Opens user-controlled settings; does not claim or grant background execution. */
@CapacitorPlugin(name = "BackgroundSettings")
public class BackgroundSettingsPlugin extends Plugin {
    @Override
    protected void handleOnResume() {
        // Android WebView does not reliably report Activity resume as pageshow
        // or visibilitychange. Re-read settings after returning from Settings.
        bridge.triggerWindowJSEvent("warrior-android-resume");
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        PowerManager power = getContext().getSystemService(PowerManager.class);
        if (power == null) {
            call.reject("Battery settings unavailable", "BACKGROUND_SETTINGS_UNAVAILABLE");
            return;
        }
        JSObject status = new JSObject();
        status.put("ignoringBatteryOptimizations", power.isIgnoringBatteryOptimizations(getContext().getPackageName()));
        ActivityManager activity = getContext().getSystemService(ActivityManager.class);
        status.put("backgroundRestricted", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && activity != null && activity.isBackgroundRestricted());
        call.resolve(status);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Intent details = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getContext().getPackageName()));
            Intent intent = "app".equals(call.getString("page"))
                ? details : new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            try {
                getActivity().startActivity(intent);
                call.resolve();
            } catch (ActivityNotFoundException | SecurityException unavailable) {
                try {
                    getActivity().startActivity(details);
                    call.resolve();
                } catch (ActivityNotFoundException | SecurityException fallbackUnavailable) {
                    call.reject("Battery settings unavailable", "BACKGROUND_SETTINGS_UNAVAILABLE");
                }
            }
        });
    }
}
