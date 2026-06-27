"use client";

import type { OpenSheetMusicDisplay as OpenSheetMusicDisplayInstance } from "opensheetmusicdisplay";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import {
  formatMusicalKey,
  getKeysForMode,
  getKeyTransposition,
  isMusicalKey,
  transposeChord,
} from "../music/musical-key";
import { useMusicNotation } from "./music-notation-provider";
import { buildSongDocumentFileStem } from "./song-document-file-name";

type MusicXmlScoreViewerProps = {
  collection: string | null;
  collectionNumber: number | null;
  copyright: string | null;
  defaultKey: string | null;
  title: string;
  sourceUrl: string;
};

export type MusicXmlScoreViewerHandle = {
  downloadPdf: () => Promise<void>;
  openDocument: () => void;
  openFullscreen: () => void;
};

const DEFAULT_SCORE_ZOOM = 1;
const MOBILE_SCORE_MEDIA_QUERY = "(max-width: 720px), (pointer: coarse)";
const MOBILE_SCORE_RENDER_WIDTH = 1120;
const MOBILE_DEFAULT_SCORE_ZOOM = 0.4;
const DEFAULT_MEASURES_PER_LINE = 4;
const DEFAULT_LYRICS_SPACING = 1;
const MIN_SCORE_ZOOM = 0.2;
const MAX_SCORE_ZOOM = 1.8;
const SCORE_ZOOM_STEP = 0.1;
const SCORE_LAYOUT_UPDATE_DELAY = 180;

function applyScoreTransposition(
  osmd: OpenSheetMusicDisplayInstance,
  semitones: number,
) {
  osmd.Sheet.Transpose = semitones;
  osmd.updateGraphic();
  osmd.render();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clampScoreZoom(value: number) {
  const roundedValue = Math.round(value * 100) / 100;

  return Math.min(MAX_SCORE_ZOOM, Math.max(MIN_SCORE_ZOOM, roundedValue));
}

function applySvgDisplayWidth(
  container: HTMLElement | null,
  width: number,
  zoom: number,
) {
  if (!container || width <= 0) {
    return;
  }

  const scaledWidth = Math.round(width * zoom);

  container.style.width = `${scaledWidth}px`;
  container.style.minWidth = `${scaledWidth}px`;

  container.querySelectorAll("svg").forEach((svgElement) => {
    if (!(svgElement instanceof SVGSVGElement)) {
      return;
    }

    svgElement.style.display = "block";
    svgElement.style.width = `${scaledWidth}px`;
    svgElement.style.minWidth = `${scaledWidth}px`;
    svgElement.style.height = "auto";
  });
}

async function loadSvgImage(svg: SVGSVGElement) {
  const serializer = new XMLSerializer();
  const clonedSvg = svg.cloneNode(true);

  if (!(clonedSvg instanceof SVGSVGElement)) {
    throw new Error("Invalid SVG element.");
  }

  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const { width, height } = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const intrinsicWidth = width || viewBox.width;
  const intrinsicHeight = height || viewBox.height;

  if (!intrinsicWidth || !intrinsicHeight) {
    throw new Error("The score SVG has no measurable dimensions.");
  }

  if (!clonedSvg.getAttribute("viewBox") && intrinsicWidth && intrinsicHeight) {
    clonedSvg.setAttribute("viewBox", `0 0 ${intrinsicWidth} ${intrinsicHeight}`);
  }

  clonedSvg.setAttribute("width", `${intrinsicWidth}`);
  clonedSvg.setAttribute("height", `${intrinsicHeight}`);

  const svgMarkup = serializer.serializeToString(clonedSvg);
  const svgBlob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8",
  });
  const blobUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();

      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () =>
        reject(new Error("The score SVG could not be converted to an image."));
      nextImage.src = blobUrl;
    });

    return { image, width: intrinsicWidth, height: intrinsicHeight };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export const MusicXmlScoreViewer = forwardRef<
  MusicXmlScoreViewerHandle,
  MusicXmlScoreViewerProps
