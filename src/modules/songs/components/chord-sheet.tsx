"use client";

import type { CSSProperties } from "react";

import { formatChord, transposeChord } from "../music/musical-key";
import { parseChordPro } from "../services/chordpro";
import { useMusicNotation } from "./music-notation-provider";

type ChordSheetProps = {
  chordColor?: "warm" | "accent" | "ink";
  chordFontScale?: number;
  content: string;
  lineHeight?: number;
  lyricsFontScale?: number;
  title: string;
  transposeBy?: number;
};

export function ChordSheet({
  chordColor = "warm",
  chordFontScale = 0.82,
  content,
  lineHeight = 1.18,
  lyricsFontScale = 1,
  title,
  transposeBy = 0,
}: ChordSheetProps) {
  const { notation } = useMusicNotation();
  const lines = parseChordPro(content);

  return (
    <div
      className="chord-sheet"
      style={
        {
          "--chord-sheet-chord-color": `var(--${chordColor})`,
          "--chord-sheet-chord-font-size": `${chordFontScale}em`,
          "--chord-sheet-font-size": `${lyricsFontScale}em`,
          "--chord-sheet-line-height": `${lineHeight}`,
          "--chord-sheet-line-min-height": `${Math.max(lineHeight + 1.42, 2.15)}em`,
        } as CSSProperties
      }
      aria-label="Paroles et accords"
    >
      <h1 className="song-text-sheet__title">{title}</h1>
      {lines.map((line, lineIndex) => {
        if (line.type === "blank") {
          return <div className="chord-sheet__blank" key={lineIndex} />;
        }

        if (line.type === "section") {
          return (
            <h2 className="chord-sheet__section" key={lineIndex}>
              {line.label}
            </h2>
          );
        }

        return (
          <div className="chord-sheet__line" key={lineIndex}>
            {line.segments.map((segment, segmentIndex) => (
              <span className="chord-sheet__segment" key={segmentIndex}>
                <span className="chord-sheet__chord" aria-hidden={!segment.chord}>
                  {segment.chord
                    ? formatChord(
                        transposeChord(segment.chord, transposeBy),
                        notation,
                      )
                    : "\u00a0"}
                </span>
                <span className="chord-sheet__lyrics">{segment.lyrics}</span>
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
