import { describe, expect, it } from "vitest";

import { createSetlistShareData, createSetlistShareUrl } from "./setlist-share-actions";

describe("setlist share links", () => {
  const origin = "https://louange.example";
  const setlistId = "11111111-1111-4111-8111-111111111111";
  const url = "https://louange.example/setlist/11111111-1111-4111-8111-111111111111/play";

  it("creates a direct link to the player", () => {
    expect(createSetlistShareUrl(origin, setlistId)).toBe(url);
  });

  it("includes the title and link in the shared message", () => {
    const shareData = createSetlistShareData(origin, setlistId, "Dimanche matin");

    expect(shareData).toMatchObject({
      title: "Dimanche matin",
      url,
    });
    expect(shareData.text).toContain(url);
  });
});