>(function MusicXmlScoreViewer(
  { collection, collectionNumber, copyright, defaultKey, title, sourceUrl },
  ref,
) {
  const { notation } = useMusicNotation();
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenSheetRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplayInstance | null>(null);
  const [status, setStatus] = useState("Chargement de la partition…");
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenMarkup, setFullscreenMarkup] = useState("");
  const [isMobileRendering, setIsMobileRendering] = useState<boolean | null>(
    null,
  );
  const isMobileRenderingRef = useRef<boolean | null>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [measuresPerLine, setMeasuresPerLine] = useState(
    DEFAULT_MEASURES_PER_LINE,
  );
  const [lyricsSpacing, setLyricsSpacing] = useState(DEFAULT_LYRICS_SPACING);
  const [appliedMeasuresPerLine, setAppliedMeasuresPerLine] = useState(
    DEFAULT_MEASURES_PER_LINE,
  );
  const [appliedLyricsSpacing, setAppliedLyricsSpacing] = useState(
    DEFAULT_LYRICS_SPACING,
  );
  const [zoom, setZoom] = useState(DEFAULT_SCORE_ZOOM);
  const canonicalDefaultKey =
    defaultKey && isMusicalKey(defaultKey) ? defaultKey : null;
  const [selectedKey, setSelectedKey] = useState(canonicalDefaultKey ?? "");
  const [manualOffset, setManualOffset] = useState(0);
  const transposeBy = canonicalDefaultKey
    ? getKeyTransposition(canonicalDefaultKey, selectedKey)
    : manualOffset;
  const transposeByRef = useRef(transposeBy);
  const displayedKey = canonicalDefaultKey
    ? selectedKey
    : defaultKey
      ? transposeChord(defaultKey, manualOffset)
      : null;
  const isResetDisabled = transposeBy === 0 && manualOffset === 0;
  const renderWidth =
    isMobileRendering === null
      ? 0
      : isMobileRendering
        ? MOBILE_SCORE_RENDER_WIDTH
        : stageWidth;
  const defaultZoom = isMobileRendering
    ? MOBILE_DEFAULT_SCORE_ZOOM
    : DEFAULT_SCORE_ZOOM;

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_SCORE_MEDIA_QUERY);

    function updateRenderingMode() {
      const nextIsMobileRendering = mediaQuery.matches;

      if (isMobileRenderingRef.current === nextIsMobileRendering) {
        return;
      }

      isMobileRenderingRef.current = nextIsMobileRendering;
      setIsMobileRendering(nextIsMobileRendering);
      setZoom(
        nextIsMobileRendering
          ? MOBILE_DEFAULT_SCORE_ZOOM
          : DEFAULT_SCORE_ZOOM,
      );
    }

    updateRenderingMode();
    mediaQuery.addEventListener("change", updateRenderingMode);

    return () => mediaQuery.removeEventListener("change", updateRenderingMode);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAppliedMeasuresPerLine(measuresPerLine);
      setAppliedLyricsSpacing(lyricsSpacing);
    }, SCORE_LAYOUT_UPDATE_DELAY);

    return () => window.clearTimeout(timeout);
  }, [lyricsSpacing, measuresPerLine]);

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

      setStageWidth(Math.floor(entry.contentRect.width));
    });

    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      async downloadPdf() {
        const container = containerRef.current;

        if (!container) {
          throw new Error("The score is not ready yet.");
        }

        const svgElements = Array.from(container.querySelectorAll("svg"));

        if (svgElements.length === 0) {
          throw new Error("The score has not been rendered yet.");
        }

        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({
          compress: true,
          format: "a4",
          orientation: "portrait",
          unit: "mm",
        });

        const margin = 10;
        const usableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
        const usableHeight = pdf.internal.pageSize.getHeight() - margin * 2;
        let isFirstPage = true;

        for (const svg of svgElements) {
          const { image, width, height } = await loadSvgImage(svg);
          const sourceCanvas = document.createElement("canvas");
          const sourceContext = sourceCanvas.getContext("2d");

          if (!sourceContext) {
            throw new Error("Canvas 2D context is unavailable.");
          }

          sourceCanvas.width = Math.ceil(width * 2);
          sourceCanvas.height = Math.ceil(height * 2);
          sourceContext.scale(2, 2);
          sourceContext.fillStyle = "#fffdf7";
          sourceContext.fillRect(0, 0, width, height);
          sourceContext.drawImage(image, 0, 0, width, height);

          const pixelsPerMm = sourceCanvas.width / usableWidth;
          const maxSliceHeightPx = usableHeight * pixelsPerMm;

          for (
            let offsetY = 0;
            offsetY < sourceCanvas.height;
            offsetY += maxSliceHeightPx
          ) {
            const sliceHeightPx = Math.min(
              maxSliceHeightPx,
              sourceCanvas.height - offsetY,
            );
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = sourceCanvas.width;
            sliceCanvas.height = Math.ceil(sliceHeightPx);

            const sliceContext = sliceCanvas.getContext("2d");

            if (!sliceContext) {
              throw new Error("Canvas 2D context is unavailable.");
            }

            sliceContext.fillStyle = "#fffdf7";
            sliceContext.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            sliceContext.drawImage(
              sourceCanvas,
              0,
              offsetY,
              sourceCanvas.width,
              sliceHeightPx,
              0,
              0,
              sourceCanvas.width,
              sliceHeightPx,
            );

            if (!isFirstPage) {
              pdf.addPage();
            }

            isFirstPage = false;

            pdf.addImage(
              sliceCanvas.toDataURL("image/png"),
              "PNG",
              margin,
              margin,
              usableWidth,
              sliceHeightPx / pixelsPerMm,
              undefined,
              "FAST",
            );
          }
        }

        pdf.save(
          `${buildSongDocumentFileStem(title, collection, collectionNumber)}.pdf`,
        );
      },
      openDocument() {
        const container = containerRef.current;

        if (!container) {
          return;
        }

        const svgMarkup = container.innerHTML;

        if (!svgMarkup) {
          return;
        }

        const popup = window.open("about:blank", "_blank");

        if (!popup || !popup.document) {
          return;
        }

        popup.opener = null;

        popup.document.write(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 24px;
        background: #f3eee4;
        color: #1f2933;
        font-family: Georgia, serif;
      }
      main {
        max-width: 1100px;
        margin: 0 auto;
      }
      .sheet {
        padding: 24px;
        background: #fffdf7;
        box-shadow: 0 18px 50px rgb(24 36 58 / 16%);
      }
      svg {
        display: block;
        width: 100%;
        height: auto;
        margin: 0 auto 24px;
        background: #fffdf7;
      }
      svg:last-child { margin-bottom: 0; }
      @media print {
        body { padding: 0; background: white; }
        .sheet { padding: 0; box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="sheet">${svgMarkup}</div>
    </main>
  </body>
</html>`);
        popup.document.close();
      },
      openFullscreen() {
        const container = containerRef.current;

        if (!container?.innerHTML) {
          return;
        }

        setFullscreenMarkup(container.innerHTML);
        setIsFullscreenOpen(true);
      },
    }),
    [collection, collectionNumber, title],
  );

  useEffect(() => {
    if (!isFullscreenOpen) {
      return;
    }

    const container = containerRef.current;

    if (!container?.innerHTML) {
      return;
    }

    setFullscreenMarkup(container.innerHTML);
  }, [
    appliedLyricsSpacing,
    appliedMeasuresPerLine,
    isFullscreenOpen,
    renderWidth,
    status,
    transposeBy,
  ]);

  useEffect(() => {
    if (!isFullscreenOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFullscreenOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreenOpen]);

  useEffect(() => {
    applySvgDisplayWidth(containerRef.current, renderWidth, zoom);
  }, [renderWidth, zoom, status]);

  useEffect(() => {
    applySvgDisplayWidth(fullscreenSheetRef.current, renderWidth, zoom);
  }, [fullscreenMarkup, isFullscreenOpen, renderWidth, zoom]);

  function shift(step: number) {
    if (!canonicalDefaultKey) {
      setManualOffset((current) => current + step);
      return;
    }

    const options = getKeysForMode(canonicalDefaultKey);
    const currentIndex = options.indexOf(selectedKey as (typeof options)[number]);
    const nextIndex = (currentIndex + step + options.length) % options.length;
    setSelectedKey(options[nextIndex]);
  }

  useEffect(() => {
    let isCancelled = false;
    const container = containerRef.current;

    async function renderScore() {
      if (!container || renderWidth <= 0) {
        return;
      }

      setStatus("Chargement de la partition…");
      container.innerHTML = "";
      osmdRef.current = null;

      try {
        const [
          sourceResponse,
          { OpenSheetMusicDisplay, TransposeCalculator },
        ] = await Promise.all([
          fetch(sourceUrl),
          import("opensheetmusicdisplay"),
        ]);

        if (!sourceResponse.ok) {
          throw new Error("MusicXML source could not be loaded.");
        }

        const musicXml = await sourceResponse.text();

        if (isCancelled) {
          return;
        }

        container.style.width = `${Math.round(renderWidth)}px`;

        const osmd = new OpenSheetMusicDisplay(container, {
          autoResize: false,
          backend: "svg",
          defaultColorMusic: "#1f2933",
          defaultColorTitle: "#1f2933",
          defaultFontFamily: "Arial",
          drawComposer: false,
          drawCredits: true,
          drawLyricist: false,
          drawMeasureNumbersOnlyAtSystemStart: true,
          drawPartNames: false,
          drawTitle: true,
          drawingParameters: "compact",
          measureNumberInterval: 4,
          pageBackgroundColor: "#fffdf7",
        });

        osmd.TransposeCalculator = new TransposeCalculator();
        await osmd.load(musicXml, title);

        if (isCancelled) {
          return;
        }

        osmd.Sheet.TitleString = title;

        if (copyright) {
          osmd.Sheet.CopyrightString = copyright;
        }

        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem =
          appliedMeasuresPerLine;
        osmd.EngravingRules.TitleBottomDistance = 5.5;
        osmd.EngravingRules.LyricsUseXPaddingForLongLyrics = true;
        osmd.EngravingRules.LyricsXPaddingFactorForLongLyrics =
          1.25 * appliedLyricsSpacing;
        osmd.EngravingRules.MaximumLyricsElongationFactor = 2.4;
        osmd.EngravingRules.BetweenSyllableMinimumDistance =
          0.8 * appliedLyricsSpacing;

        osmdRef.current = osmd;
        applyScoreTransposition(osmd, transposeByRef.current);
        setStatus("");
      } catch (error) {
        console.error(error);

        if (!isCancelled) {
          setStatus("Impossible d’afficher cette partition MusicXML.");
        }
      }
    }

    void renderScore();

    return () => {
      isCancelled = true;
      osmdRef.current = null;

      if (container) {
        container.innerHTML = "";
      }
    };
  }, [
    appliedLyricsSpacing,
    appliedMeasuresPerLine,
    copyright,
    renderWidth,
    sourceUrl,
    title,
  ]);

  useEffect(() => {
    const osmd = osmdRef.current;

    if (!osmd) {
      return;
    }

    transposeByRef.current = transposeBy;
    applyScoreTransposition(osmd, transposeBy);
  }, [transposeBy]);

  function changeZoom(step: number) {
    setZoom((current) => clampScoreZoom(current + step));
  }

  function renderZoomControls(className?: string) {
    return (
      <div className={className ?? "song-score-viewer__zoom-controls"}>
        <span>Zoom</span>
        <div className="song-score-viewer__zoom-buttons">
          <button
            aria-label="Réduire le zoom de la partition"
            disabled={zoom <= MIN_SCORE_ZOOM}
            onClick={() => changeZoom(-SCORE_ZOOM_STEP)}
            type="button"
          >
            −
          </button>
          <button
            aria-label="Réinitialiser le zoom de la partition"
            onClick={() => setZoom(defaultZoom)}
            type="button"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            aria-label="Augmenter le zoom de la partition"
            disabled={zoom >= MAX_SCORE_ZOOM}
            onClick={() => changeZoom(SCORE_ZOOM_STEP)}
            type="button"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="transpose-toolbar transpose-toolbar--score">
        <div>
          <span>Transposition temporaire</span>
          <small>La partition affichée est transposée par OSMD.</small>
        </div>
        <div className="transpose-toolbar__controls">
          <button
            aria-label="Descendre d’un demi-ton"
            onClick={() => shift(-1)}
            type="button"
          >
            −
          </button>
          {canonicalDefaultKey ? (
            <select
              aria-label="Tonalité affichée"
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
            >
              {getKeysForMode(canonicalDefaultKey).map((key) => (
                <option key={key} value={key}>
                  {formatMusicalKey(key, notation)}
                </option>
              ))}
            </select>
          ) : (
            <strong>
              {displayedKey
                ? formatMusicalKey(displayedKey, notation)
                : `${manualOffset >= 0 ? "+" : ""}${manualOffset}`}
            </strong>
          )}
          <button
            className="transpose-toolbar__reset"
            aria-label="Réinitialiser la transposition"
            disabled={isResetDisabled}
            onClick={() => {
              setSelectedKey(canonicalDefaultKey ?? "");
              setManualOffset(0);
            }}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M19 8a7 7 0 1 0 1.4 7.2" />
              <path d="M19 4v5h-5" />
            </svg>
          </button>
          <button
            aria-label="Monter d’un demi-ton"
            onClick={() => shift(1)}
            type="button"
          >
            +
          </button>
        </div>
      </div>

      <div ref={stageRef} className="song-document-viewer__stage">
        <div className="song-score-viewer__display-controls">
          <div className="song-score-viewer__display-fields">
            <label className="song-score-viewer__field">
              <span className="song-score-viewer__field-heading">
                <span>Mesures par ligne</span>
                <output>{measuresPerLine}</output>
              </span>
              <input
                aria-label="Nombre de mesures par ligne"
                max="6"
                min="2"
                onChange={(event) => {
                  setMeasuresPerLine(Number(event.target.value));
                }}
                step="1"
                type="range"
                value={measuresPerLine}
              />
            </label>
            <label className="song-score-viewer__field">
              <span className="song-score-viewer__field-heading">
                <span>Espacement des paroles</span>
                <output>{Math.round(lyricsSpacing * 100)} %</output>
              </span>
              <input
                aria-label="Espacement horizontal des paroles"
                max="1.8"
                min="0.6"
                onChange={(event) => {
                  setLyricsSpacing(Number(event.target.value));
                }}
                step="0.1"
                type="range"
                value={lyricsSpacing}
              />
            </label>
            {renderZoomControls()}
          </div>
        </div>
        <div className="song-document-viewer__status-row">
          {status ? (
            <p className="song-document-viewer__status">{status}</p>
          ) : (
            <p className="song-document-viewer__status song-document-viewer__status--ready">
              Partition rendue en MusicXML.
            </p>
          )}
        </div>
        <div className="song-score-viewer__viewport">
          <div
            ref={containerRef}
            aria-label={`Partition MusicXML de ${title}`}
            className="song-score-viewer__score"
          />
        </div>
        {copyright ? (
          <footer className="song-score-viewer__sheet-footer">
            {copyright}
          </footer>
        ) : null}
      </div>
      {isFullscreenOpen ? (
        <div
          aria-modal="true"
          className="song-score-fullscreen"
          role="dialog"
        >
          <div
            className="song-score-fullscreen__backdrop"
            onClick={() => setIsFullscreenOpen(false)}
          />
          <div className="song-score-fullscreen__panel">
            <header className="song-score-fullscreen__header">
              <div className="song-score-fullscreen__header-actions">
                {renderZoomControls("song-score-viewer__zoom-controls song-score-viewer__zoom-controls--fullscreen")}
                <button
                  aria-label="Fermer le plein écran"
                  className="icon-button"
                  onClick={() => setIsFullscreenOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>
            </header>
            <div className="song-score-fullscreen__body">
              <div className="song-score-fullscreen__viewport">
                <div
                  ref={fullscreenSheetRef}
                  aria-label={`Partition MusicXML en plein écran de ${title}`}
                  className="song-score-fullscreen__sheet"
                  dangerouslySetInnerHTML={{ __html: fullscreenMarkup }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
});
