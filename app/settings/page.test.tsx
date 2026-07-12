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
    expect(markup.indexOf("<h2>Application</h2>")).toBeGreaterThan(
      markup.indexOf("<h2>Lecture des chants</h2>"),
    );
    expect(markup).toContain("Installer l’application");
    expect(markup).toContain("Notifications");
    expect(markup).toContain("Ajout à un événement");
    expect(markup).toContain("Setlist d’un événement");
    expect(markup).toContain("Activer les notifications");
  });
});
