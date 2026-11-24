// The browser build is installable as a PWA. The desktop shell never registers a service worker.
export type PwaPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    __pwaInstallEvent?: PwaPromptEvent | null;
  }
}

export const webRuntime = import.meta.env.VITE_WEB === "1";

export function registerPwa(): void {
  if (!webRuntime || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  }, { once: true });
}

export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isMobileBrowser(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios || /Android/i.test(ua) || window.matchMedia("(pointer: coarse)").matches;
}

export function promptEvent(): PwaPromptEvent | null {
  return window.__pwaInstallEvent ?? null;
}
