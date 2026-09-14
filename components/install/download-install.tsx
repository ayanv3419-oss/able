"use client";

import { Check, Download, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  detectInstallBrowser,
  detectInstallPlatform,
  getManualInstallHint,
  type InstallBrowser,
  type InstallPlatform,
} from "@/lib/install";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isInstalled() {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function DownloadInstall({ compact = false }: { compact?: boolean }) {
  const [browser, setBrowser] = useState<InstallBrowser>("other");
  const [installed, setInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState(
    "Able installs from your browser—no app store needed."
  );

  useEffect(() => {
    const currentPlatform = detectInstallPlatform({
      maxTouchPoints: navigator.maxTouchPoints,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    });
    const currentBrowser = detectInstallBrowser(navigator.userAgent);

    setPlatform(currentPlatform);
    setBrowser(currentBrowser);
    setInstalled(isInstalled());
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
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setStatus("Able is installed and ready from your home screen.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (installed) {
      return;
    }

    if (!installPrompt) {
      setStatus(getManualInstallHint(platform, browser));
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === "accepted") {
      setInstalled(true);
      setStatus("Able is installed and ready from your home screen.");
      return;
    }

    setStatus(
      "Installation was cancelled. You can try again whenever you're ready."
    );
  }, [browser, installPrompt, installed, platform]);

  const buttonLabel = installed
    ? "Able is installed"
    : installPrompt
      ? "Install Able"
      : "Show install steps";

  if (compact) {
    return (
      <div className="mx-auto w-full max-w-md">
        <Button
          className="h-12 w-full rounded-2xl bg-white px-6 text-[15px] font-medium text-[#151515] shadow-lg shadow-black/10 hover:bg-white/90"
          disabled={!ready || installed}
          onClick={handleInstall}
          size="lg"
          type="button"
        >
          {ready ? (
            installed ? (
              <Check className="size-4" />
            ) : (
              <Download className="size-4" />
            )
          ) : (
            <LoaderCircle className="size-4 animate-spin" />
          )}
          {ready ? buttonLabel : "Checking your device…"}
        </Button>
        <p aria-live="polite" className="mt-3 text-sm leading-5 text-white/65">
          {status}
        </p>
      </div>
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
            Installs in seconds. Your chats stay synced everywhere.
          </p>
        </div>
      </div>

      <Button
        className="mt-7 h-12 w-full rounded-2xl bg-[#151515] text-[15px] font-medium text-white shadow-lg shadow-black/10 hover:bg-black"
        disabled={!ready || installed}
        onClick={handleInstall}
        size="lg"
        type="button"
      >
        {ready ? (
          installed ? (
            <Check className="size-4" />
          ) : (
            <Download className="size-4" />
          )
        ) : (
          <LoaderCircle className="size-4 animate-spin" />
        )}
        {ready ? buttonLabel : "Checking your device…"}
      </Button>

      <p
        aria-live="polite"
        className="mt-4 min-h-10 text-center text-sm leading-5 text-[#777]"
      >
        {status}
      </p>
    </div>
  );
}
