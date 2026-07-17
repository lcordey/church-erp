"use client";

import type { OpenSheetMusicDisplay as OpenSheetMusicDisplayInstance } from "opensheetmusicdisplay";
import {
  forwardRef,
  useCallback,
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
import {
  analyzeMusicXmlDisplay,
  type MusicXmlDisplayAnalysis,
} from "./music-xml-display";
import { useMusicNotation } from "./music-notation-provider";
import { buildSongDocumentFileStem } from "./song-document-file-name";

type MusicXmlScoreViewerProps = {
  collection: string | null;
  collectionNumber: number | null;
  copyright: string | null;
  defaultKey: string | null;
  onZoomChange?: (zoom: number) => void;
  showSettings?: boolean;
  title: string;
  sourceUrl: string;
};

type ScoreLayout = "pages" | "continuous";
type ScoreStatus = "loading" | "ready" | "error";
type MeasuresPerLine = 4 | 5 | 6;

export type MusicXmlScoreViewerHandle = {
  changeZoom: (step: number) => void;
  commitZoom: () => void;
  downloadPdf: () => Promise<void>;
  openDocument: () => void;
  openFullscreen: () => void;
  previewZoom: (zoom: number) => void;
  setZoom: (zoom: number) => void;
};

const SCORE_RENDER_WIDTH = 920;
const MIN_SCORE_ZOOM = 0.2;
const MAX_SCORE_ZOOM = 1.8;
const SCORE_ZOOM_STEP = 0.1;
const MEASURE_DENSITY: Record<
  MeasuresPerLine,
  {
    spacing: number;
  }
> = {
  4: { spacing: 1 },
  5: { spacing: 0.84 },
  6: { spacing: 0.72 },
};

function clampScoreZoom(value: number) {
  return Math.min(
    MAX_SCORE_ZOOM,
    Math.max(MIN_SCORE_ZOOM, Math.round(value * 100) / 100),
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function applyScoreZoom(container: HTMLElement | null, zoom: number) {
  if (!container) {
    return;
  }

  const displayWidth = Math.round(SCORE_RENDER_WIDTH * zoom);

  container.style.width = `${displayWidth}px`;
  container.style.minWidth = `${displayWidth}px`;

  container.querySelectorAll("svg").forEach((svg) => {
    svg.style.display = "block";
    svg.style.width = `${displayWidth}px`;
    svg.style.minWidth = `${displayWidth}px`;
    svg.style.height = "auto";
  });
}

function prepareScoreForRender(container: HTMLElement) {
  container.style.width = `${SCORE_RENDER_WIDTH}px`;
  container.style.minWidth = `${SCORE_RENDER_WIDTH}px`;
}

function renderTransposedScore(
  osmd: OpenSheetMusicDisplayInstance,
  container: HTMLElement,
  semitones: number,
  zoom: number,
) {
  prepareScoreForRender(container);
  osmd.Sheet.Transpose = semitones;
  osmd.updateGraphic();
  osmd.render();
  applyScoreZoom(container, zoom);
}

function getSvgSize(svg: SVGSVGElement) {
  const viewBox = svg.viewBox.baseVal;
  const bounds = svg.getBoundingClientRect();
  const width = viewBox.width || svg.width.baseVal.value || bounds.width;
  const height = viewBox.height || svg.height.baseVal.value || bounds.height;

  if (!width || !height) {
    throw new Error("The score SVG has no measurable dimensions.");
  }

  return { height, width };
}

async function loadSvgImage(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true);

  if (!(clone instanceof SVGSVGElement)) {
    throw new Error("Invalid SVG element.");
  }

  const { height, width } = getSvgSize(svg);

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;

  const svgBlob = new Blob([new XMLSerializer().serializeToString(clone)], {
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

    return { height, image, width };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function ResetIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M19 8a7 7 0 1 0 1.4 7.2" />
      <path d="M19 4v5h-5" />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4" />
    </svg>
  );
}

export const MusicXmlScoreViewer = forwardRef<
  MusicXmlScoreViewerHandle,
  MusicXmlScoreViewerProps
>(function MusicXmlScoreViewer(
  {
    collection,
    collectionNumber,
    copyright,
    defaultKey,
    onZoomChange,
    showSettings = true,
    title,
    sourceUrl,
  },
  ref,
) {
  const { notation } = useMusicNotation();
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplayInstance | null>(null);
  const sourceAnalysisRef = useRef<{
    analysis: MusicXmlDisplayAnalysis;
    sourceUrl: string;
  } | null>(null);
  const zoomRef = useRef(1);
  const previewZoomFrameRef = useRef<number | null>(null);
  const previewZoomRef = useRef<number | null>(null);
  const transposeByRef = useRef(0);
  const isAutoFitRef = useRef(true);
  const [layout, setLayout] = useState<ScoreLayout>("pages");
  const [measuresPerLine, setMeasuresPerLine] =
    useState<MeasuresPerLine>(5);
  const [status, setStatus] = useState<ScoreStatus>("loading");
  const [renderRevision, setRenderRevision] = useState(0);
  const [zoom, setZoom] = useState(1);
  const canonicalDefaultKey =
    defaultKey && isMusicalKey(defaultKey) ? defaultKey : null;
  const [selectedKey, setSelectedKey] = useState(canonicalDefaultKey ?? "");
  const [manualOffset, setManualOffset] = useState(0);
  const transposeBy = canonicalDefaultKey
    ? getKeyTransposition(canonicalDefaultKey, selectedKey)
    : manualOffset;
  const displayedKey = canonicalDefaultKey
    ? selectedKey
    : defaultKey
      ? transposeChord(defaultKey, manualOffset)
      : null;
  const isResetDisabled = transposeBy === 0 && manualOffset === 0;

  const updateZoom = useCallback(
    (nextZoom: number, keepAutoFit = false) => {
      const clampedZoom = clampScoreZoom(nextZoom);

      isAutoFitRef.current = keepAutoFit;
      zoomRef.current = clampedZoom;
      applyScoreZoom(containerRef.current, clampedZoom);
      setZoom(clampedZoom);
    },
    [],
  );

  const previewZoom = useCallback((nextZoom: number) => {
    const clampedZoom = clampScoreZoom(nextZoom);

    isAutoFitRef.current = false;
    zoomRef.current = clampedZoom;
    previewZoomRef.current = clampedZoom;

    if (previewZoomFrameRef.current !== null) {
      return;
    }

    previewZoomFrameRef.current = window.requestAnimationFrame(() => {
      previewZoomFrameRef.current = null;

      if (previewZoomRef.current !== null) {
        applyScoreZoom(containerRef.current, previewZoomRef.current);
      }
    });
  }, []);

  const commitZoom = useCallback(() => {
    if (previewZoomFrameRef.current !== null) {
      window.cancelAnimationFrame(previewZoomFrameRef.current);
      previewZoomFrameRef.current = null;
    }

    if (previewZoomRef.current !== null) {
      applyScoreZoom(containerRef.current, previewZoomRef.current);
      previewZoomRef.current = null;
    }

    setZoom(zoomRef.current);
  }, []);

  const fitScore = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport || viewport.clientWidth <= 0) {
      return;
    }

    const horizontalPadding = viewport.clientWidth < 640 ? 24 : 64;
    const availableWidth = Math.max(
      1,
      viewport.clientWidth - horizontalPadding,
    );

    updateZoom(Math.min(1, availableWidth / SCORE_RENDER_WIDTH), true);
  }, [updateZoom]);

  const changeZoom = useCallback(
    (step: number) => updateZoom(zoomRef.current + step),
    [updateZoom],
  );

  const downloadRenderedScore = useCallback(async () => {
    const container = containerRef.current;
    const svgElements = container
      ? Array.from(container.querySelectorAll("svg"))
      : [];

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
    const margin = 8;
    const usableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const usableHeight = pdf.internal.pageSize.getHeight() - margin * 2;
    let isFirstPage = true;

    for (const svg of svgElements) {
      const { height, image, width } = await loadSvgImage(svg);
      const rasterScale = Math.min(2, 1800 / width);
      const sourceCanvas = document.createElement("canvas");
      const sourceContext = sourceCanvas.getContext("2d");

      if (!sourceContext) {
        throw new Error("Canvas 2D context is unavailable.");
      }

      sourceCanvas.width = Math.ceil(width * rasterScale);
      sourceCanvas.height = Math.ceil(height * rasterScale);
      sourceContext.scale(rasterScale, rasterScale);
      sourceContext.fillStyle = "#fffdf7";
      sourceContext.fillRect(0, 0, width, height);
      sourceContext.drawImage(image, 0, 0, width, height);

      const pixelsPerMm = sourceCanvas.width / usableWidth;
      const maxSliceHeight = usableHeight * pixelsPerMm;

      for (
        let offsetY = 0;
        offsetY < sourceCanvas.height;
        offsetY += maxSliceHeight
      ) {
        const sliceHeight = Math.min(
          maxSliceHeight,
          sourceCanvas.height - offsetY,
        );
        const sliceCanvas = document.createElement("canvas");
        const sliceContext = sliceCanvas.getContext("2d");

        if (!sliceContext) {
          throw new Error("Canvas 2D context is unavailable.");
        }

        sliceCanvas.width = sourceCanvas.width;
        sliceCanvas.height = Math.ceil(sliceHeight);
        sliceContext.fillStyle = "#fffdf7";
        sliceContext.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceContext.drawImage(
          sourceCanvas,
          0,
          offsetY,
          sourceCanvas.width,
          sliceHeight,
          0,
          0,
          sourceCanvas.width,
          sliceHeight,
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
          sliceHeight / pixelsPerMm,
          undefined,
          "FAST",
        );
      }
    }

    pdf.save(
      `${buildSongDocumentFileStem(title, collection, collectionNumber)}.pdf`,
    );
  }, [collection, collectionNumber, title]);

  const openRenderedDocument = useCallback(() => {
    const markup = containerRef.current?.innerHTML;

    if (!markup) {
      return;
    }

    const popup = window.open("about:blank", "_blank");

    if (!popup?.document) {
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
      * { box-sizing: border-box; }
      body { margin: 0; padding: 32px; background: #ebe9e2; }
      main { width: min(920px, 100%); margin: 0 auto; }
      svg { display: block; width: 100% !important; height: auto !important; margin: 0 auto 24px; background: #fffdf7; box-shadow: 0 18px 48px rgb(24 36 58 / 15%); }
      @media print { body { padding: 0; background: white; } svg { box-shadow: none; break-after: page; } }
    </style>
  </head>
  <body><main>${markup}</main></body>
</html>`);
    popup.document.close();
  }, [title]);

  useImperativeHandle(
    ref,
    () => ({
      changeZoom,
      commitZoom,
      downloadPdf: downloadRenderedScore,
      openDocument: openRenderedDocument,
      openFullscreen() {
        const target = stageRef.current?.closest<HTMLElement>(
          ".song-detail-view",
        );

        if (target?.requestFullscreen) {
          void target.requestFullscreen();
        }
      },
      previewZoom,
      setZoom: updateZoom,
    }),
    [
      changeZoom,
      commitZoom,
      downloadRenderedScore,
      openRenderedDocument,
      previewZoom,
      updateZoom,
    ],
  );

  useEffect(() => {
    onZoomChange?.(zoom);
  }, [onZoomChange, zoom]);

  useEffect(() => {
    return () => {
      if (previewZoomFrameRef.current !== null) {
        window.cancelAnimationFrame(previewZoomFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    transposeByRef.current = transposeBy;
  }, [transposeBy]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (!isAutoFitRef.current) {
        return;
      }

      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(fitScore);
    });

    observer.observe(viewport);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [fitScore]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    const frame = window.requestAnimationFrame(fitScore);

    return () => window.cancelAnimationFrame(frame);
  }, [fitScore, layout, status]);

  useEffect(() => {
    const container = containerRef.current;
    const abortController = new AbortController();
    let isCancelled = false;

    async function renderScore() {
      if (!container) {
        return;
      }

      setStatus("loading");
      container.innerHTML = "";
      osmdRef.current = null;
      prepareScoreForRender(container);

      try {
        const [{ OpenSheetMusicDisplay, TransposeCalculator }, analysis] =
          await Promise.all([
            import("opensheetmusicdisplay"),
            (async () => {
              if (sourceAnalysisRef.current?.sourceUrl === sourceUrl) {
                return sourceAnalysisRef.current.analysis;
              }

              const response = await fetch(sourceUrl, {
                signal: abortController.signal,
              });

              if (!response.ok) {
                throw new Error("MusicXML source could not be loaded.");
              }

              const nextAnalysis = analyzeMusicXmlDisplay(
                await response.text(),
              );

              sourceAnalysisRef.current = {
                analysis: nextAnalysis,
                sourceUrl,
              };

              return nextAnalysis;
            })(),
          ]);

        if (isCancelled) {
          return;
        }

        const osmd = new OpenSheetMusicDisplay(container, {
          alignRests: 2,
          autoResize: false,
          backend: "svg",
          defaultColorLabel: "#1f2933",
          defaultColorMusic: "#1f2933",
          defaultColorTitle: "#18243a",
          defaultFontFamily: "Times New Roman",
          disableCursor: true,
          drawComposer: true,
          drawCredits: true,
          drawLyricist: true,
          drawMeasureNumbersOnlyAtSystemStart: true,
          drawPartNames: false,
          drawTitle: true,
          drawingParameters: "default",
          measureNumberInterval: 4,
          newPageFromXML: false,
          newSystemFromNewPageInXML: false,
          newSystemFromXML: false,
          pageBackgroundColor: "#fffdf7",
          pageFormat: layout === "pages" ? "A4_P" : "Endless",
        });

        osmd.TransposeCalculator = new TransposeCalculator();
        await osmd.load(analysis.sanitizedXml, title);

        if (isCancelled) {
          return;
        }

        osmd.Sheet.TitleString = title;

        if (copyright) {
          osmd.Sheet.CopyrightString = copyright;
        }

        const { spacing } = MEASURE_DENSITY[measuresPerLine];

        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = measuresPerLine;
        osmd.EngravingRules.TitleBottomDistance = 5;
        osmd.EngravingRules.LyricsUseXPaddingForLongLyrics = true;
        osmd.EngravingRules.LyricsXPaddingFactorForLongLyrics =
          1.05 * spacing;
        osmd.EngravingRules.BetweenSyllableMinimumDistance = 0.7 * spacing;
        osmd.EngravingRules.ChordSymbolXSpacing = Math.max(
          0.48,
          0.9 * spacing,
        );
        osmd.EngravingRules.MinNoteDistance = Math.max(1.15, 2 * spacing);
        osmd.EngravingRules.VoiceSpacingAddendVexflow = Math.max(
          1,
          2 * spacing,
        );
        osmd.EngravingRules.VoiceSpacingMultiplierVexflow = Math.max(
          0.44,
          0.65 * spacing,
        );
        osmd.EngravingRules.MaximumLyricsElongationFactor = 2.2;
        osmd.EngravingRules.LastSystemMaxScalingFactor = 1.15;

        osmdRef.current = osmd;
        renderTransposedScore(
          osmd,
          container,
          transposeByRef.current,
          zoomRef.current,
        );

        if (!isCancelled) {
          setStatus("ready");
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        console.error(error);

        if (!isCancelled) {
          setStatus("error");
        }
      }
    }

    void renderScore();

    return () => {
      isCancelled = true;
      abortController.abort();
      osmdRef.current = null;

      if (container) {
        container.innerHTML = "";
      }
    };
  }, [
    copyright,
    layout,
    measuresPerLine,
    renderRevision,
    sourceUrl,
    title,
  ]);

  useEffect(() => {
    const osmd = osmdRef.current;
    const container = containerRef.current;

    if (!osmd || !container) {
      return;
    }

    try {
      renderTransposedScore(osmd, container, transposeBy, zoomRef.current);
    } catch (error) {
      console.error(error);
      window.setTimeout(() => setStatus("error"), 0);
    }
  }, [transposeBy]);

  function shift(step: number) {
    if (!canonicalDefaultKey) {
      setManualOffset((current) => current + step);
      return;
    }

    const options = getKeysForMode(canonicalDefaultKey);
    const currentIndex = options.indexOf(
      selectedKey as (typeof options)[number],
    );
    const nextIndex = (currentIndex + step + options.length) % options.length;

    setSelectedKey(options[nextIndex]);
  }

  return (
    <div ref={stageRef} className="song-document-viewer__stage">
      {showSettings ? (
        <div className="song-score-viewer__settings">
          <fieldset className="song-score-viewer__layout-setting">
            <legend>Présentation</legend>
            <div className="song-score-viewer__segmented-control">
              <button
                aria-pressed={layout === "pages"}
                onClick={() => {
                  isAutoFitRef.current = true;
                  setLayout("pages");
                }}
                type="button"
              >
                Pages
              </button>
              <button
                aria-pressed={layout === "continuous"}
                onClick={() => {
                  isAutoFitRef.current = true;
                  setLayout("continuous");
                }}
                type="button"
              >
                Continu
              </button>
            </div>
          </fieldset>
          <fieldset className="song-score-viewer__density-setting">
            <legend>Mesures par ligne</legend>
            <div className="song-score-viewer__segmented-control song-score-viewer__segmented-control--three">
              {([4, 5, 6] as const).map((value) => (
                <button
                  aria-label={`Afficher ${value} mesures par ligne`}
                  aria-pressed={measuresPerLine === value}
                  key={value}
                  onClick={() => setMeasuresPerLine(value)}
                  type="button"
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="song-score-viewer__transpose-setting">
            <span>Transposition</span>
            <div className="song-score-viewer__transpose-controls">
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
                  className="song-score-viewer__select"
                  onChange={(event) => setSelectedKey(event.target.value)}
                  value={selectedKey}
                >
                  {getKeysForMode(canonicalDefaultKey).map((key) => (
                    <option key={key} value={key}>
                      {formatMusicalKey(key, notation)}
                    </option>
                  ))}
                </select>
              ) : (
                <strong className="song-score-viewer__transpose-value">
                  {displayedKey
                    ? formatMusicalKey(displayedKey, notation)
                    : `${manualOffset >= 0 ? "+" : ""}${manualOffset}`}
                </strong>
              )}
              <button
                aria-label="Réinitialiser la transposition"
                className="song-score-viewer__transpose-reset"
                disabled={isResetDisabled}
                onClick={() => {
                  setSelectedKey(canonicalDefaultKey ?? "");
                  setManualOffset(0);
                }}
                type="button"
              >
                <ResetIcon />
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
        </div>
      ) : null}

      <div className="song-score-viewer__canvas">
        <div ref={viewportRef} className="song-score-viewer__viewport">
          <div
            ref={containerRef}
            aria-label={`Partition MusicXML de ${title}`}
            className="song-score-viewer__score"
          />
        </div>

        {status !== "ready" ? (
          <div
            aria-live="polite"
            className={`song-score-viewer__status song-score-viewer__status--${status}`}
            role="status"
          >
            {status === "loading" ? (
              <>
                <span aria-hidden="true" className="song-score-viewer__loader" />
                <strong>Préparation de la partition</strong>
                <small>La mise en page musicale est en cours…</small>
              </>
            ) : (
              <>
                <strong>Impossible d’afficher cette partition</strong>
                <small>Le fichier MusicXML n’a pas pu être interprété.</small>
                <button
                  className="admin-button"
                  onClick={() => setRenderRevision((current) => current + 1)}
                  type="button"
                >
                  Réessayer
                </button>
              </>
            )}
          </div>
        ) : null}

        {status === "ready" ? (
          <div
            aria-label="Zoom de la partition"
            className="song-score-viewer__zoom-toolbar"
            role="group"
          >
            <button
              aria-label="Réduire la partition"
              disabled={zoom <= MIN_SCORE_ZOOM}
              onClick={() => changeZoom(-SCORE_ZOOM_STEP)}
              type="button"
            >
              −
            </button>
            <button
              aria-label="Ajuster la partition à la largeur disponible"
              className="song-score-viewer__fit-button"
              onClick={fitScore}
              title="Ajuster à la largeur"
              type="button"
            >
              <FitIcon />
              <span>{Math.round(zoom * 100)} %</span>
            </button>
            <button
              aria-label="Agrandir la partition"
              disabled={zoom >= MAX_SCORE_ZOOM}
              onClick={() => changeZoom(SCORE_ZOOM_STEP)}
              type="button"
            >
              +
            </button>
          </div>
        ) : null}
      </div>

      {copyright ? (
        <footer className="song-score-viewer__sheet-footer">{copyright}</footer>
      ) : null}
    </div>
  );
});
