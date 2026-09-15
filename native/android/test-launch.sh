#!/usr/bin/env bash
set -euo pipefail

evidence=dist/android-launch
mkdir -p "$evidence"
component=app.able.mobile/com.google.androidbrowserhelper.trusted.LauncherActivity

adb shell pm path com.android.chrome | grep -q package:
adb shell am set-debug-app --persistent com.android.chrome
adb shell 'echo "chrome --disable-fre --no-first-run --no-default-browser-check" > /data/local/tmp/chrome-command-line'
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard

# Reproduce the released crash before testing the fix on the same device.
curl --fail --location --retry 3 \
  https://github.com/ayanv3419-oss/able/releases/download/v1.0.3/Able-Android.apk \
  --output "$evidence/previous.apk"
adb install "$evidence/previous.apk"
adb logcat -c
adb shell am start -W -n "$component" -a android.intent.action.MAIN -c android.intent.category.LAUNCHER
sleep 10
adb logcat -d -b crash > "$evidence/previous-crash.log"
grep -q 'Process: app.able.mobile' "$evidence/previous-crash.log"
grep -q 'ManageDataLauncherActivity' "$evidence/previous-crash.log"
echo 'Confirmed: previous APK crashes on the missing settings activity.'

# Install over the released version: the production signing key must match.
adb shell am force-stop app.able.mobile
adb shell am force-stop com.android.chrome
adb install -r dist/android/Able-Android.apk
adb shell dumpsys package app.able.mobile > "$evidence/installed-package.txt"
grep -q 'versionCode=2' "$evidence/installed-package.txt"

check_launch() {
  local label=$1
  adb logcat -c
  adb shell am start -W -n "$component" -a android.intent.action.MAIN -c android.intent.category.LAUNCHER
  sleep 10
  adb logcat -d -b crash > "$evidence/$label-crash.log"
  adb logcat -d -s TWALauncherActivity TwaLauncher AndroidRuntime > "$evidence/$label-launch.log"
  if grep -q 'Process: app.able.mobile' "$evidence/$label-crash.log"; then
    cat "$evidence/$label-crash.log"
    exit 1
  fi
  adb shell dumpsys activity activities > "$evidence/$label-activities.txt"
  grep -E '(mResumedActivity|topResumedActivity).*com.android.chrome/' "$evidence/$label-activities.txt"
  adb shell uiautomator dump /sdcard/able-window.xml
  adb pull /sdcard/able-window.xml "$evidence/$label-window.xml"
  adb exec-out screencap -p > "$evidence/$label.png"
  grep -q 'Continue with Google' "$evidence/$label-window.xml"
}

check_launch first-launch
adb shell input keyevent KEYCODE_HOME
check_launch reopen
echo 'Passed: signed APK upgrade, first launch, and reopening without a crash.'
