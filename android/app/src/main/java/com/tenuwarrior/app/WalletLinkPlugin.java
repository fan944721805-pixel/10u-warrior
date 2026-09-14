package com.tenuwarrior.app;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WalletLink")
public class WalletLinkPlugin extends Plugin {
    @PluginMethod public void open(PluginCall call) {
        String value = call.getString("url", "");
        Uri uri = Uri.parse(value);
        String host = uri.getHost();
        if (!"https".equals(uri.getScheme()) || host == null ||
                !(host.equals("binance.com") || host.endsWith(".binance.com")) || uri.getUserInfo() != null) {
            call.reject("Untrusted wallet authorization URL", "WALLET_URL_INVALID"); return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                // Use Binance's returned URL verbatim. Android App Links or the
                // official browser landing page owns the Binance App handoff.
                getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(value)).addCategory(Intent.CATEGORY_BROWSABLE));
                call.resolve();
            } catch (RuntimeException unavailable) {
                call.reject("No app can open this authorization link", "WALLET_OPEN_FAILED");
            }
        });
    }
}
