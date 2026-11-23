package io.github.sepehr071.ganjoor;

import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        refreshBundledAppOnUpgrade();
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        DailyPoemWidget.refresh(this);
    }

    private void refreshBundledAppOnUpgrade() {
        final long updateTime;
        try {
            updateTime = getPackageManager().getPackageInfo(getPackageName(), 0).lastUpdateTime;
        } catch (PackageManager.NameNotFoundException error) {
            return;
        }

        SharedPreferences preferences = getPreferences(MODE_PRIVATE);
        if (preferences.getLong("bundledAppUpdateTime", 0) == updateTime) return;

        bridgeBuilder.addWebViewListener(new WebViewListener() {
            private boolean checked;

            @Override
            public void onPageLoaded(WebView view) {
                String url = view.getUrl();
                if (checked || url == null || !url.startsWith("https://localhost/")) return;
                checked = true;
                // The APK already includes the current shell. Retain the API caches and user storage.
                view.evaluateJavascript("""
                    (async () => {
                      if (!navigator.serviceWorker?.controller) return;
                      const registration = await navigator.serviceWorker.getRegistration();
                      if (!registration || !await registration.unregister()) return;
                      const cacheNames = await caches.keys();
                      await Promise.all(cacheNames.filter(name => name.startsWith('workbox-precache-'))
                        .map(name => caches.delete(name)));
                      location.reload();
                    })().catch(console.error)
                    """, ignored -> preferences.edit().putLong("bundledAppUpdateTime", updateTime).apply());
            }
        });
    }
}
