import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SongRenderPreferencesControls } from "./song-render-preferences-controls";

describe("song render preferences controls", () => {
  it("shows source priority in general settings", () => {
    const markup = renderToStaticMarkup(<SongRenderPreferencesControls />);

    expect(markup).toContain("Source d’ouverture");
  });

  it("hides source priority in chord reading settings", () => {
    const markup = renderToStaticMarkup(
      <SongRenderPreferencesControls showSourcePriority={false} />,
    );

    expect(markup).not.toContain("Source d’ouverture");
    expect(markup).toContain("Couleur des accords");
  });
});
