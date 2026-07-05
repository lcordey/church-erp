import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ReorderItemActions } from "./reorder-item-actions";

describe("reorder item actions", () => {
  it("renders the same arrow controls without a remove action by default", () => {
    const markup = renderToStaticMarkup(
      <ReorderItemActions
        downLabel="Descendre la source"
        isDownDisabled={false}
        isUpDisabled
        onMoveDown={vi.fn()}
        onMoveUp={vi.fn()}
        upLabel="Monter la source"
      />,
    );

    expect(markup).toContain("↑");
    expect(markup).toContain("↓");
    expect(markup).not.toContain("×");
    expect(markup).not.toContain(">Monter<");
    expect(markup).not.toContain(">Descendre<");
  });

  it("adds a remove action when requested by a setlist", () => {
    const markup = renderToStaticMarkup(
      <ReorderItemActions
        downLabel="Descendre le chant"
        isDownDisabled
        isUpDisabled={false}
        onMoveDown={vi.fn()}
        onMoveUp={vi.fn()}
        onRemove={vi.fn()}
        removeLabel="Retirer le chant"
        upLabel="Monter le chant"
      />,
    );

    expect(markup).toContain("×");
    expect(markup).toContain('aria-label="Retirer le chant"');
  });
});
