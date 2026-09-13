package com.tenuwarrior.app;

import static org.junit.Assert.*;
import android.content.Context;
import android.content.res.Configuration;
import android.view.View;
import android.graphics.Rect;
import android.util.TypedValue;
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
        for (float scale : new float[]{1f, 1.3f}) for (int[] size : new int[][]{{180,180},{220,380},{300,300},{400,180},{560,220}}) {
            int width = size[0], height = size[1];
            Configuration config = new Configuration(base.getResources().getConfiguration()); config.fontScale = scale;
            Context context = base.createConfigurationContext(config);
            for (String[] fields : new String[][]{
                {"1000000.00 U", "+100000.00 U", "模拟资金", "已结算收益"},
                {"1000000.00 U", "+100000.00 U", "Paper funds", "Settled profit"}
            }) {
                RemoteViews remote = new RemoteViews(context.getPackageName(), width >= 320 && (float)width / height >= 1.5f ? R.layout.strategy_widget_card_wide : R.layout.strategy_widget_card);
                remote.setViewLayoutHeight(R.id.widget_card, height, TypedValue.COMPLEX_UNIT_DIP);
                remote.setTextViewText(R.id.widget_name, "Strategy Alpha"); remote.setTextViewText(R.id.widget_coin, "BTC · 1/8");
                remote.setTextViewText(R.id.widget_action, "Wait"); remote.setTextViewText(R.id.widget_status, "Paused");
                remote.setTextViewText(R.id.widget_funds_label, fields[2]); remote.setTextViewText(R.id.widget_profit_label, fields[3]);
                remote.setTextViewText(R.id.widget_round_label, "Current bet");
                remote.setTextViewText(R.id.widget_funds, fields[0]); remote.setTextViewText(R.id.widget_profit, fields[1]);
                View view = remote.apply(context, new FrameLayout(context));
                int pixels = Math.round(width * context.getResources().getDisplayMetrics().density);
                int heightPixels = Math.round(height * context.getResources().getDisplayMetrics().density);
                view.measure(View.MeasureSpec.makeMeasureSpec(pixels, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(heightPixels, View.MeasureSpec.EXACTLY));
                view.layout(0, 0, pixels, view.getMeasuredHeight());
                assertEquals(heightPixels, view.getMeasuredHeight());
                for (int id : new int[]{R.id.widget_funds, R.id.widget_profit}) {
                    TextView text = view.findViewById(id);
                    assertNotNull(text.getLayout());
                    int last = text.getLayout().getLineCount() - 1;
                    assertEquals("Full financial value at width " + width + " scale " + scale, text.length(), text.getLayout().getLineEnd(last));
                    assertEquals(0, text.getLayout().getEllipsisCount(last));
                    assertTrue(text.getHeight() > 0);
                }
                for (int id : new int[]{R.id.widget_name, R.id.widget_coin, R.id.widget_funds, R.id.widget_profit, R.id.widget_action, R.id.widget_status, R.id.widget_funds_label, R.id.widget_profit_label, R.id.widget_round_label}) {
                    View child = view.findViewById(id); Rect rect = new Rect(); child.getDrawingRect(rect);
                    ((android.view.ViewGroup)view).offsetDescendantRectToMyCoords(child, rect);
                    assertTrue("Content stays inside " + width + "x" + height, rect.top >= 0 && rect.bottom <= heightPixels && rect.right <= pixels);
                }
            }
        }
    }
}
