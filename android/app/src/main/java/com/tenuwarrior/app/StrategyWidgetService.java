package com.tenuwarrior.app;

import android.content.Context;
import android.content.Intent;
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
    @Override public RemoteViewsFactory onGetViewFactory(Intent intent) { return new Factory(getApplicationContext()); }

    static class Factory implements RemoteViewsFactory {
        private final Context context;
        private JSONObject data = new JSONObject();
        private JSONArray rows = new JSONArray();
        private final Map<String, Bitmap> icons = new HashMap<>();
        Factory(Context context) { this.context = context; }
        @Override public void onCreate() { onDataSetChanged(); }
        @Override public void onDataSetChanged() { data = StrategyWidgetProvider.snapshot(context); rows = data.optJSONArray("rows"); if (rows == null) rows = new JSONArray(); }
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
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.strategy_widget_card);
            views.setTextViewText(R.id.widget_name, row.optString("name"));
            views.setTextViewText(R.id.widget_battle, row.optString("battleName"));
            views.setTextViewText(R.id.widget_coin, row.optString("coin") + " · " + (position + 1) + "/" + rows.length());
            views.setTextViewText(R.id.widget_funds, row.optString("funds"));
            views.setTextViewText(R.id.widget_profit, row.optString("profit"));
            views.setTextColor(R.id.widget_profit, Color.parseColor(row.optBoolean("positive") ? "#D9FF43" : "#FFB7CE"));
            views.setTextViewText(R.id.widget_action, row.optString("action"));
            String prefix = StrategyWidgetProvider.text(context, data, "snapshot", R.string.widget_snapshot);
            views.setTextViewText(R.id.widget_status, prefix + " · " + row.optString("status"));
            Bitmap bitmap = icon(row.optString("icon"));
            if (bitmap == null) views.setImageViewResource(R.id.widget_avatar, R.drawable.launcher_art);
            else views.setImageViewBitmap(R.id.widget_avatar, bitmap);
            Intent fill = new Intent().putExtra("widgetBattleId", row.optString("battleId")).putExtra("widgetAgentId", row.optString("agentId"));
            views.setOnClickFillInIntent(R.id.widget_card, fill);
            return views;
        }
    }
}
