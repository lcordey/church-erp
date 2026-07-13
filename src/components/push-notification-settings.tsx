"use client";

import { useEffect, useState } from "react";

type NotificationPreferences = {
  "event-assignment": boolean;
  "event-setlist": boolean;
};

const defaultPreferences: NotificationPreferences = {
  "event-assignment": true,
  "event-setlist": true,
};

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
  const [endpoint, setEndpoint] = useState("");
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

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
      if (subscription) {
        const preferencesResponse = await fetch(`/api/push/subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`);
        const preferencesPayload = await preferencesResponse.json().catch(() => null) as { data?: { preferences?: NotificationPreferences } | null } | null;
        if (!preferencesPayload?.data) await saveSubscription(subscription);
        if (!cancelled && preferencesPayload?.data?.preferences) setPreferences(preferencesPayload.data.preferences);
      }
      if (!cancelled) {
        setPublicKey(payload.data.publicKey);
        setEndpoint(subscription?.endpoint ?? "");
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
      setEndpoint(subscription.endpoint);
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
      setEndpoint("");
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
  const updatePreference = async (type: keyof NotificationPreferences, enabled: boolean) => {
    if (!endpoint) return;
    const nextPreferences = { ...preferences, [type]: enabled };
    setPreferences(nextPreferences);
    const response = await fetch("/api/push/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, preferences: nextPreferences }),
    });
    if (!response.ok) setPreferences(preferences);
  };
  return (
    <div className="notification-settings">
      <button
        aria-checked={state === "enabled"}
        aria-label={state === "enabled" ? "Désactiver les notifications" : "Activer les notifications"}
        className="notification-settings__switch"
        disabled={!canEnable && state !== "enabled"}
        onClick={() => void (state === "enabled" ? disable() : enable())}
        role="switch"
        type="button"
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

export function PushNotificationPrompt() {
  const [publicKey, setPublicKey] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
      const response = await fetch("/api/push/config");
      const payload = await response.json() as { data?: { configured?: boolean; publicKey?: string } };
      if (!payload.data?.configured || !payload.data.publicKey || Notification.permission === "denied") return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const subscriptionResponse = await fetch(`/api/push/subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`);
        const subscriptionPayload = await subscriptionResponse.json().catch(() => null) as { data?: unknown } | null;
        if (!subscriptionPayload?.data) await saveSubscription(subscription);
      }
      if (!cancelled && !subscription) {
        setPublicKey(payload.data.publicKey);
        setVisible(true);
      }
    }
    void check();
    return () => { cancelled = true; };
  }, []);

  const enable = async () => {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setVisible(false); return; }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
    const response = await saveSubscription(subscription);
    if (response.ok) setVisible(false);
  };

  if (!visible) return null;
  return <aside className="push-notification-prompt" role="status">
    <div><strong>Activer les notifications ?</strong><p>Reçois les nouveaux services et les changements de setlist sur cet appareil.</p></div>
    <div><button className="admin-button admin-button--primary" onClick={() => void enable()} type="button">Activer</button><button className="admin-button admin-button--quiet" onClick={() => setVisible(false)} type="button">Plus tard</button></div>
  </aside>;
}
