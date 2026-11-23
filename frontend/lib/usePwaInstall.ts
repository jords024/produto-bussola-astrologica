"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_STORAGE_KEY = "bussola_pwa_banner_dismissed";

/**
 * Identifica se o dispositivo é celular ou tablet (incluindo iPadOS com UA de Mac).
 */
export function isMobileOrTabletDevice(
  userAgent: string,
  maxTouchPoints = 0
): boolean {
  if (!userAgent) return false;
  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i.test(
      userAgent
    )
  ) {
    return true;
  }
  // iPadOS 13+ se identifica como Macintosh, mas possui múltiplos pontos de toque
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) {
    return true;
  }
  return false;
}

/**
 * Identifica dispositivos Apple (iPhone, iPad, iPod).
 */
export function isIosDevice(userAgent: string, maxTouchPoints = 0): boolean {
  if (!userAgent) return false;
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return true;
  return false;
}

/**
 * Verifica se o app já está sendo executado como atalho/PWA instalado.
 */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mediaMatch =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(mediaMatch || iosStandalone);
}

export function usePwaInstall() {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = window.navigator.userAgent || "";
    const touchPoints = window.navigator.maxTouchPoints || 0;
    const mobile = isMobileOrTabletDevice(ua, touchPoints);
    const ios = isIosDevice(ua, touchPoints);
    const standalone = isRunningStandalone();

    setIsMobileOrTablet(mobile);
    setIsIos(ios);
    setIsStandalone(standalone);
    setDismissed(localStorage.getItem(DISMISS_STORAGE_KEY) === "1");

    if ("serviceWorker" in window.navigator) {
      window.navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silencioso: SW é progressivo
      });
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowGuideModal(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const canShowInstall = isMobileOrTablet && !isStandalone;
  const canShowBanner = canShowInstall && !dismissed;

  const triggerInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
      return;
    }
    setShowGuideModal(true);
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_STORAGE_KEY, "1");
    }
  }, []);

  const closeGuideModal = useCallback(() => {
    setShowGuideModal(false);
  }, []);

  return {
    canShowInstall,
    canShowBanner,
    isIos,
    showGuideModal,
    triggerInstall,
    dismissBanner,
    closeGuideModal,
  };
}
