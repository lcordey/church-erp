import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SettingsPage from "./page";

describe("settings page", () => {
  it("shows the theme choice before the other settings", () => {
    const markup = renderToStaticMarkup(<SettingsPage />);

    expect(markup.indexOf("<h2>Thème</h2>")).toBeLessThan(
      markup.indexOf("<h2>Notation musicale</h2>"),
    );
    expect(markup.indexOf("<h2>Thème</h2>")).toBeLessThan(
      markup.indexOf("<h2>Lecture des chants</h2>"),
    );
  });
});
