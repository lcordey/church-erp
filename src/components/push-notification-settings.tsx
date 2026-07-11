"use client";

import { useEffect, useState } from "react";

type NotificationState =
  | "checking"
  | "available"
  | "enabled"
  | "working"
  | "denied"
  | "unsupported"
  | "unconfigured"
  | "login-required"
  | "error";

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
  return bytes.buffer;
}

async function saveSubscription(subscription: PushSubscription) {
  return fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
}

export function PushNotificationSettings() {
  const [state, setState] = useState<NotificationState>("checking");
  const [publicKey, setPublicKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (!cancelled) setState("unsupported");
        return;
      }
      const response = await fetch("/api/push/config");
      const payload = await response.json() as { data?: { configured?: boolean; publicKey?: string } };
      if (!payload.data?.configured || !payload.data.publicKey) {
        if (!cancelled) setState("unconfigured");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!cancelled) {
        setPublicKey(payload.data.publicKey);
        setState(Notification.permission === "denied" ? "denied" : subscription ? "enabled" : "available");
      }
    };
    void initialize().catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, []);

  const enable = async () => {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "available");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(publicKey),
      });
      const response = await saveSubscription(subscription);
      if (response.status === 401 || response.status === 403) {
        await subscription.unsubscribe();
        setState("login-required");
        return;
      }
      if (!response.ok) throw new Error("Subscription rejected");
      setState("enabled");
    } catch {
      setState("error");
    }
  };

  const disable = async () => {
    setState("working");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("available");
    } catch {
      setState("error");
    }
  };

  const descriptions: Record<NotificationState, string> = {
    checking: "Vérification de la compatibilité de cet appareil…",
    available: "Recevez une alerte lorsque vous êtes ajouté à l’équipe d’un événement.",
    enabled: "Les notifications de service sont actives sur cet appareil.",
    working: "Mise à jour des notifications…",
    denied: "Les notifications sont bloquées dans les réglages du navigateur ou du téléphone.",
    unsupported: "Les notifications push ne sont pas disponibles sur cet appareil. Sur iPhone, installez d’abord l’application sur l’écran d’accueil.",
    unconfigured: "Les notifications ne sont pas encore configurées sur ce serveur.",
    "login-required": "Connectez-vous avant d’activer les notifications.",
    error: "Impossible de mettre à jour les notifications pour le moment.",
  };

  const canEnable = state === "available" || state === "login-required" || state === "error";
  return (
    <div className="settings-section settings-section--application">
      <div>
        <h2>Notifications de service</h2>
        <p aria-live="polite">{descriptions[state]}</p>
      </div>
      <button
        className={`admin-button ${state === "enabled" ? "admin-button--quiet" : "admin-button--primary"}`}
        disabled={!canEnable && state !== "enabled"}
        onClick={() => void (state === "enabled" ? disable() : enable())}
        type="button"
      >
        {state === "enabled" ? "Désactiver" : state === "working" ? "Mise à jour…" : "Activer les notifications"}
      </button>
    </div>
  );
}
