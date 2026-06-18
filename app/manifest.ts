import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChurchERP",
    short_name: "ChurchERP",
    description: "Catalogue public des chants de l’équipe louange.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ec",
    theme_color: "#315b78",
    icons: [
      {
        src: "/icons/churcherp-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/churcherp-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
