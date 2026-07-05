import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Loading from "./loading";

describe("application loading state", () => {
  it("shows immediate feedback while navigating between sections", () => {
    const markup = renderToStaticMarkup(<Loading />);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Ouverture…");
    expect(markup).toContain("La page va s’afficher dans un instant.");
  });
});
