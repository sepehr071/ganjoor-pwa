# Android app (Capacitor)

The same web app wrapped in a native Android shell with Capacitor 8. App id `io.github.sepehr071.ganjoor`, name «بیت» (until v0.2.0 «گنجور»; the id stays so v0.2.0 installs update in place),
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

## Release signing

Releases (from v0.2.0) are signed with a private release key that lives outside the repo:
`~/.ganjoor-signing/ganjoor-release.jks` (alias `ganjoor`, RSA 4096) plus `keystore.properties`
(`storeFile`, `storePassword`, `keyAlias`, `keyPassword`). Never commit either file. Back the folder up: without it no
future APK can update an installed one. `android/app/build.gradle` reads the properties from the path in the
`GANJOOR_SIGNING` env var, else from `~/.ganjoor-signing/keystore.properties`; when neither exists the release build
stays unsigned (`app-release-unsigned.apk`), so others and CI can still build.

```bash
npm run android:release   # vite build + cap sync android + gradlew assembleRelease, copies the signed APK to release/ganjoor.apk
apksigner verify --print-certs release/ganjoor.apk
```

Bump `versionCode` and `versionName` in `android/app/build.gradle` for every release. The v0.1.0 APK was debug-signed
with a different key: uninstall it before installing v0.2.0 or later (Android refuses an update signed by another key).
Save any data you want to keep before uninstalling. For releases signed with the current key, install the new APK
over the existing app to keep its data. The release script requires signing before it can copy an APK.

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
  share sheet (poem and poet shares link to the public Beyt site); links to other origins
  open in a Custom Tab (system browser), never in the app WebView; status bar icons follow the theme (`color-scheme`
  and `--bg` from `tokens.css`).
- Icons and splash: sources in `resources/*.svg` (same emblem as `public/icon.svg`), generated into `android/app/src/main/res`
  with `npx capacitor-assets generate --android --assetPath resources`. Android 12+ system splash shows the adaptive icon on
  ivory (`values/colors.xml`) or lapis in dark mode (`values-night/colors.xml`).
- The service worker stays on: Capacitor routes service-worker requests to the bundled files
  (`android.resolveServiceWorkerRequests`, default true), so opened poems stay readable offline as on the web.
- The Ganjoor API answers `Origin: https://localhost` with a matching `Access-Control-Allow-Origin` (checked with curl).

## Device testing

Download the published APK using the link in README, or open the latest GitHub release and choose
`ganjoor.apk` under **Assets**. Its minimum is Android 7 (API 24). The published v0.3.1 APK passed
`apksigner verify` and contains no ABI-specific libraries. For an install failure on a supported phone,
record the exact message or the result of `adb install -r ganjoor.apk`. `INSTALL_FAILED_UPDATE_INCOMPATIBLE`
indicates that the installed app and downloaded APK have different signing certificates.

To check a release candidate, compare its signing certificate with the published APK using
`apksigner verify --print-certs`. Install on a fresh test device and update over the published release on
another test device. Use Android's home-screen widget picker to add «بیت امروز». Compare it with the
app's daily verse, tap it with the app closed and already running, and repeat in airplane mode.
Check it after the local date rolls over. Android chooses when to deliver the hourly widget refresh.

The signed v0.3.1 APK was installed in place on Android 16. On Wi-Fi, both the daily verse on the home screen and
Hafez's first ghazal streamed from Ganjoor. The tested cellular connection timed out reaching `i.ganjoor.net`.
The player reports a failed start after 12 seconds and lets the listener retry. An earlier QA build played a saved
Ganjoor recitation with verse timing after reloading with no active network. That offline test used a local copy
of the original MP3.

Known limits:
- targetSdk 36 forces edge-to-edge: the status-bar background colour cannot be set on Android 15+, the page paints
  behind the bar (the header uses `env(safe-area-inset-top)`); content scrolling above the sticky header may show under it.
- After an APK update, the app refreshes its bundled shell and preserves the API cache, saved poems, and downloaded recitations.
