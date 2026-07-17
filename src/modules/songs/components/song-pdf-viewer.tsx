"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const MAX_PDF_CANVAS_DIMENSION = 4096;
const MAX_PDF_CANVAS_PIXELS = 4_194_304;

type SongPdfViewerProps = {
  copyright: string | null;
  sourceUrl: string;
  title: string;
  zoom: number;
};

export type SongPdfViewerHandle = {
  commitZoom: () => number | null;
  previewZoom: (zoom: number) => void;
};

type PdfRenderScaleOptions = {
  devicePixelRatio: number;
  displayScale: number;
  viewportHeight: number;
  viewportWidth: number;
};

export function getPdfDocumentOptions(pdfData: ArrayBuffer) {
  return {
    data: pdfData,
    isImageDecoderSupported: false,
    isOffscreenCanvasSupported: false,
    wasmUrl: "/pdfjs/wasm/",
  };
}

function applyPdfCanvasZoom(container: HTMLElement | null, zoom: number) {
  if (!container) {
    return;
  }

  container.querySelectorAll("canvas").forEach((canvas) => {
    const baseWidth = Number(canvas.dataset.baseWidth);
    const baseHeight = Number(canvas.dataset.baseHeight);

    if (!Number.isFinite(baseWidth) || !Number.isFinite(baseHeight)) {
      return;
    }

    canvas.style.width = `${Math.round(baseWidth * zoom)}px`;
    canvas.style.height = `${Math.round(baseHeight * zoom)}px`;
  });
}

export function resolvePdfRenderScale({
  devicePixelRatio,
  displayScale,
  viewportHeight,
  viewportWidth,
}: PdfRenderScaleOptions) {
  const preferredScale = displayScale * Math.min(devicePixelRatio || 1, 2);
  const maxScaleByWidth = MAX_PDF_CANVAS_DIMENSION / viewportWidth;
  const maxScaleByHeight = MAX_PDF_CANVAS_DIMENSION / viewportHeight;
  const maxScaleByPixels = Math.sqrt(
    MAX_PDF_CANVAS_PIXELS / (viewportWidth * viewportHeight),
  );

  return Math.max(
    0.1,
    Math.min(
      preferredScale,
      maxScaleByWidth,
      maxScaleByHeight,
      maxScaleByPixels,
    ),
  );
}

