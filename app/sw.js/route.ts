export const dynamic = "force-static";

const serviceWorkerVersion =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.RAILWAY_GIT_COMMIT_SHA ??
  process.env.RENDER_GIT_COMMIT ??
  process.env.NEXT_PUBLIC_CHURCH_ERP_APP_VERSION ??
  `build-${new Date().toISOString()}`;

export function GET() {
  const source = `
const CHURCH_ERP_SW_VERSION = ${JSON.stringify(serviceWorkerVersion)};

self.CHURCH_ERP_SW_VERSION = CHURCH_ERP_SW_VERSION;

self.addEventListener("message", (event) => {
  if (event.data?.type === "CHURCH_ERP_SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data?.json() ?? {};
  } catch {
    message = { body: event.data?.text() };
  }
  event.waitUntil(self.registration.showNotification(message.title ?? "Church ERP", {
    body: message.body ?? "Une nouvelle information est disponible.",
    icon: "/icons/churcherp-192.png",
    badge: "/icons/churcherp-192.png",
    tag: message.tag,
    data: { url: message.url ?? "/events" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url ?? "/events", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const matchingClient = clients.find((client) => client.url === targetUrl);
    if (matchingClient) return matchingClient.focus();
    return self.clients.openWindow(targetUrl);
  }));
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request));
  }
});
`;

  return new Response(source, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
    },
  });
}
