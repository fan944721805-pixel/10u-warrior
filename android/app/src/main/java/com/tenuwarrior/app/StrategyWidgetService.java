package com.tenuwarrior.app;

import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.appwidget.AppWidgetManager;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

public class StrategyWidgetService extends RemoteViewsService {
    @Override public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext(), intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1));
    }

    static class Factory implements RemoteViewsFactory {
        private final Context context;
        private final int widgetId;
        private float width = 250, height = 220;
        private JSONObject data = new JSONObject();
        private JSONArray rows = new JSONArray();
        private final Map<String, Bitmap> icons = new HashMap<>();
        Factory(Context context, int widgetId) { this.context = context; this.widgetId = widgetId; }
        void size(float width, float height) { this.width = width; this.height = height; }
        @Override public void onCreate() { onDataSetChanged(); }
        @Override public void onDataSetChanged() {
            data = StrategyWidgetProvider.snapshot(context); rows = data.optJSONArray("rows"); if (rows == null) rows = new JSONArray();
            if (Build.VERSION.SDK_INT < 31 && widgetId >= 0) {
                Bundle options = AppWidgetManager.getInstance(context).getAppWidgetOptions(widgetId);
                boolean landscape = context.getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;
                size(options.getInt(landscape ? AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH : AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250),
                        options.getInt(landscape ? AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT : AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 220));
            }
        }
        @Override public void onDestroy() { icons.clear(); }
        @Override public int getCount() { return rows.length(); }
        @Override public int getViewTypeCount() { return 1; }
        @Override public boolean hasStableIds() { return true; }
        @Override public long getItemId(int position) {
            JSONObject row = rows.optJSONObject(position);
            String key = row == null ? "" : row.optString("key");
            long hash = 0xcbf29ce484222325L;
            for (int i = 0; i < key.length(); i++) hash = (hash ^ key.charAt(i)) * 0x100000001b3L;
            return hash;
        }
        @Override public RemoteViews getLoadingView() { return null; }
        private Bitmap icon(String path) {
            // Only bundled artwork, never a URL, arbitrary filesystem path or secret.
            if (!path.matches("(?:strategy-icons/)?[a-zA-Z0-9_-]+\\.png")) return null;
            if (icons.containsKey(path)) return icons.get(path);
            try (InputStream stream = context.getAssets().open("public/" + path)) {
                BitmapFactory.Options options = new BitmapFactory.Options(); options.inSampleSize = 8;
                Bitmap source = BitmapFactory.decodeStream(stream, null, options);
                if (source == null) return null;
                Bitmap small = Bitmap.createScaledBitmap(source, 96, 96, true);
                icons.put(path, small); return small;
            } catch (Exception ignored) { return null; }
        }
        @Override public RemoteViews getViewAt(int position) {
            JSONObject row = rows.optJSONObject(position);
            if (row == null) return null;
            boolean wide = width >= 320 && width / Math.max(1, height) >= 1.5f;
            RemoteViews views = new RemoteViews(context.getPackageName(), wide ? R.layout.strategy_widget_card_wide : R.layout.strategy_widget_card);
            if (Build.VERSION.SDK_INT >= 31) views.setViewLayoutHeight(R.id.widget_card, height, TypedValue.COMPLEX_UNIT_DIP);
            else views.setInt(R.id.widget_card, "setMinimumHeight", Math.round(height * context.getResources().getDisplayMetrics().density));
            views.setTextViewText(R.id.widget_name, row.optString("name"));
            views.setTextViewText(R.id.widget_coin, row.optString("coin") + " · " + (position + 1) + "/" + rows.length());
            views.setTextViewText(R.id.widget_funds, row.optString("fundsValue", row.optString("funds")));
            views.setTextViewText(R.id.widget_profit, row.optString("profitValue", row.optString("profit")));
            views.setTextViewText(R.id.widget_funds_label, row.optString("fundsLabel"));
            views.setTextViewText(R.id.widget_profit_label, row.optString("profitLabel"));
            views.setTextViewText(R.id.widget_round_label, row.optString("roundLabel"));
            views.setViewVisibility(R.id.widget_funds_label, row.has("fundsLabel") ? View.VISIBLE : View.GONE);
            views.setViewVisibility(R.id.widget_profit_label, row.has("profitLabel") ? View.VISIBLE : View.GONE);
            views.setTextColor(R.id.widget_profit, Color.parseColor(row.optBoolean("positive") ? "#238B72" : "#B85B69"));
            views.setTextViewText(R.id.widget_action, row.optString("action"));
            views.setTextViewText(R.id.widget_status, StrategyWidgetProvider.fresh(context) ? row.optString("status") :
                    StrategyWidgetProvider.text(context, data, "stale", R.string.widget_stale));
            Bitmap bitmap = icon(row.optString("icon"));
            if (bitmap == null) views.setImageViewResource(R.id.widget_avatar, R.drawable.launcher_art);
            else views.setImageViewBitmap(R.id.widget_avatar, bitmap);
            Intent fill = new Intent().putExtra("widgetBattleId", row.optString("battleId")).putExtra("widgetAgentId", row.optString("agentId"));
            views.setOnClickFillInIntent(R.id.widget_card, fill);
            return views;
        }
    }
}
