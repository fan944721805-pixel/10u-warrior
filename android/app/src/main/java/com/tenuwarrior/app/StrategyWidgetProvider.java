package com.tenuwarrior.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;

public class StrategyWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "strategy-widget-v1";
    static final String EXPIRE = "com.tenuwarrior.app.WIDGET_EXPIRE";
    static final long FRESH_MS = 90000;
    static SharedPreferences prefs(Context context) { return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    static JSONObject snapshot(Context context) {
        try { return new JSONObject(prefs(context).getString("snapshot", "{}")); }
        catch (Exception ignored) { return new JSONObject(); }
    }
    static boolean fresh(Context context) {
        SharedPreferences p = prefs(context);
        long age = System.currentTimeMillis() - p.getLong("updatedAt", 0);
        return !p.getBoolean("unavailable", true) && age >= 0 && age < FRESH_MS;
    }
    static String text(Context context, JSONObject data, String key, int fallback) {
        JSONObject labels = data.optJSONObject("labels");
        return labels == null ? context.getString(fallback) : labels.optString(key, context.getString(fallback));
    }
    static void save(Context context, JSONObject data) {
        // Only the display projection is saved here, never keys, orders or the ledger.
        if (!prefs(context).edit().putString("snapshot", data.toString())
                .putLong("updatedAt", System.currentTimeMillis()).putBoolean("unavailable", false).commit())
            throw new IllegalStateException("WIDGET_STORAGE_FAILED");
        updateAll(context);
    }
    private static void scheduleExpiry(Context context) {
        if (AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, StrategyWidgetProvider.class)).length > 0) {
            AlarmManager alarm = context.getSystemService(AlarmManager.class);
            Intent intent = new Intent(context, StrategyWidgetProvider.class).setAction(EXPIRE);
            PendingIntent expiry = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            // Non-exact and non-waking. The visible age clock also keeps old data
            // identifiable if Android delays this stale-state refresh in Doze.
            long age = Math.max(0, System.currentTimeMillis() - prefs(context).getLong("updatedAt", 0));
            if (alarm != null && fresh(context)) alarm.set(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + Math.max(1, FRESH_MS - age), expiry);
        }
    }
    static void invalidate(Context context) {
        prefs(context).edit().putBoolean("unavailable", true).apply(); updateAll(context);
    }
    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, StrategyWidgetProvider.class));
        for (int id : ids) render(context, manager, id);
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_stack);
        scheduleExpiry(context);
    }
    static void render(Context context, AppWidgetManager manager, int id) {
        JSONObject data = snapshot(context);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.strategy_widget);
        Intent adapter = new Intent(context, StrategyWidgetService.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
        adapter.setData(Uri.parse("warrior-widget://adapter/" + id));
        if (Build.VERSION.SDK_INT >= 31) {
            StrategyWidgetService.Factory factory = new StrategyWidgetService.Factory(context);
            factory.onCreate();
            RemoteViews.RemoteCollectionItems.Builder items = new RemoteViews.RemoteCollectionItems.Builder()
                    .setHasStableIds(true).setViewTypeCount(1);
            for (int position = 0; position < factory.getCount(); position++) items.addItem(factory.getItemId(position), factory.getViewAt(position));
            views.setRemoteAdapter(R.id.widget_stack, items.build());
        } else {
            views.setRemoteAdapter(R.id.widget_stack, adapter);
        }
        views.setEmptyView(R.id.widget_stack, R.id.widget_empty);
        views.setTextViewText(R.id.widget_title, text(context, data, "title", R.string.widget_title));
        views.setTextViewText(R.id.widget_hint, text(context, data, "hint", R.string.widget_hint));
        views.setTextViewText(R.id.widget_empty, text(context, data, "empty", R.string.widget_empty));
        views.setTextViewText(R.id.widget_freshness, text(context, data, fresh(context) ? "snapshot" : "stale", fresh(context) ? R.string.widget_snapshot : R.string.widget_stale));
        long at = prefs(context).getLong("updatedAt", 0);
        views.setViewVisibility(R.id.widget_age, at > 0 ? View.VISIBLE : View.GONE);
        views.setChronometer(R.id.widget_age, SystemClock.elapsedRealtime() - Math.max(0, System.currentTimeMillis() - at),
                text(context, data, "age", R.string.widget_age), true);
        Intent open = new Intent(context, MainActivity.class).setAction("com.tenuwarrior.app.WIDGET_OPEN")
                .setData(Uri.parse("warrior-widget://open/" + id)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent template = PendingIntent.getActivity(context, id, open,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0));
        views.setPendingIntentTemplate(R.id.widget_stack, template);
        PendingIntent launch = PendingIntent.getActivity(context, id + 100000, new Intent(open), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_open, launch);
        views.setContentDescription(R.id.widget_open, text(context, data, "open", R.string.widget_open));
        views.setOnClickPendingIntent(R.id.widget_empty, launch);
        views.setOnClickPendingIntent(R.id.widget_freshness, launch);
        manager.updateAppWidget(id, views);
    }
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id);
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_stack);
        scheduleExpiry(context);
    }
    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) { render(context, manager, id); }
    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (EXPIRE.equals(intent.getAction())) updateAll(context);
    }
    @Override public void onDisabled(Context context) {
        AlarmManager alarm = context.getSystemService(AlarmManager.class);
        if (alarm != null) alarm.cancel(PendingIntent.getBroadcast(context, 0, new Intent(context, StrategyWidgetProvider.class).setAction(EXPIRE), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
    }
}
