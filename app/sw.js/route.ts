const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "development";

export const dynamic = "force-static";

export function GET() {
  const source = `
self.__CHURCH_ERP_VERSION__ = ${JSON.stringify(appVersion)};

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener("fetch", () => {
  // The application stays network-first. This handler makes it installable.
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
