import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageTransitionStatus } from "./page-transition-status";

describe("page transition status", () => {
  it("renders an accessible full-page saving state", () => {
    const markup = renderToStaticMarkup(
      <PageTransitionStatus
        detail="Les modifications sont en cours d’enregistrement."
        isVisible
        label="Enregistrement du chant…"
      />,
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Enregistrement du chant…");
  });

  it("renders nothing while inactive", () => {
    expect(
      renderToStaticMarkup(
        <PageTransitionStatus
          isVisible={false}
          label="Enregistrement…"
        />,
      ),
    ).toBe("");
  });
});
