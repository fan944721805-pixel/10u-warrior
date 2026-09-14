package com.tenuwarrior.app;

/** Debug-only host: measures widgets without starting the app or its runtime. */
public class WidgetLayoutTestActivity extends android.app.Activity {
    @Override public void onCreate(android.os.Bundle state) {
        super.onCreate(state);
        setContentView(new android.widget.FrameLayout(this));
    }
}
