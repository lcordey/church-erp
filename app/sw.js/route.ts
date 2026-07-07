export const dynamic = "force-static";

export function GET() {
  const source = `
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
