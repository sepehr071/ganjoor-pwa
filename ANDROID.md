# Android app (Capacitor)

The same web app wrapped in a native Android shell with Capacitor 8. App id `io.github.sepehr071.ganjoor`, name «گنجور»,
minSdk 24, targetSdk 36. The web build in `dist/` is bundled into the APK and served from `https://localhost`.

## Build

Needs JDK 21 and the Android SDK (platform 36). Set `ANDROID_HOME` or `android/local.properties` (`sdk.dir=...`).

```bash
npm install
npm run android:build   # vite build + cap sync android + gradlew assembleDebug, copies the APK to release/
npm run android:sync    # only web build + cap sync (after changing src/)
npm run android:open    # open android/ in Android Studio
```

Output: `release/ganjoor-proposal-debug.apk` (debug-signed; not for the Play Store).

Gradle behind the local proxy: this machine sets `systemProp.http(s).proxyHost/proxyPort` in `~/.gradle/gradle.properties`
(not in the project). Java TLS handshakes through the proxy fail now and then ("Remote host terminated the handshake"):
rerun the build, it resumes where it stopped.

## Install

```bash
adb install -r release/ganjoor-proposal-debug.apk
adb shell am start -n io.github.sepehr071.ganjoor/.MainActivity
```

## Native parts

- `src/lib/native.js` (no-op on the web): Android back button goes back, exits on the home page; share uses the native
  share sheet (a `https://localhost` link is dropped, the text carries the ganjoor.net source); links to other origins
  open in a Custom Tab (system browser), never in the app WebView; status bar icons follow the theme (`color-scheme`
  and `--bg` from `tokens.css`).
- Icons and splash: sources in `resources/*.svg` (same emblem as `public/icon.svg`), generated into `android/app/src/main/res`
  with `npx capacitor-assets generate --android --assetPath resources`. Android 12+ system splash shows the adaptive icon on
  ivory (`values/colors.xml`) or lapis in dark mode (`values-night/colors.xml`).
- The service worker stays on: Capacitor routes service-worker requests to the bundled files
  (`android.resolveServiceWorkerRequests`, default true), so opened poems stay readable offline as on the web.
- The Ganjoor API answers `Origin: https://localhost` with a matching `Access-Control-Allow-Origin` (checked with curl).

## Not tested

No device or emulator was available when this was built. Untested on a real device: launch, splash, back button, share
sheet, external links, status bar style, service worker inside the WebView, audio playback, edge-to-edge insets.

Known limits:
- targetSdk 36 forces edge-to-edge: the status-bar background colour cannot be set on Android 15+, the page paints
  behind the bar (the header uses `env(safe-area-inset-top)`); content scrolling above the sticky header may show under it.
- After an app update the service worker can serve the previous version for one launch, then updates itself.
