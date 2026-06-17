import { beforeEach, describe, expect, it, vi } from "vitest";

const { downloadSongPdf, getPublicSongPdfBySlug } = vi.hoisted(() => ({
  downloadSongPdf: vi.fn(),
  getPublicSongPdfBySlug: vi.fn(),
}));

vi.mock("@/src/infrastructure/storage/song-pdf-storage", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/infrastructure/storage/song-pdf-storage")
  >("@/src/infrastructure/storage/song-pdf-storage");

  return {
    ...actual,
    downloadSongPdf,
  };
});

vi.mock("@/src/modules/songs/services/public-song-catalog", () => ({
  getPublicSongPdfBySlug,
}));

import { GET } from "./route";

describe("GET /api/songs/:slug/pdf", () => {
  beforeEach(() => {
    downloadSongPdf.mockReset();
    getPublicSongPdfBySlug.mockReset();
  });

  it("streams a public song PDF", async () => {
    getPublicSongPdfBySlug.mockResolvedValue({
      storagePath: "songs/song-id/score.pdf",
      fileName: "partition.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 3,
      downloadUrl: "/api/songs/chant/pdf",
    });
    downloadSongPdf.mockResolvedValue(
      new Response("pdf", {
        headers: { "content-type": "application/pdf" },
      }),
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "chant" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(
      "partition.pdf",
    );
    expect(await response.text()).toBe("pdf");
  });

  it("returns 404 when no PDF source exists", async () => {
    getPublicSongPdfBySlug.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "chant" }),
    });

    expect(response.status).toBe(404);
    expect(downloadSongPdf).not.toHaveBeenCalled();
  });
});
