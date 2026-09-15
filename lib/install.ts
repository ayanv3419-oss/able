export type InstallPlatform = "android" | "ios" | "macos" | "windows" | "other";

export type InstallBrowser = "chrome" | "edge" | "firefox" | "safari" | "other";

export type NativeDownload = {
  detail: string;
  href: string;
  label: string;
};

const RELEASE_DOWNLOAD_BASE =
  "https://github.com/ayanv3419-oss/able/releases/latest/download";

export const NATIVE_DOWNLOADS = {
  android: {
    detail: "Android 6 or newer • APK",
    href: `${RELEASE_DOWNLOAD_BASE}/Able-Android.apk`,
    label: "Download for Android",
  },
  macos: {
    detail: "macOS 12 or newer • DMG",
    href: `${RELEASE_DOWNLOAD_BASE}/Able-macOS.dmg`,
    label: "Download for macOS",
  },
  windows: {
    detail: "Windows 10 or 11 • EXE",
    href: `${RELEASE_DOWNLOAD_BASE}/Able-Setup.exe`,
    label: "Download for Windows",
  },
} satisfies Record<"android" | "macos" | "windows", NativeDownload>;

export function getNativeDownload(
  platform: InstallPlatform
): NativeDownload | null {
  if (
    platform === "android" ||
    platform === "macos" ||
    platform === "windows"
  ) {
    return NATIVE_DOWNLOADS[platform];
  }

  return null;
}

type NavigatorDetails = {
  maxTouchPoints?: number;
  platform?: string;
  userAgent: string;
};

export function detectInstallPlatform({
  maxTouchPoints = 0,
  platform = "",
  userAgent,
}: NavigatorDetails): InstallPlatform {
  if (/android/i.test(userAgent)) {
    return "android";
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "ios";
  }
  if (/mac/i.test(platform) && maxTouchPoints > 1) {
    return "ios";
  }
  if (/mac/i.test(userAgent) || /mac/i.test(platform)) {
    return "macos";
  }
  if (/windows/i.test(userAgent) || /win/i.test(platform)) {
    return "windows";
  }
  return "other";
}

export function detectInstallBrowser(userAgent: string): InstallBrowser {
  if (/edg\//i.test(userAgent)) {
    return "edge";
  }
  if (/firefox|fxios/i.test(userAgent)) {
    return "firefox";
  }
  if (/chrome|crios/i.test(userAgent)) {
    return "chrome";
  }
  if (/safari/i.test(userAgent)) {
    return "safari";
  }
  return "other";
}

export function getManualInstallHint(
  platform: InstallPlatform,
  browser: InstallBrowser
): string {
  if (platform === "ios") {
    return "In Safari, tap Share, then choose Add to Home Screen.";
  }
  if (platform === "android") {
    return "In Chrome, open the three-dot menu and choose Add to Home screen.";
  }
  if (browser === "edge") {
    return "Open the Edge menu, choose Apps, then Install Able.";
  }
  if (browser === "chrome") {
    return "Click the install icon in Chrome's address bar, or choose Install Able from the menu.";
  }
  if (platform === "macos" && browser === "safari") {
    return "In Safari, open the Share menu and choose Add to Dock.";
  }
  return "Open this page in Chrome or Edge, then choose Install Able from the browser menu.";
}
