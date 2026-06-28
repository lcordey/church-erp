"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";

import {
  formatChord,
  formatMusicalKey,
  getKeysForMode,
  getKeyTransposition,
  isMusicalKey,
  transposeChord,
} from "../music/musical-key";
import { parseChordPro } from "../services/chordpro";
import { ChordSheet } from "./chord-sheet";
import { LyricsSheet } from "./lyrics-sheet";
import { useMusicNotation } from "./music-notation-provider";
import { buildSongDocumentFileStem } from "./song-document-file-name";
import { SongRenderPreferencesControls } from "./song-render-preferences-controls";
import { useSongRenderPreferences } from "./song-render-preferences-provider";

type TransposableSongSheetProps = {
  content: string;
  copyright: string | null;
  defaultKey: string | null;
  displayMode?: "chords" | "lyrics";
  showSettings?: boolean;
  title: string;
};

export type TransposableSongSheetHandle = {
  downloadPdf: () => Promise<void>;
  openDocument: () => void;
};

type PrintableLine = {
  kind: "blank" | "section" | "text";
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const TransposableSongSheet = forwardRef<
  TransposableSongSheetHandle,
  TransposableSongSheetProps
>(function TransposableSongSheet(
  {
    content,
    copyright,
    defaultKey,
    displayMode = "chords",
    showSettings = true,
    title,
  },
  ref,
) {
  const { notation } = useMusicNotation();
  const { preferences } = useSongRenderPreferences();
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

  const getPrintableLines = useCallback((): PrintableLine[] => {
    return parseChordPro(content).map((line) => {
      if (line.type === "blank") {
        return { kind: "blank", text: "" };
      }

      if (line.type === "section") {
        return { kind: "section", text: line.label };
      }

      return {
        kind: "text",
        text: line.segments
          .map((segment) => {
            const chord =
              displayMode === "chords" && segment.chord
                ? `[${formatChord(transposeChord(segment.chord, transposeBy), notation)}]`
                : "";

            return `${chord}${segment.lyrics}`;
          })
          .join(""),
      };
    });
  }, [content, displayMode, notation, transposeBy]);

  useImperativeHandle(
    ref,
    () => ({
      async downloadPdf() {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({
          compress: true,
          format: "a4",
          orientation: "portrait",
          unit: "mm",
        });
        const margin = 18;
        const usableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
        const pageBottom = pdf.internal.pageSize.getHeight() - margin;
        let y = margin;

        pdf.setTextColor("#1f2933");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(20);
        pdf.text(title, margin, y);
        y += 10;

        if (displayMode === "chords" && displayedKey) {
          pdf.setFontSize(10);
          pdf.text(
            `Tonalité ${formatMusicalKey(displayedKey, notation)}`,
            margin,
            y,
          );
          y += 8;
        }

        for (const line of getPrintableLines()) {
          if (line.kind === "blank") {
            y += 5;
            continue;
          }

          pdf.setFont(
            "helvetica",
            line.kind === "section" ? "bold" : "normal",
          );
          pdf.setFontSize(line.kind === "section" ? 11 : 10);
          const wrappedLines = pdf.splitTextToSize(line.text, usableWidth) as string[];
          const lineHeightMm = line.kind === "section" ? 6 : 5;

          if (y + wrappedLines.length * lineHeightMm > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          pdf.text(wrappedLines, margin, y);
          y += wrappedLines.length * lineHeightMm;
        }

        if (copyright) {
          if (y + 12 > pageBottom) {
            pdf.addPage();
            y = margin;
          }

          y += 6;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor("#65727d");
          pdf.text(pdf.splitTextToSize(copyright, usableWidth), margin, y);
        }

        const suffix = displayMode === "chords" ? "accords" : "paroles";
        pdf.save(
          `${buildSongDocumentFileStem(title, null, null)} - ${suffix}.pdf`,
        );
      },
      openDocument() {
        const popup = window.open("about:blank", "_blank");

        if (!popup?.document) {
          return;
        }

        const printableLines = getPrintableLines()
          .map((line) => {
            if (line.kind === "blank") {
              return "<div class=\"blank\"></div>";
            }

            if (line.kind === "section") {
              return `<h2>${escapeHtml(line.text)}</h2>`;
            }

            return `<p>${escapeHtml(line.text)}</p>`;
          })
          .join("");
        const keyMarkup =
          displayMode === "chords" && displayedKey
            ? `<small>Tonalité ${escapeHtml(formatMusicalKey(displayedKey, notation))}</small>`
            : "";
        const copyrightMarkup = copyright
          ? `<footer>${escapeHtml(copyright)}</footer>`
          : "";

        popup.opener = null;
        popup.document.write(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 32px; color: #1f2933; background: #eee9df; font: 17px/1.5 Georgia, serif; }
      main { width: min(210mm, 100%); min-height: 297mm; margin: 0 auto; padding: 22mm 18mm; background: #fffdf7; box-shadow: 0 18px 50px rgb(24 36 58 / 14%); }
      h1 { margin: 0 0 8px; font: 500 42px/1.05 Georgia, serif; }
      small { display: block; margin-bottom: 28px; color: #65727d; font: 700 14px/1.4 Arial, sans-serif; }
      h2 { margin: 30px 0 10px; color: #315b78; font: 700 13px/1.3 Arial, sans-serif; letter-spacing: .1em; text-transform: uppercase; }
      p { margin: 0 0 5px; white-space: pre-wrap; }
      .blank { height: 18px; }
      footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #ece5d7; color: #65727d; font-size: 12px; }
      @media print { body { padding: 0; background: white; } main { width: auto; min-height: 0; padding: 0; box-shadow: none; } }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      ${keyMarkup}
      ${printableLines}
      ${copyrightMarkup}
    </main>
  </body>
</html>`);
        popup.document.close();
      },
    }),
    [
      copyright,
      displayMode,
      displayedKey,
      getPrintableLines,
      notation,
      title,
    ],
  );

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

  return (
    <div className="song-text-document">
      {displayMode === "chords" && showSettings ? (
        <div className="song-render-settings">
          <div className="transpose-toolbar">
            <div>
              <span>Transposition temporaire</span>
              <small>La tonalité enregistrée reste inchangée.</small>
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

          <SongRenderPreferencesControls showSourcePriority={false} />
        </div>
      ) : null}

      <div className="song-document-viewer__stage song-document-viewer__stage--text">
        <article
          className={`sheet-card ${displayMode === "lyrics" ? "sheet-card--lyrics" : ""}`}
        >
          {displayMode === "chords" ? (
            <ChordSheet
              chordColor={preferences.chordColor}
              chordFontScale={preferences.chordFontScale}
              content={content}
              lineHeight={preferences.lineHeight}
              lyricsFontScale={preferences.lyricsFontScale}
              title={title}
              transposeBy={transposeBy}
            />
          ) : (
            <LyricsSheet
              content={content}
              fontScale={preferences.lyricsFontScale}
              title={title}
            />
          )}
          {copyright ? (
            <footer className="sheet-card__footer">{copyright}</footer>
          ) : null}
        </article>
      </div>
    </div>
  );
});
