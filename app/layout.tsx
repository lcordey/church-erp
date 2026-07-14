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
      const colors = {
        sand: "#315b78",
        night: "#0f141c",
        forest: "#486953",
        dawn: "#a05d6d",
      };
      const savedTheme = localStorage.getItem("church-erp-app-theme");
      const theme = Object.hasOwn(colors, savedTheme) ? savedTheme : "sand";
      document.documentElement.dataset.appTheme = theme;
      document.documentElement.style.colorScheme = theme === "night" ? "dark" : "light";
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        meta.setAttribute("content", colors[theme]);
      });
    } catch {}
  })();
`;

const installPromptBootstrapScript = `
  (() => {
    window.__churchErpDeferredInstallPrompt = null;
    if ("serviceWorker" in navigator) {
      window.__churchErpServiceWorkerRegistrationPromise = navigator.serviceWorker
        .register("/sw.js")
        .catch(() => null);
    }
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      window.__churchErpDeferredInstallPrompt = event;
      window.dispatchEvent(new Event("churcherpinstallpromptready"));
    });
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
  icons: {
    icon: [
      { url: "/icons/churcherp.svg", type: "image/svg+xml" },
      { url: "/icons/churcherp-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/churcherp-512.png", sizes: "512x512", type: "image/png" },
    ],
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
          dangerouslySetInnerHTML={{ __html: installPromptBootstrapScript }}
        />
      </head>
      <body>
        <AppThemeProvider>
          <MusicNotationProvider>
            <SongRenderPreferencesProvider>
              <AppShell actor={actor}>{children}</AppShell>
            </SongRenderPreferencesProvider>
          </MusicNotationProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
