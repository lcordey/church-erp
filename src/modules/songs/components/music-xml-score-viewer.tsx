"use client";

import type { OpenSheetMusicDisplay as OpenSheetMusicDisplayInstance } from "opensheetmusicdisplay";
import { useEffect, useRef, useState } from "react";

import {
  formatMusicalKey,
  getKeysForMode,
  getKeyTransposition,
  isMusicalKey,
  transposeChord,
} from "../music/musical-key";
import { useMusicNotation } from "./music-notation-provider";

type MusicXmlScoreViewerProps = {
  copyright: string | null;
  defaultKey: string | null;
  title: string;
  sourceUrl: string;
};

function applyScoreTransposition(
  osmd: OpenSheetMusicDisplayInstance,
  semitones: number,
) {
  osmd.Sheet.Transpose = semitones;
  osmd.updateGraphic();
  osmd.render();
}

export function MusicXmlScoreViewer({
  copyright,
  defaultKey,
  title,
  sourceUrl,
}: MusicXmlScoreViewerProps) {
  const { notation } = useMusicNotation();
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplayInstance | null>(null);
  const [status, setStatus] = useState("Chargement de la partition…");
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
      if (!container) {
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

        const osmd = new OpenSheetMusicDisplay(container, {
          autoResize: true,
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

        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 4;
        osmd.EngravingRules.TitleBottomDistance = 5.5;
        osmd.EngravingRules.LyricsUseXPaddingForLongLyrics = true;
        osmd.EngravingRules.LyricsXPaddingFactorForLongLyrics = 1.25;
        osmd.EngravingRules.MaximumLyricsElongationFactor = 2.4;
        osmd.EngravingRules.BetweenSyllableMinimumDistance = 0.8;

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
  }, [copyright, sourceUrl, title]);

  useEffect(() => {
    const osmd = osmdRef.current;

    if (!osmd) {
      return;
    }

    transposeByRef.current = transposeBy;
    applyScoreTransposition(osmd, transposeBy);
  }, [transposeBy]);

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

      <div className="song-score-viewer__stage">
        {status ? <p className="song-score-viewer__status">{status}</p> : null}
        <div
          ref={containerRef}
          aria-label={`Partition MusicXML de ${title}`}
          className="song-score-viewer__score"
        />
        {copyright ? (
          <footer className="song-score-viewer__sheet-footer">
            {copyright}
          </footer>
        ) : null}
      </div>
    </>
  );
}
