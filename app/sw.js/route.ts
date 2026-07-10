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

self.addEventListener("fetch", () => {});
`;

  return new Response(source, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
    },
  });
}
