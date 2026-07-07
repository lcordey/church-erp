import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PublicSongDetail } from "../types/public-song";
import { SongDetailView } from "./song-detail-view";

const song: PublicSongDetail = {
  id: "song-id",
  title: "Mon chant",
  slug: "mon-chant",
  author: null,
  copyright: null,
  defaultKey: null,
  collection: "LeMont",
  collectionNumber: null,
  sourcePageUrl: null,
  spotifyUrl: null,
  youtubeUrl: null,
  chordProContent: null,
  musicXmlSource: null,
  pdfSource: {
    downloadUrl: "/api/songs/mon-chant/pdf",
    fileName: "partition.pdf",
    fileSizeBytes: 100,
    mimeType: "application/pdf",
  },
};

describe("SongDetailView source controls", () => {
  it("offers login when a protected PDF is the only source", () => {
    const markup = renderToStaticMarkup(
      <SongDetailView
        canAccessScores={false}
        loginRedirectTo="/chants/mon-chant"
        song={song}
      />,
    );

    expect(markup).toContain("PDF · Se connecter");
    expect(markup).toContain(
      "/login?redirectTo=%2Fchants%2Fmon-chant",
    );
    expect(markup).toContain(
      "Connecte-toi pour consulter la partition de ce chant.",
    );
  });

  it("renders a single accessible source as a label instead of a select", () => {
    const markup = renderToStaticMarkup(
      <SongDetailView
        canAccessScores={false}
        song={{
          ...song,
          chordProContent: "Paroles",
          pdfSource: null,
        }}
      />,
    );

    expect(markup).toContain("Paroles");
    expect(markup).toContain("source unique");
    expect(markup).toContain(
      "Une seule source est disponible pour ce chant.",
    );
    expect(markup).not.toContain("<select");
  });
});
