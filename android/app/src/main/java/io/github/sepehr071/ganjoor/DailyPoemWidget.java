package io.github.sepehr071.ganjoor;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.appwidget.AppWidgetProviderInfo;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.TimeZone;
import java.util.concurrent.ThreadLocalRandom;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class DailyPoemWidget extends AppWidgetProvider {
    private static final String ACTION_SHUFFLE = "io.github.sepehr071.ganjoor.SHUFFLE_WIDGET";
    private static final String POET = "poet";
    private static final String PAPER = "paper";
    private static final String SHUFFLE_DAY = "shuffleDay";
    private static final String SHUFFLE_POEM = "shufflePoem";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        update(context, manager, widgetIds, false);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!ACTION_SHUFFLE.equals(intent.getAction())) {
            super.onReceive(context, intent);
            return;
        }

        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (isOurWidget(context, manager, widgetId)) update(context, manager, new int[] { widgetId }, true);
    }

    @Override
    public void onDeleted(Context context, int[] widgetIds) {
        for (int widgetId : widgetIds) context.deleteSharedPreferences(preferenceName(widgetId));
    }

    private static void update(Context context, AppWidgetManager manager, int[] widgetIds, boolean shuffle) {
        if (widgetIds.length == 0) return;

        List<JSONObject> poems = readPoems(context);
        boolean voiceEnabled = hasVoiceAsset(context);
        long now = System.currentTimeMillis();
        long day = Math.floorDiv(now + TimeZone.getDefault().getOffset(now), 86_400_000L);
        for (int widgetId : widgetIds) {
            manager.updateAppWidget(widgetId, render(context, widgetId, poems, day, shuffle, voiceEnabled));
        }
    }

    private static RemoteViews render(Context context, int widgetId, List<JSONObject> poems, long day, boolean shuffle, boolean voiceEnabled) {
        SharedPreferences prefs = preferences(context, widgetId);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.daily_poem_widget);
        applyTheme(context, views, prefs.getBoolean(PAPER, false));

        Intent settings = new Intent(context, DailyPoemWidgetSettings.class)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        views.setOnClickPendingIntent(R.id.daily_widget_settings,
                PendingIntent.getActivity(context, widgetId, settings, PendingIntent.FLAG_IMMUTABLE));

        Intent intent = new Intent(context, MainActivity.class);
        List<JSONObject> choices = poemsForPoet(poems, prefs.getString(POET, ""));
        boolean canShuffle = choices.size() > 1;
        views.setViewVisibility(R.id.daily_widget_next, canShuffle ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.daily_widget_voice, voiceEnabled && !choices.isEmpty() ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.daily_widget_read, choices.isEmpty() ? View.INVISIBLE : View.VISIBLE);
        if (choices.isEmpty()) {
            views.setTextViewText(R.id.daily_widget_couplet, context.getText(R.string.daily_widget_open_app));
        } else {
            int index = currentIndex(choices, prefs, day);
            if (canShuffle) {
                if (shuffle) {
                    index = anotherIndex(index, choices.size());
                    prefs.edit().putLong(SHUFFLE_DAY, day).putInt(SHUFFLE_POEM, choices.get(index).optInt("id")).apply();
                }
                Intent next = new Intent(context, DailyPoemWidget.class).setAction(ACTION_SHUFFLE)
                        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
                views.setOnClickPendingIntent(R.id.daily_widget_next,
                        PendingIntent.getBroadcast(context, widgetId, next, PendingIntent.FLAG_IMMUTABLE));
            }

            JSONObject poem = choices.get(index);
            JSONObject couplet = poem.optJSONObject("couplet");
            String secondLine = couplet.isNull("b") ? "" : couplet.optString("b");
            String text = couplet.optString("a");
            if (!secondLine.isEmpty()) text += "\n" + secondLine;
            views.setTextViewText(R.id.daily_widget_couplet, text);
            views.setTextViewText(R.id.daily_widget_poet, poem.optString("poet"));
            int poemId = poem.optInt("id");
            intent.setAction(Intent.ACTION_VIEW).setData(Uri.parse("beyt://poem/" + poemId));
            if (voiceEnabled) {
                Intent voice = new Intent(context, MainActivity.class).setAction(Intent.ACTION_VIEW)
                        .setData(Uri.parse("beyt://voice/" + poemId));
                views.setOnClickPendingIntent(R.id.daily_widget_voice,
                        PendingIntent.getActivity(context, widgetId, voice, PendingIntent.FLAG_IMMUTABLE));
            }
        }

        PendingIntent open = PendingIntent.getActivity(context, widgetId, intent, PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(android.R.id.background, open);
        views.setOnClickPendingIntent(R.id.daily_widget_couplet, open);
        views.setOnClickPendingIntent(R.id.daily_widget_read, open);
        return views;
    }

    private static void applyTheme(Context context, RemoteViews views, boolean paper) {
        views.setInt(android.R.id.background, "setBackgroundResource",
                paper ? R.drawable.daily_poem_widget_paper : R.drawable.daily_poem_widget_background);
        views.setTextColor(R.id.daily_widget_couplet, context.getColor(paper ? R.color.daily_widget_paper_ink : R.color.daily_widget_night_ink));
        views.setTextColor(R.id.daily_widget_poet, context.getColor(paper ? R.color.daily_widget_paper_poet : R.color.daily_widget_night_poet));
        int action = context.getColor(paper ? R.color.daily_widget_paper_accent : R.color.daily_widget_night_action);
        views.setTextColor(R.id.daily_widget_read_label, action);
        views.setTextColor(R.id.daily_widget_next, action);
        views.setImageViewIcon(R.id.daily_widget_voice, Icon.createWithResource(context, R.drawable.daily_widget_voice).setTint(action));
        int settings = context.getColor(paper ? R.color.daily_widget_paper_accent : R.color.daily_widget_night_gold);
        views.setImageViewIcon(R.id.daily_widget_settings, Icon.createWithResource(context, R.drawable.daily_widget_settings).setTint(settings));
    }

    private static boolean hasVoiceAsset(Context context) {
        try {
            String[] files = context.getAssets().list("public");
            return files != null && Arrays.asList(files).contains("voice-enabled");
        } catch (IOException error) {
            Log.w("DailyPoemWidget", "Could not check the voice configuration", error);
            return false;
        }
    }

    private static int currentIndex(List<JSONObject> choices, SharedPreferences prefs, long day) {
        if (prefs.getLong(SHUFFLE_DAY, Long.MIN_VALUE) == day) {
            int savedPoem = prefs.getInt(SHUFFLE_POEM, 0);
            for (int i = 0; i < choices.size(); i++) {
                if (choices.get(i).optInt("id") == savedPoem) return i;
            }
        }
        return (int) Math.floorMod(day, (long) choices.size());
    }

    static int anotherIndex(int currentIndex, int count) {
        int next = ThreadLocalRandom.current().nextInt(count - 1);
        return next < currentIndex ? next : next + 1;
    }

    private static List<JSONObject> poemsForPoet(List<JSONObject> poems, String poet) {
        if (poet.isEmpty()) return poems;
        List<JSONObject> matches = new ArrayList<>();
        for (JSONObject poem : poems) {
            if (poet.equals(poem.optString("poet"))) matches.add(poem);
        }
        return matches.isEmpty() ? poems : matches;
    }

    static List<JSONObject> readPoems(Context context) {
        List<JSONObject> poems = new ArrayList<>();
        StringBuilder json = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                context.getAssets().open("public/daily-poems.json"), StandardCharsets.UTF_8))) {
            char[] buffer = new char[4096];
            int count;
            while ((count = reader.read(buffer)) != -1) json.append(buffer, 0, count);
            JSONArray entries = new JSONArray(json.toString());
            for (int i = 0; i < entries.length(); i++) {
                JSONObject poem = entries.optJSONObject(i);
                if (poem == null || poem.optInt("id") <= 0 || poem.optString("poet").isEmpty()) continue;
                JSONObject couplet = poem.optJSONObject("couplet");
                if (couplet != null && !couplet.isNull("a") && !couplet.optString("a").isEmpty()) poems.add(poem);
            }
        } catch (IOException | JSONException error) {
            Log.w("DailyPoemWidget", "Could not read the bundled poems", error);
        }
        return poems;
    }

    static boolean isOurWidget(Context context, AppWidgetManager manager, int widgetId) {
        AppWidgetProviderInfo info = manager.getAppWidgetInfo(widgetId);
        return info != null && new ComponentName(context, DailyPoemWidget.class).equals(info.provider);
    }

    private static String preferenceName(int widgetId) {
        return "daily_poem_widget_" + widgetId;
    }

    private static SharedPreferences preferences(Context context, int widgetId) {
        return context.getSharedPreferences(preferenceName(widgetId), Context.MODE_PRIVATE);
    }

    static String selectedPoet(Context context, int widgetId) {
        return preferences(context, widgetId).getString(POET, "");
    }

    static boolean usesPaperTheme(Context context, int widgetId) {
        return preferences(context, widgetId).getBoolean(PAPER, false);
    }

    static void saveSettings(Context context, AppWidgetManager manager, int widgetId, String poet, boolean paper) {
        SharedPreferences prefs = preferences(context, widgetId);
        SharedPreferences.Editor editor = prefs.edit().putString(POET, poet).putBoolean(PAPER, paper);
        if (!poet.equals(prefs.getString(POET, ""))) editor.remove(SHUFFLE_DAY).remove(SHUFFLE_POEM);
        editor.apply();
        update(context, manager, new int[] { widgetId }, false);
    }

    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, DailyPoemWidget.class));
        update(context, manager, ids, false);
    }
}
