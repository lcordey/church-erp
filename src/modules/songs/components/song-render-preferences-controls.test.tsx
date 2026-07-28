import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SongRenderPreferencesControls } from "./song-render-preferences-controls";

describe("song render preferences controls", () => {
  it("shows source priority in general settings", () => {
    const markup = renderToStaticMarkup(<SongRenderPreferencesControls />);

    expect(markup).toContain('aria-label="Ordre de priorité des sources"');
  });

  it("hides source priority in chord reading settings", () => {
    const markup = renderToStaticMarkup(
      <SongRenderPreferencesControls showSourcePriority={false} />,
    );

    expect(markup).not.toContain('aria-label="Ordre de priorité des sources"');
    expect(markup).toContain("Couleur des accords");
    expect(markup).toContain("Bordeaux");
    expect(markup).toContain("Sauge");
  });
});
