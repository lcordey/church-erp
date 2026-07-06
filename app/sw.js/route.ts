const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "development";
const offlineDocument = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#315b78">
    <title>ChurchERP · Hors connexion</title>
    <style>
      :root { color-scheme: light; font-family: system-ui, sans-serif; }
      body { display: grid; min-height: 100vh; margin: 0; place-items: center; background: #f7f4ec; color: #243746; }
      main { max-width: 32rem; padding: 2rem; text-align: center; }
      h1 { margin: 0 0 1rem; font-size: 1.75rem; }
      p { margin: 0; color: #5f6f78; line-height: 1.6; }
    </style>
  </head>
  <body>
    <main>
      <h1>Connexion indisponible</h1>
      <p>ChurchERP sera de nouveau accessible dès que la connexion réseau sera rétablie.</p>
    </main>
  </body>
</html>`;

export const dynamic = "force-static";

export function GET() {
  const source = `
self.__CHURCH_ERP_VERSION__ = ${JSON.stringify(appVersion)};
const OFFLINE_DOCUMENT = ${JSON.stringify(offlineDocument)};

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(OFFLINE_DOCUMENT, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
          status: 503,
        }),
    ),
  );
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