export const SongPdfViewer = forwardRef<SongPdfViewerHandle, SongPdfViewerProps>(
function SongPdfViewer({
  copyright,
  sourceUrl,
  title,
  zoom,
}, ref) {
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Chargement du PDF…");
  const [stageWidth, setStageWidth] = useState(0);
  const zoomRef = useRef(zoom);
  const previewZoomFrameRef = useRef<number | null>(null);
  const previewZoomRef = useRef<number | null>(null);

  useEffect(() => {
    zoomRef.current = zoom;
    applyPdfCanvasZoom(containerRef.current, zoom);
  }, [zoom]);

  function previewZoom(nextZoom: number) {
    zoomRef.current = nextZoom;
    previewZoomRef.current = nextZoom;

    if (previewZoomFrameRef.current !== null) {
      return;
    }

    previewZoomFrameRef.current = window.requestAnimationFrame(() => {
      previewZoomFrameRef.current = null;

      if (previewZoomRef.current !== null) {
        applyPdfCanvasZoom(containerRef.current, previewZoomRef.current);
      }
    });
  }

  function commitZoom() {
    if (previewZoomFrameRef.current !== null) {
      window.cancelAnimationFrame(previewZoomFrameRef.current);
      previewZoomFrameRef.current = null;
    }

    const nextZoom = previewZoomRef.current;

    if (nextZoom !== null) {
      applyPdfCanvasZoom(containerRef.current, nextZoom);
      previewZoomRef.current = null;
    }

    return nextZoom;
  }

  useImperativeHandle(ref, () => ({ commitZoom, previewZoom }));

  useEffect(() => {
    return () => {
      if (previewZoomFrameRef.current !== null) {
        window.cancelAnimationFrame(previewZoomFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const nextWidth = Math.floor(entry.contentRect.width);

      setStageWidth((current) => (current === nextWidth ? current : nextWidth));
    });

    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!stageWidth) {
      return;
    }

    let isCancelled = false;
    const container = containerRef.current;
    const worker = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
    let loadingTask:
      | import("pdfjs-dist").PDFDocumentLoadingTask
      | undefined;

    async function renderPdf() {
      if (!container) {
        return;
      }

      const isInitialRender = container.childElementCount === 0;
      const nextPages = document.createDocumentFragment();

      if (isInitialRender) {
        setStatus("Chargement du PDF…");
      }

      try {
        const [{ GlobalWorkerOptions, getDocument }] = await Promise.all([
          import("pdfjs-dist"),
        ]);

        GlobalWorkerOptions.workerPort = worker;

        const response = await fetch(sourceUrl, { credentials: "same-origin" });

        if (!response.ok) {
          throw new Error("PDF source could not be loaded.");
        }

        const pdfData = await response.arrayBuffer();

        if (isCancelled) {
          return;
        }

        loadingTask = getDocument(getPdfDocumentOptions(pdfData));
        const pdf = await loadingTask.promise;

        if (isCancelled) {
          return;
        }

        const pageSpacing = stageWidth < 720 ? 16 : 24;
        const targetWidth = Math.max(stageWidth - pageSpacing * 2, 220);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);

          if (isCancelled) {
            break;
          }

          const viewport = page.getViewport({ scale: 1 });
          const displayScale = targetWidth / viewport.width;
          const renderScale = resolvePdfRenderScale({
            devicePixelRatio: window.devicePixelRatio || 1,
            displayScale,
            viewportHeight: viewport.height,
            viewportWidth: viewport.width,
          });
          const scaledViewport = page.getViewport({
            scale: renderScale,
          });

          const pageElement = document.createElement("figure");
          pageElement.className = "song-pdf-viewer__page";

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Canvas 2D context is unavailable.");
          }

          canvas.width = Math.ceil(scaledViewport.width);
          canvas.height = Math.ceil(scaledViewport.height);
          canvas.dataset.baseWidth = String(
            Math.round(viewport.width * displayScale),
          );
          canvas.dataset.baseHeight = String(
            Math.round(viewport.height * displayScale),
          );
          canvas.style.width = `${canvas.dataset.baseWidth}px`;
          canvas.style.height = `${canvas.dataset.baseHeight}px`;

          pageElement.append(canvas);
          nextPages.append(pageElement);

          await page.render({
            canvas,
            canvasContext: context,
            viewport: scaledViewport,
          }).promise;
          page.cleanup();
        }

        if (!isCancelled) {
          container.replaceChildren(nextPages);
          applyPdfCanvasZoom(container, zoomRef.current);
          setStatus("");
        }
      } catch (error) {
        console.error(error);

        if (!isCancelled) {
          setStatus("Impossible d’afficher ce PDF sur cet appareil.");

          if (isInitialRender) {
            container.replaceChildren();
          }
        }
      }
    }

    void renderPdf();

    return () => {
      isCancelled = true;
      void loadingTask?.destroy();
      worker.terminate();
    };
  }, [sourceUrl, stageWidth]);

  const fallbackDownloadUrl = `${sourceUrl}${sourceUrl.includes("?") ? "&" : "?"}download=1`;

  return (
    <div
      ref={stageRef}
      className="song-document-viewer__stage song-document-viewer__stage--pdf"
    >
      {status ? (
        <div className="song-document-viewer__status-row">
          <p className="song-document-viewer__status">
            {status}
            {status.startsWith("Impossible") ? (
              <>
                {" "}
                <a href={fallbackDownloadUrl}>Télécharger le PDF</a>
              </>
            ) : null}
          </p>
        </div>
      ) : null}
      <div
        ref={containerRef}
        aria-label={`Partition PDF de ${title}`}
        className="song-pdf-viewer__pages"
      />
      {copyright ? (
        <footer className="song-document-sheet__footer">{copyright}</footer>
      ) : null}
    </div>
  );
});
