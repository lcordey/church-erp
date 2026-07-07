import { describe, expect, it } from "vitest";

import { resolvePdfRenderScale } from "./song-pdf-viewer";

import { GET as getPdfJsWasm } from "@/app/pdfjs/wasm/[file]/route";

describe("resolvePdfRenderScale", () => {
  it("keeps the preferred scale for ordinary pages", () => {
    expect(
      resolvePdfRenderScale({
        devicePixelRatio: 2,
        displayScale: 0.8,
        viewportHeight: 792,
        viewportWidth: 612,
      }),
    ).toBe(1.6);
  });

  it("caps the render scale when the target canvas would be too large", () => {
    expect(
      resolvePdfRenderScale({
        devicePixelRatio: 2,
        displayScale: 1.5,
        viewportHeight: 6000,
        viewportWidth: 4000,
      }),
    ).toBeCloseTo(0.418, 3);
  });

  it("serves the PDF.js JBIG2 decoder used by scanned PDF pages", async () => {
    const response = await getPdfJsWasm(new Request("http://localhost"), {
      params: Promise.resolve({ file: "jbig2.wasm" }),
    });
    const body = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/wasm");
    expect(Array.from(body.slice(0, 4))).toEqual([0, 97, 115, 109]);
  });
});
