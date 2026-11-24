import { useEffect, useState } from "react";
import { isMobileBrowser, isStandalone, promptEvent, webRuntime } from "./pwa";

function ShareGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
    </svg>
  );
}

function HomeGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

export function InstallPrompt({ appName, icon, storageKey }: { appName: string; icon: string; storageKey: string }) {
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!webRuntime || isStandalone() || !isMobileBrowser()) return;

    const dismissed = Number(localStorage.getItem(`${storageKey}.dismissed`) ?? 0);
    if (dismissed && Date.now() - dismissed < 7 * 24 * 60 * 60 * 1000) return;

    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIos(isIos);

    let timer = 0;
    const show = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setOpen(true), 900);
    };
    const onAvailable = () => {
      show();
    };
    const onInstalled = () => {
      localStorage.setItem(`${storageKey}.dismissed`, String(Date.now() + 365 * 24 * 60 * 60 * 1000));
      setOpen(false);
    };

    window.addEventListener("pwa-installable", onAvailable);
    window.addEventListener("pwa-installed", onInstalled);
    if (isIos) show();
    else if (promptEvent()) onAvailable();
    else show(); // Firefox and embedded browsers: show the menu instructions instead.

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pwa-installable", onAvailable);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, [storageKey]);

  if (!open) return null;

  const close = () => {
    localStorage.setItem(`${storageKey}.dismissed`, String(Date.now()));
    setOpen(false);
  };

  const install = async () => {
    const event = promptEvent();
    if (!event) {
      setInstructions(true);
      return;
    }
    setBusy(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") {
        localStorage.setItem(`${storageKey}.dismissed`, String(Date.now() + 365 * 24 * 60 * 60 * 1000));
        setOpen(false);
      } else {
        close();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pwa-scrim" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="pwa-dialog" role="dialog" aria-modal="true" aria-labelledby="pwa-title">
        <button className="pwa-close" type="button" onClick={close} aria-label={ios ? "Fermer" : "Close"}>×</button>
        <img className="pwa-icon" src={icon} alt="" />
        <h2 id="pwa-title">Installer {appName}</h2>
        <p>
          Ajoute {appName} à ton écran d'accueil pour l'ouvrir comme une application, en plein écran.
        </p>

        {ios || instructions ? (
          <ol className="pwa-steps">
            <li>
              <span className="pwa-step-icon"><ShareGlyph /></span>
              <span>{ios ? "Dans Safari, appuie sur Partager." : "Ouvre le menu de ton navigateur."}</span>
            </li>
            <li>
              <span className="pwa-step-icon"><HomeGlyph /></span>
              <span>{ios ? "Choisis « Sur l'écran d'accueil »." : "Choisis « Installer l'application » ou « Ajouter à l'écran d'accueil »."}</span>
            </li>
          </ol>
        ) : null}

        <div className="pwa-actions">
          {!ios && !instructions && (
            <button className="btn btn-primary btn-block" type="button" onClick={() => void install()} disabled={busy}>
              {busy ? "Ouverture…" : "Installer l'application"}
            </button>
          )}
          <button className="btn btn-ghost btn-block" type="button" onClick={close}>
            {ios || instructions ? "J'ai compris" : "Plus tard"}
          </button>
        </div>
      </div>
    </div>
  );
}
