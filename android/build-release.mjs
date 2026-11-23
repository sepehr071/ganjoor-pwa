// npm run android:release: gradle assembleRelease (signed when ~/.ganjoor-signing exists, see ANDROID.md), copy to release/.
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const gradlew = resolve('android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
execSync(`"${gradlew}" assembleRelease -PrequireSignedRelease`, { cwd: 'android', stdio: 'inherit' })
const apk = 'android/app/build/outputs/apk/release/app-release.apk'
if (!existsSync(apk)) throw new Error('No signed APK (only app-release-unsigned.apk): set up the keystore, see ANDROID.md')
mkdirSync('release', { recursive: true })
copyFileSync(apk, 'release/ganjoor.apk')
console.log('release/ganjoor.apk')
