import { afterEach, describe, expect, it, vi } from "vitest";

import {
  downloadSongPdf,
  StorageObjectNotFoundError,
  StorageRequestError,
} from "./song-pdf-storage";

describe("song PDF storage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function configureStorage() {
    vi.stubEnv("SUPABASE_URL", "https://supabase.example");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  }

  it("downloads an absolute storage URL without nesting it under the bucket URL", async () => {
    configureStorage();
    const fetchMock = vi.fn().mockResolvedValue(new Response("pdf"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await downloadSongPdf(
      "https://cdn.example/songs/chaine-d-amour.pdf",
    );

    expect(await response.text()).toBe("pdf");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cdn.example/songs/chaine-d-amour.pdf",
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });

  it("treats Supabase 400 not found responses as missing storage objects", async () => {
    configureStorage();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"message":"The resource was not found"}', {
          status: 400,
        }),
      ),
    );

    await expect(downloadSongPdf("songs/song-id/score.pdf")).rejects.toBeInstanceOf(
      StorageObjectNotFoundError,
    );
  });

  it("keeps unexpected storage failures distinct from missing objects", async () => {
    configureStorage();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"message":"upstream failed"}', {
          status: 503,
        }),
      ),
    );

    await expect(downloadSongPdf("songs/song-id/score.pdf")).rejects.toMatchObject({
      status: 503,
      responseBody: '{"message":"upstream failed"}',
    } satisfies Partial<StorageRequestError>);
  });
});
