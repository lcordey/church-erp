import type { Metadata, Viewport } from "next";

import { AppShell } from "@/src/components/app-shell";
import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { MusicNotationProvider } from "@/src/modules/songs/components/music-notation-provider";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "ChurchERP",
  title: {
    default: "ChurchERP",
    template: "%s · ChurchERP",
  },
  description: "Catalogue public des chants de l’équipe louange.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ChurchERP",
  },
  icons: {
    icon: [
      { url: "/icons/churcherp-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/churcherp-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/churcherp-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#315b78",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const actor = await getCurrentActor();

  return (
    <html lang="fr">
      <body>
        <MusicNotationProvider>
          <AppShell isAuthenticated={actor !== null}>{children}</AppShell>
        </MusicNotationProvider>
      </body>
    </html>
  );
}
