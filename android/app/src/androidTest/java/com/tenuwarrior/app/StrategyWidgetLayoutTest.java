package com.tenuwarrior.app;

import static org.junit.Assert.*;
import android.content.Context;
import android.content.res.Configuration;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.RemoteViews;
import android.widget.TextView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Render the actual RemoteViews layouts at minimum widget width and large text. */
@RunWith(AndroidJUnit4.class)
public class StrategyWidgetLayoutTest {
    @Test public void financialValuesRemainReadableAtMinimumWidth() {
        Context base = InstrumentationRegistry.getInstrumentation().getTargetContext();
        for (float scale : new float[]{1f, 1.3f}) for (int width : new int[]{196, 256, 436}) {
            Configuration config = new Configuration(base.getResources().getConfiguration()); config.fontScale = scale;
            Context context = base.createConfigurationContext(config);
            for (String[] fields : new String[][]{
                {"模拟资金  1000000.00 U", "已结算收益  +100000.00 U"},
                {"Simulated funds  1000000.00 U", "Settled gains / losses  +100000.00 U"}
            }) {
                RemoteViews remote = new RemoteViews(context.getPackageName(), R.layout.strategy_widget_card);
                remote.setTextViewText(R.id.widget_funds, fields[0]); remote.setTextViewText(R.id.widget_profit, fields[1]);
                View view = remote.apply(context, new FrameLayout(context));
                int pixels = Math.round(width * context.getResources().getDisplayMetrics().density);
                view.measure(View.MeasureSpec.makeMeasureSpec(pixels, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED));
                view.layout(0, 0, pixels, view.getMeasuredHeight());
                for (int id : new int[]{R.id.widget_funds, R.id.widget_profit}) {
                    TextView text = view.findViewById(id);
                    assertNotNull(text.getLayout());
                    int last = text.getLayout().getLineCount() - 1;
                    assertEquals("Full financial value at width " + width + " scale " + scale, text.length(), text.getLayout().getLineEnd(last));
                    assertEquals(0, text.getLayout().getEllipsisCount(last));
                    assertTrue(text.getBottom() <= view.getMeasuredHeight());
                }
            }
        }
    }
}
