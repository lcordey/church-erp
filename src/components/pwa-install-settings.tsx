"use client";

import { useEffect, useState } from "react";

import {
  getDeferredInstallPrompt,
  installPromptConsumedEvent,
  installPromptReadyEvent,
  isPwaStandalone,
  promptPwaInstallation,
} from "./pwa-install";

type InstallState = "checking" | "available" | "installing" | "installed" | "unavailable";

export function PwaInstallSettings() {
  const [state, setState] = useState<InstallState>("checking");

  useEffect(() => {
    const synchronize = () => {
      setState(
        isPwaStandalone()
          ? "installed"
          : getDeferredInstallPrompt() !== null
            ? "available"
            : "unavailable",
      );
    };
    const markInstalled = () => setState("installed");

    synchronize();
    window.addEventListener(installPromptReadyEvent, synchronize);
    window.addEventListener(installPromptConsumedEvent, synchronize);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener(installPromptReadyEvent, synchronize);
      window.removeEventListener(installPromptConsumedEvent, synchronize);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const install = async () => {
    setState("installing");
    try {
      const outcome = await promptPwaInstallation();
      setState(outcome === "accepted" ? "installed" : "unavailable");
    } catch {
      setState("unavailable");
    }
  };

  const description =
    state === "installed"
      ? "ChurchERP est déjà installée sur cet appareil."
      : state === "available"
        ? "Installez ChurchERP sur l’écran d’accueil, même si vous avez masqué la bannière pour aujourd’hui."
        : state === "installing"
          ? "La demande d’installation est ouverte dans le navigateur."
          : state === "checking"
            ? "Vérification de la disponibilité de l’installation…"
            : "L’installation directe n’est pas disponible pour le moment. Vous pouvez aussi utiliser le menu d’installation du navigateur.";

  return (
    <div className="settings-section settings-section--application">
      <div>
        <h2>Application</h2>
        <p aria-live="polite">{description}</p>
      </div>
      <button
        className="admin-button admin-button--primary"
        disabled={state !== "available"}
        onClick={() => void install()}
        type="button"
      >
        {state === "installing"
          ? "Installation…"
          : state === "installed"
            ? "Déjà installée"
            : "Installer l’application"}
      </button>
    </div>
  );
}
