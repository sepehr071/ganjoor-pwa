// npm run android:build: gradle assembleDebug, then copy the APK to release/. Run from the project root.
import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Absolute path: cmd may refuse to run gradlew.bat from the current directory.
const gradlew = resolve('android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
execSync(`"${gradlew}" assembleDebug`, { cwd: 'android', stdio: 'inherit' })
mkdirSync('release', { recursive: true })
copyFileSync('android/app/build/outputs/apk/debug/app-debug.apk', 'release/ganjoor-proposal-debug.apk')
console.log('release/ganjoor-proposal-debug.apk')
