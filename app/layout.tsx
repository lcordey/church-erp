import type { Metadata, Viewport } from "next";

import { AppThemeProvider } from "@/src/components/app-theme-provider";
import { AppShell } from "@/src/components/app-shell";
import { getCurrentActor } from "@/src/infrastructure/auth/require-admin";
import { MusicNotationProvider } from "@/src/modules/songs/components/music-notation-provider";
import { SongRenderPreferencesProvider } from "@/src/modules/songs/components/song-render-preferences-provider";

import "./globals.css";

const themeBootstrapScript = `
  (() => {
    try {
      const theme = localStorage.getItem("church-erp-app-theme");
      if (["sand", "night", "forest", "dawn"].includes(theme)) {
        document.documentElement.dataset.appTheme = theme;
        document.documentElement.style.colorScheme = theme === "night" ? "dark" : "light";
      }
    } catch {}
  })();
`;

const pwaInstallBootstrapScript = `
  (() => {
    window.__churchErpInstallPrompt = null;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      window.__churchErpInstallPrompt = event;
    });
    if ("serviceWorker" in navigator) {
      const registerChurchErpServiceWorker = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      };

      if (document.readyState === "complete") {
        registerChurchErpServiceWorker();
      } else {
        window.addEventListener("load", registerChurchErpServiceWorker, {
          once: true,
        });
      }
    }
  })();
`;

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
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <script
          dangerouslySetInnerHTML={{ __html: pwaInstallBootstrapScript }}
        />
      </head>
      <body>
        <AppThemeProvider>
          <MusicNotationProvider>
            <SongRenderPreferencesProvider>
              <AppShell isAuthenticated={actor !== null}>{children}</AppShell>
            </SongRenderPreferencesProvider>
          </MusicNotationProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
