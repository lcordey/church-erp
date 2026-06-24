"use client";

import { parseChordPro } from "../services/chordpro";

type LyricsSheetProps = {
  content: string;
};

export function LyricsSheet({ content }: LyricsSheetProps) {
  const lines = parseChordPro(content);

  return (
    <div className="lyrics-sheet" aria-label="Paroles">
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
