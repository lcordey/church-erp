"use client";

import { formatChord, transposeChord } from "../music/musical-key";
import { parseChordPro } from "../services/chordpro";
import { useMusicNotation } from "./music-notation-provider";

type ChordSheetProps = {
  content: string;
  transposeBy?: number;
};

export function ChordSheet({ content, transposeBy = 0 }: ChordSheetProps) {
  const { notation } = useMusicNotation();
  const lines = parseChordPro(content);

  return (
    <div className="chord-sheet" aria-label="Paroles et accords">
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
