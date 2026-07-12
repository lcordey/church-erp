import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EventDescription } from "./event-description";

describe("EventDescription", () => {
  it("renders the three supported Markdown heading levels", () => {
    const markup = renderToStaticMarkup(<EventDescription content={"# Titre\n## Sous-titre\n### Intertitre"} />);

    expect(markup).toContain("<h2>Titre</h2>");
    expect(markup).toContain("<h3>Sous-titre</h3>");
    expect(markup).toContain("<h4>Intertitre</h4>");
  });
});
