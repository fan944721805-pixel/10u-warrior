package com.tenuwarrior.app;

import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.TypedValue;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

public class StrategyWidgetService extends RemoteViewsService {
    @Override public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext(), intent.getFloatExtra("pageWidth", 280), intent.getFloatExtra("pageHeight", 340));
    }

    static class Factory implements RemoteViewsFactory {
        private final Context context;
        private final float width, height;
        private JSONObject data = new JSONObject();
        private JSONArray rows = new JSONArray();
        private final Map<String, Bitmap> icons = new HashMap<>();
        Factory(Context context) { this(context, 280, 340); }
        Factory(Context context, float width, float height) { this.context = context; this.width = width; this.height = height; }
        @Override public void onCreate() { onDataSetChanged(); }
        @Override public void onDataSetChanged() {
            data = StrategyWidgetProvider.snapshot(context); rows = data.optJSONArray("rows"); if (rows == null) rows = new JSONArray();
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
            // Standalone native rows measure their own content inside a ListView.
            RemoteViews views = cardViews(context, width, height,
                    !row.optString("referenceValue").isEmpty() || !row.optString("previousValue").isEmpty());
            bindRow(views, row, position);
            return views;
        }
        static RemoteViews cardViews(Context context, float width, float height, boolean extraFields) {
            return new RemoteViews(context.getPackageName(), R.layout.strategy_widget_live_card);
        }
        private void bindRow(RemoteViews views, JSONObject row, int position) {
            views.setTextViewText(R.id.widget_name, row.optString("name"));
            views.setTextViewText(R.id.widget_battle_name, row.optString("battleName"));
            views.setTextViewText(R.id.widget_preparation, row.optString("preparation"));
            views.setViewVisibility(R.id.widget_preparation, row.optString("preparation").isEmpty() ? View.GONE : View.VISIBLE);
            views.setTextViewText(R.id.widget_updated, row.optString("updatedLabel") + " " +
                    android.text.format.DateFormat.getTimeFormat(context).format(new java.util.Date(StrategyWidgetProvider.prefs(context).getLong("updatedAt", 0))));
            views.setTextViewText(R.id.widget_coin, row.optString("coin") + " · " + (position + 1) + "/" + rows.length());
            views.setTextViewText(R.id.widget_funds, row.optString("fundsValue", row.optString("funds")));
            views.setTextViewText(R.id.widget_profit, row.optString("profitValue", row.optString("profit")));
            views.setTextViewText(R.id.widget_funds_label, row.optString("fundsLabel"));
            views.setTextViewText(R.id.widget_profit_label, row.optString("profitLabel"));
            views.setTextViewText(R.id.widget_round_label, row.optString("roundLabel"));
            views.setTextViewText(R.id.widget_cash_label, row.optString("cashLabel"));
            views.setTextViewText(R.id.widget_cash, row.optString("cashValue"));
            views.setTextViewText(R.id.widget_reserved_label, row.optString("reservedLabel"));
            views.setTextViewText(R.id.widget_reserved, row.optString("reservedValue"));
            views.setTextViewText(R.id.widget_bet, row.optString("betValue"));
            views.setTextViewText(R.id.widget_reference_label, row.optString("referenceLabel"));
            views.setTextViewText(R.id.widget_reference, row.optString("referenceValue"));
            views.setViewVisibility(R.id.widget_reference_row, row.optString("referenceValue").isEmpty() ? View.GONE : View.VISIBLE);
            views.setTextViewText(R.id.widget_previous_label, row.optString("previousLabel"));
            views.setTextViewText(R.id.widget_previous, row.optString("previousValue"));
            views.setViewVisibility(R.id.widget_previous_row, row.optString("previousValue").isEmpty() ? View.GONE : View.VISIBLE);
            views.setTextViewText(R.id.widget_win_label, row.optString("winLabel"));
            views.setTextViewText(R.id.widget_win, row.optString("winValue") + " · " + row.optString("winRecord"));
            views.setTextViewText(R.id.widget_detail, row.optString("detailLabel") + " ↗");
            views.setViewVisibility(R.id.widget_funds_label, row.has("fundsLabel") ? View.VISIBLE : View.GONE);
            views.setViewVisibility(R.id.widget_profit_label, row.has("profitLabel") ? View.VISIBLE : View.GONE);
            views.setTextColor(R.id.widget_profit, context.getColor(row.optBoolean("positive") ? R.color.widget_positive : R.color.widget_negative));
            views.setTextViewText(R.id.widget_action, row.optString("action"));
            views.setTextViewText(R.id.widget_status, StrategyWidgetProvider.fresh(context) ? row.optString("status") :
                    StrategyWidgetProvider.text(context, data, "stale", R.string.widget_stale));
            Bitmap bitmap = icon(row.optString("icon"));
            if (bitmap == null) views.setImageViewResource(R.id.widget_avatar, R.drawable.launcher_art);
            else views.setImageViewBitmap(R.id.widget_avatar, bitmap);
            Intent fill = new Intent().putExtra("widgetBattleId", row.optString("battleId")).putExtra("widgetAgentId", row.optString("agentId"));
            views.setOnClickFillInIntent(R.id.widget_card, fill);
        }
    }
}
