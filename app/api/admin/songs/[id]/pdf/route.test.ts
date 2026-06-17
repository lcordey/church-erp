import { beforeEach, describe, expect, it, vi } from "vitest";

const { attachSongPdf, deleteAttachedSongPdf } = vi.hoisted(() => ({
  attachSongPdf: vi.fn(),
  deleteAttachedSongPdf: vi.fn(),
}));

vi.mock("@/src/modules/songs/services/admin-song-management", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/modules/songs/services/admin-song-management")
  >("@/src/modules/songs/services/admin-song-management");

  return {
    ...actual,
    attachSongPdf,
    deleteAttachedSongPdf,
  };
});

import { DELETE, PUT } from "./route";

const context = {
  params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
};

describe("/api/admin/songs/:id/pdf", () => {
  beforeEach(() => {
    attachSongPdf.mockReset();
    deleteAttachedSongPdf.mockReset();
  });

  it("attaches a PDF file", async () => {
    attachSongPdf.mockResolvedValue({
      id: "song-id",
      pdfSource: { downloadUrl: "/api/songs/chant/pdf" },
    });
    const body = new FormData();
    const file = new File(["pdf"], "partition.pdf", {
      type: "application/pdf",
    });
    body.append("pdf", file);

    const response = await PUT(
      new Request("http://localhost", { method: "PUT", body }),
      context,
    );

    expect(response.status).toBe(200);
    expect(attachSongPdf).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      expect.objectContaining({
        name: "partition.pdf",
        size: file.size,
        type: "application/pdf",
      }),
    );
  });

  it("rejects a request without a PDF file", async () => {
    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: new FormData(),
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(attachSongPdf).not.toHaveBeenCalled();
  });

  it("deletes the attached PDF", async () => {
    deleteAttachedSongPdf.mockResolvedValue({ id: "song-id", pdfSource: null });

    const response = await DELETE(new Request("http://localhost"), context);

    expect(response.status).toBe(200);
    expect(deleteAttachedSongPdf).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});
