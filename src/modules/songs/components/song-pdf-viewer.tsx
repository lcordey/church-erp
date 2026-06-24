"use client";

import { useEffect, useRef, useState } from "react";

type SongPdfViewerProps = {
  copyright: string | null;
  sourceUrl: string;
  title: string;
};

export function SongPdfViewer({
  copyright,
  sourceUrl,
  title,
}: SongPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Chargement du PDF…");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [stageWidth, setStageWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setStageWidth(Math.floor(entry.contentRect.width));
    });

    observer.observe(container);

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

      setStatus("Chargement du PDF…");
      setPageCount(null);
      container.replaceChildren();

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

        loadingTask = getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;

        if (isCancelled) {
          return;
        }

        setPageCount(pdf.numPages);

        const pageSpacing = stageWidth < 720 ? 16 : 24;
        const targetWidth = Math.max(stageWidth - pageSpacing * 2, 220);
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);

          if (isCancelled) {
            break;
          }

          const viewport = page.getViewport({ scale: 1 });
          const displayScale = targetWidth / viewport.width;
          const scaledViewport = page.getViewport({
            scale: displayScale * outputScale,
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
          canvas.style.width = `${Math.round(viewport.width * displayScale)}px`;
          canvas.style.height = `${Math.round(viewport.height * displayScale)}px`;

          pageElement.append(canvas);
          container.append(pageElement);

          await page.render({
            canvas,
            canvasContext: context,
            viewport: scaledViewport,
          }).promise;
        }

        if (!isCancelled) {
          setStatus("");
        }
      } catch (error) {
        console.error(error);

        if (!isCancelled) {
          setStatus("Impossible d’afficher ce PDF sur cet appareil.");
          container.replaceChildren();
        }
      }
    }

    void renderPdf();

    return () => {
      isCancelled = true;
      void loadingTask?.destroy();
      worker.terminate();

      if (container) {
        container.replaceChildren();
      }
    };
  }, [sourceUrl, stageWidth]);

  return (
    <div className="song-document-viewer__stage song-document-viewer__stage--pdf">
      <div className="song-document-viewer__status-row">
        <p className="song-document-viewer__status">
          {status ||
            (pageCount ? `${pageCount} page${pageCount > 1 ? "s" : ""}` : "")}
        </p>
      </div>
      <header className="song-document-sheet__header">
        <h2 className="song-document-sheet__title">{title}</h2>
      </header>
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
}
