package com.tenuwarrior.app;

import static org.junit.Assert.*;
import android.content.Context;
import android.content.res.Configuration;
import android.view.View;
import android.graphics.Rect;
import android.widget.ListView;
import android.widget.BaseAdapter;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.RemoteViews;
import android.widget.TextView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Verify actual viewport limits, including the native ListView frame geometry. */
@RunWith(AndroidJUnit4.class)
public class StrategyWidgetLayoutTest {
    private final java.util.List<ViewGroup> containers = new java.util.ArrayList<>();
    @Test public void financialValuesRemainReadableAtMinimumWidth() {
        try (ActivityScenario<WidgetLayoutTestActivity> scenario = ActivityScenario.launch(WidgetLayoutTestActivity.class)) {
        scenario.onActivity(activity -> checkLayouts(activity.findViewById(android.R.id.content)));
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            for (ViewGroup container : containers) {
                ListView list = container.findViewById(R.id.widget_stack);
                assertEquals(4, list.getAdapter().getCount());
                assertTrue(list.getChildCount() > 0);
            }
        });
        }
    }
    private void checkLayouts(ViewGroup host) {
        Context base = InstrumentationRegistry.getInstrumentation().getTargetContext();
        for (float scale : new float[]{1f, 1.3f}) for (int[] size : new int[][]{{180,180},{220,380},{300,300},{400,180},{560,220},{300,560}}) {
            int width = size[0], height = size[1];
            Configuration config = new Configuration(base.getResources().getConfiguration()); config.fontScale = scale;
            Context context = base.createConfigurationContext(config);
            for (String[] fields : new String[][]{
                {"1000000.00 U", "+100000.00 U", "模拟资金", "已结算收益"},
                {"1000000.00 U", "+100000.00 U", "Paper funds", "Settled profit"}
            }) {
                RemoteViews remote = StrategyWidgetService.Factory.cardViews(context, width, height, true);
                remote.setTextViewText(R.id.widget_name, "Strategy Alpha"); remote.setTextViewText(R.id.widget_coin, "BTC · 1/8");
                remote.setTextViewText(R.id.widget_action, "Wait"); remote.setTextViewText(R.id.widget_status, "Paused");
                remote.setTextViewText(R.id.widget_funds_label, fields[2]); remote.setTextViewText(R.id.widget_profit_label, fields[3]);
                remote.setTextViewText(R.id.widget_round_label, "Current bet");
                remote.setTextViewText(R.id.widget_funds, fields[0]); remote.setTextViewText(R.id.widget_profit, fields[1]);
                remote.setTextViewText(R.id.widget_cash_label,"Available"); remote.setTextViewText(R.id.widget_cash,"900000.00 U");
                remote.setTextViewText(R.id.widget_reserved_label,"Reserved"); remote.setTextViewText(R.id.widget_reserved,"100000.00 U");
                remote.setTextViewText(R.id.widget_bet,"50000.00 U");
                remote.setTextViewText(R.id.widget_reference_label,"Entry reference"); remote.setTextViewText(R.id.widget_reference,"100000.00 USDT");
                remote.setTextViewText(R.id.widget_previous_label,"Previous pending"); remote.setTextViewText(R.id.widget_previous,"50000.00 U");
                remote.setTextViewText(R.id.widget_win_label,"Win rate"); remote.setTextViewText(R.id.widget_win,"75.00% · 3/4");
                remote.setTextViewText(R.id.widget_detail,"Details ↗");
                View view = remote.apply(context, new FrameLayout(context));
                int pixels = Math.round(width * context.getResources().getDisplayMetrics().density);
                int heightPixels = Math.round(height * context.getResources().getDisplayMetrics().density);
                view.measure(View.MeasureSpec.makeMeasureSpec(pixels, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED));
                view.layout(0, 0, pixels, view.getMeasuredHeight());
                assertEquals(pixels, view.getMeasuredWidth());
                assertTrue(view.getMeasuredHeight() > 0);
                for (int id : new int[]{R.id.widget_funds, R.id.widget_profit, R.id.widget_cash, R.id.widget_reserved, R.id.widget_bet, R.id.widget_reference, R.id.widget_previous, R.id.widget_win}) {
                    TextView text = view.findViewById(id);
                    assertNotNull(text.getLayout());
                    int last = text.getLayout().getLineCount() - 1;
                    assertEquals("Full financial value at width " + width + " scale " + scale, text.length(), text.getLayout().getLineEnd(last));
                    assertEquals(0, text.getLayout().getEllipsisCount(last));
                    assertTrue(text.getHeight() > 0);
                    assertTrue("Glyphs fit vertically: " + width + "x" + height + "@" + scale + " " + context.getResources().getResourceEntryName(id), text.getLayout().getHeight() <= text.getHeight());
                }
                for (int id : new int[]{R.id.widget_name, R.id.widget_coin, R.id.widget_funds, R.id.widget_profit, R.id.widget_action, R.id.widget_status, R.id.widget_cash, R.id.widget_reserved, R.id.widget_reference, R.id.widget_previous, R.id.widget_win, R.id.widget_detail}) {
                    View child = view.findViewById(id); Rect rect = new Rect(); child.getDrawingRect(rect);
                    ((android.view.ViewGroup)view).offsetDescendantRectToMyCoords(child, rect);
                    assertTrue("Content stays inside row at " + width, rect.top >= 0 && rect.bottom <= view.getMeasuredHeight() && rect.right <= pixels);
                }
                View container = StrategyWidgetProvider.pageViews(context, -1, width, height).apply(context,new FrameLayout(context));
                ListView list=container.findViewById(R.id.widget_stack);
                list.setAdapter(new BaseAdapter() {
                    public int getCount() { return 4; }
                    public Object getItem(int position) { return position; }
                    public long getItemId(int position) { return position; }
                    public View getView(int position, View convert, ViewGroup parent) { return remote.apply(context, parent); }
                });
                for (int pass = 0; pass < 3; pass++) {
                container.measure(View.MeasureSpec.makeMeasureSpec(pixels,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(heightPixels,View.MeasureSpec.EXACTLY));
                container.layout(0,0,pixels,heightPixels);
                }
                assertEquals(0,list.getLeft()); assertEquals(0,list.getTop());
                assertEquals(pixels,list.getWidth()); assertEquals(heightPixels,list.getHeight());
                containers.add((ViewGroup)container);
                host.addView(container, new FrameLayout.LayoutParams(pixels, heightPixels));
            }
        }
    }
}
