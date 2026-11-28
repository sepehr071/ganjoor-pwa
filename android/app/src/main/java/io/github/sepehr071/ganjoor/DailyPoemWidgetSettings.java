package io.github.sepehr071.ganjoor;

import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;
import android.widget.ArrayAdapter;
import android.widget.Spinner;
import androidx.appcompat.app.AppCompatActivity;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import org.json.JSONObject;

public class DailyPoemWidgetSettings extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int widgetId = getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        Intent result = new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        setResult(RESULT_CANCELED, result);

        AppWidgetManager manager = AppWidgetManager.getInstance(this);
        if (!DailyPoemWidget.isOurWidget(this, manager, widgetId)) {
            finish();
            return;
        }

        setContentView(R.layout.daily_poem_widget_settings);
        LinkedHashSet<String> names = new LinkedHashSet<>();
        for (JSONObject poem : DailyPoemWidget.readPoems(this)) names.add(poem.optString("poet"));
        List<String> poets = new ArrayList<>(names);
        poets.add(0, getString(R.string.daily_widget_all_poets));

        Spinner poet = findViewById(R.id.daily_widget_poet_option);
        setOptions(poet, poets);
        poet.setSelection(Math.max(0, poets.indexOf(DailyPoemWidget.selectedPoet(this, widgetId))));

        Spinner theme = findViewById(R.id.daily_widget_theme_option);
        setOptions(theme, Arrays.asList(getString(R.string.daily_widget_night), getString(R.string.daily_widget_paper)));
        theme.setSelection(DailyPoemWidget.usesPaperTheme(this, widgetId) ? 1 : 0);

        findViewById(R.id.daily_widget_cancel).setOnClickListener(view -> finish());
        findViewById(R.id.daily_widget_save).setOnClickListener(view -> {
            if (DailyPoemWidget.isOurWidget(this, manager, widgetId)) {
                String selectedPoet = poet.getSelectedItemPosition() == 0 ? "" : (String) poet.getSelectedItem();
                DailyPoemWidget.saveSettings(this, manager, widgetId, selectedPoet, theme.getSelectedItemPosition() == 1);
                setResult(RESULT_OK, result);
            }
            finish();
        });
    }

    private void setOptions(Spinner spinner, List<String> options) {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, options);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
    }
}
