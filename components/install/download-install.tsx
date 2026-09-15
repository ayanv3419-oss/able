"use client";

import { Download, LoaderCircle, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  detectInstallBrowser,
  detectInstallPlatform,
  getManualInstallHint,
  getNativeDownload,
  type InstallBrowser,
  type InstallPlatform,
  type NativeDownload,
} from "@/lib/install";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function DownloadInstall() {
  const [browser, setBrowser] = useState<InstallBrowser>("other");
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [nativeDownload, setNativeDownload] = useState<NativeDownload | null>(
    null
  );
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Detecting the best Able app for you…");

  useEffect(() => {
    const currentPlatform = detectInstallPlatform({
      maxTouchPoints: navigator.maxTouchPoints,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    });
    const currentBrowser = detectInstallBrowser(navigator.userAgent);
    const currentDownload = getNativeDownload(currentPlatform);

    setPlatform(currentPlatform);
    setBrowser(currentBrowser);
    setNativeDownload(currentDownload);
    setStatus(
      currentDownload?.detail ??
        (currentPlatform === "ios"
          ? "The iPhone app needs Apple App Store signing. Home Screen install is available now."
          : "Choose Windows, Android, or macOS below.")
    );
    setReady(true);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => undefined);
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleWebInstall = useCallback(async () => {
    if (!installPrompt) {
      setStatus(getManualInstallHint(platform, browser));
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setStatus(
      choice.outcome === "accepted"
        ? "Able is installed and ready from your home screen."
        : "Installation was cancelled. You can try again whenever you're ready."
    );
  }, [browser, installPrompt, platform]);

  const linkClass =
    "mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#151515] px-6 text-[15px] font-medium text-white shadow-lg shadow-black/10 transition-transform hover:scale-[1.01] hover:bg-black";

  let action = (
    <a className={linkClass} href="#devices">
      <Download className="size-4" />
      Choose your download
    </a>
  );

  if (!ready) {
    action = (
      <span className={linkClass}>
        <LoaderCircle className="size-4 animate-spin" />
        Checking your device…
      </span>
    );
  } else if (nativeDownload) {
    action = (
      <a className={linkClass} href={nativeDownload.href}>
        <Download className="size-4" />
        {nativeDownload.label}
      </a>
    );
  } else if (platform === "ios") {
    action = (
      <Button
        className={linkClass}
        onClick={handleWebInstall}
        size="lg"
        type="button"
      >
        <Smartphone className="size-4" />
        Install on iPhone
      </Button>
    );
  }

  return (
    <div className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.08)] sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#151515] shadow-sm">
          <span className="text-2xl font-semibold text-white">A</span>
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-lg font-semibold text-[#151515]">
            Able for your device
          </p>
          <p className="mt-1 text-sm leading-6 text-[#6d6d6d]">
            Real installer. Focused app window. Your chats stay synced.
          </p>
        </div>
      </div>

      {action}

      <p
        aria-live="polite"
        className="mt-4 min-h-10 text-center text-sm leading-5 text-[#777]"
      >
        {status}
      </p>
    </div>
  );
}
