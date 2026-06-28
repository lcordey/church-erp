"use client";

import type { CSSProperties } from "react";

import { parseChordPro } from "../services/chordpro";

type LyricsSheetProps = {
  content: string;
  fontScale?: number;
  title: string;
};

export function LyricsSheet({
  content,
  fontScale = 1,
  title,
}: LyricsSheetProps) {
  const lines = parseChordPro(content);

  return (
    <div
      className="lyrics-sheet"
      aria-label="Paroles"
      style={
        {
          "--lyrics-sheet-font-size": `${fontScale}em`,
        } as CSSProperties
      }
    >
      <h1 className="song-text-sheet__title">{title}</h1>
      {lines.map((line, lineIndex) => {
        if (line.type === "blank") {
          return <div className="lyrics-sheet__blank" key={lineIndex} />;
        }

        if (line.type === "section") {
          return (
            <h2 className="lyrics-sheet__section" key={lineIndex}>
              {line.label}
            </h2>
          );
        }

        return (
          <p className="lyrics-sheet__line" key={lineIndex}>
            {line.segments.map((segment) => segment.lyrics).join("")}
          </p>
        );
      })}
    </div>
  );
}
