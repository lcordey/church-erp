import type { Metadata } from "next";

import { MusicNotationProvider } from "@/src/modules/songs/components/music-notation-provider";
import { MusicNotationToggle } from "@/src/modules/songs/components/music-notation-toggle";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Répertoire de louange",
    template: "%s · Répertoire de louange",
  },
  description: "Catalogue public des chants de l’équipe louange.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <MusicNotationProvider>
          {children}
          <MusicNotationToggle />
        </MusicNotationProvider>
      </body>
    </html>
  );
}
