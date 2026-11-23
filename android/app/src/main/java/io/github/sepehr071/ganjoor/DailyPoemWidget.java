package io.github.sepehr071.ganjoor;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class DailyPoemWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        if (widgetIds.length == 0) return;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.daily_poem_widget);
        Intent intent = new Intent(context, MainActivity.class);
        try {
            JSONObject poem = readToday(context);
            JSONObject couplet = poem.getJSONObject("couplet");
            String secondLine = couplet.isNull("b") ? "" : couplet.getString("b");
            String text = couplet.getString("a");
            if (!secondLine.isEmpty()) text += "\n" + secondLine;

            String poet = poem.getString("poet");
            int poemId = poem.getInt("id");
            views.setTextViewText(R.id.daily_widget_couplet, text);
            views.setTextViewText(R.id.daily_widget_poet, poet);
            views.setViewVisibility(R.id.daily_widget_footer, View.VISIBLE);
            intent.setAction(Intent.ACTION_VIEW);
            intent.setData(Uri.parse("beyt://poem/" + poemId));
        } catch (IOException | JSONException error) {
            Log.w("DailyPoemWidget", "Could not read the bundled daily poem", error);
        }

        PendingIntent open = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(android.R.id.background, open);
        manager.updateAppWidget(widgetIds, views);
    }

    private static JSONObject readToday(Context context) throws IOException, JSONException {
        StringBuilder json = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                context.getAssets().open("public/daily-poems.json"), StandardCharsets.UTF_8))) {
            char[] buffer = new char[4096];
            int count;
            while ((count = reader.read(buffer)) != -1) json.append(buffer, 0, count);
        }

        JSONArray poems = new JSONArray(json.toString());
        if (poems.length() == 0) throw new JSONException("Daily poems are empty");
        long now = System.currentTimeMillis();
        long day = Math.floorDiv(now + TimeZone.getDefault().getOffset(now), 86_400_000L);
        int index = (int) Math.floorMod(day, (long) poems.length());
        return poems.getJSONObject(index);
    }

    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, DailyPoemWidget.class));
        new DailyPoemWidget().onUpdate(context, manager, ids);
    }
}
