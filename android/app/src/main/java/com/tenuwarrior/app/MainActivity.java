package com.tenuwarrior.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundSettingsPlugin.class);
        registerPlugin(NativeRuntimePlugin.class);
        registerPlugin(StrategyWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
