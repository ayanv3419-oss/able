"""Exercise and record the public APK against the live Able service."""

import hashlib
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path


OUT = Path("dist/android-live-demo")
COMPONENT = "app.able.mobile/com.google.androidbrowserhelper.trusted.LauncherActivity"
RESULT = {
    "app_version": "1.0.4 (2)",
    "android": 15,
    "site": "https://able-alpha.vercel.app",
    "apk_sha256": hashlib.sha256((OUT / "Able-Android.apk").read_bytes()).hexdigest(),
    "checks": [],
    "signed_in_chat_tested": False,
    "scope": "Public released APK, production service, no login bypass or mock responses.",
}


def adb(*args, check=True):
    return subprocess.run(
        ["adb", *args], check=check, capture_output=True, timeout=35
    ).stdout


def ui():
    adb("shell", "uiautomator", "dump", "/sdcard/able-demo.xml")
    return adb("shell", "cat", "/sdcard/able-demo.xml").decode()


def wait_for(label, predicate, timeout=40):
    deadline = time.monotonic() + timeout
    last = ""
    while time.monotonic() < deadline:
        try:
            last = ui()
            if predicate(last):
                (OUT / f"{label}.xml").write_text(last)
                # Accessibility can update before the browser paints the new page.
                time.sleep(1)
                (OUT / f"{label}.png").write_bytes(adb("exec-out", "screencap", "-p"))
                RESULT["checks"].append({"check": label, "passed": True})
                print(f"PASS: {label}", flush=True)
                return last
        except (subprocess.SubprocessError, ET.ParseError):
            pass
        time.sleep(2)
    (OUT / f"{label}-failed.xml").write_text(last)
    (OUT / f"{label}-failed.png").write_bytes(adb("exec-out", "screencap", "-p"))
    raise AssertionError(f"Timed out waiting for {label}")


def tap_text(xml, text):
    # Select coordinates from the current UI tree, never from assumed layouts.
    root = ET.fromstring(xml)
    candidates = [
        node for node in root.iter("node")
        if text in (node.get("text", ""), node.get("content-desc", ""))
        and node.get("clickable") == "true"
    ]
    if not candidates:
        raise AssertionError(f"No clickable {text!r} in the observed UI")
    bounds = [int(v) for v in re.findall(r"\d+", candidates[0].get("bounds", ""))]
    if len(bounds) != 4:
        raise AssertionError("Invalid bounds in the observed UI")
    adb("shell", "input", "tap", str((bounds[0] + bounds[2]) // 2), str((bounds[1] + bounds[3]) // 2))


def launch():
    adb("shell", "am", "start", "-W", "-n", COMPONENT,
        "-a", "android.intent.action.MAIN", "-c", "android.intent.category.LAUNCHER")


def sign_in_screen(xml):
    return "Continue with Google" in xml and "Sign in to pick up" in xml


def google_login_screen(xml):
    invalid = ("redirect_uri_mismatch", "disallowed_useragent", "Access blocked", "request is invalid")
    if any(error.casefold() in xml.casefold() for error in invalid):
        (OUT / "google-error.xml").write_text(xml)
        raise AssertionError("Google rejected the app's authentication request")
    return (
        "accounts.google.com" in xml
        and "able-alpha.vercel.app" in xml
        and any(text in xml for text in ("Sign in - Google Accounts", "Choose an account"))
    )


recorder = None
try:
    adb("install", str(OUT / "Able-Android.apk"))
    adb("shell", "am", "set-debug-app", "--persistent", "com.android.chrome")
    adb("shell", "sh", "-c", "'echo chrome --disable-fre --no-first-run --no-default-browser-check > /data/local/tmp/chrome-command-line'")
    adb("shell", "input", "keyevent", "KEYCODE_WAKEUP")
    adb("shell", "wm", "dismiss-keyguard")
    adb("shell", "input", "keyevent", "KEYCODE_HOME")
    adb("logcat", "-c")
    recorder = subprocess.Popen([
        "adb", "shell", "screenrecord", "--size", "720x1560",
        "--bit-rate", "2000000", "--time-limit", "180", "/sdcard/able-live-demo.mp4",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    launch()
    current = wait_for("01-app-opens", sign_in_screen)
    time.sleep(2)
    tap_text(current, "Download")
    wait_for("02-live-download-page", lambda x: "Your best study space" in x and "Download for Android" in x)
    time.sleep(2)
    adb("shell", "input", "keyevent", "KEYCODE_BACK")
    current = wait_for("03-back-to-sign-in", sign_in_screen)
    tap_text(current, "Continue with Google")
    wait_for("04-google-sign-in", google_login_screen)
    time.sleep(3)

    # Return without entering credentials or creating a Google account.
    adb("shell", "input", "keyevent", "KEYCODE_BACK")
    wait_for("05-return-from-google", sign_in_screen)
    adb("shell", "input", "keyevent", "KEYCODE_HOME")
    time.sleep(2)
    launch()
    wait_for("06-reopen-from-home", sign_in_screen)
    adb("shell", "am", "force-stop", "app.able.mobile")
    adb("shell", "am", "force-stop", "com.android.chrome")
    launch()
    wait_for("07-cold-restart", sign_in_screen)
    time.sleep(2)
    crash_log = adb("logcat", "-d", "-b", "crash").decode()
    (OUT / "crashes.log").write_text(crash_log)
    if "Process: app.able.mobile" in crash_log:
        raise AssertionError("Able crashed during the demo")
    RESULT["checks"].append({"check": "08-no-able-crashes", "passed": True})
    RESULT["passed"] = True
except Exception as error:
    RESULT["passed"] = False
    RESULT["error"] = str(error)
    raise
finally:
    if recorder:
        adb("shell", "pkill", "-2", "screenrecord", check=False)
        try:
            recorder.wait(timeout=10)
        except subprocess.TimeoutExpired:
            recorder.terminate()
        adb("pull", "/sdcard/able-live-demo.mp4", str(OUT / "Able-live-demo.mp4"), check=False)
    (OUT / "result.json").write_text(json.dumps(RESULT, indent=2))
    (OUT / "runtime.log").write_bytes(adb("logcat", "-d", "-s", "AndroidRuntime", "TWALauncherActivity", "TwaLauncher"))
