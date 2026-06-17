"use client";

import { useMusicNotation } from "./music-notation-provider";

export function MusicNotationToggle() {
  const { notation, setNotation } = useMusicNotation();

  return (
    <div className="notation-toggle" aria-label="Notation musicale">
      <button
        aria-pressed={notation === "english"}
        onClick={() => setNotation("english")}
        type="button"
      >
        A B C
      </button>
      <button
        aria-pressed={notation === "french"}
        onClick={() => setNotation("french")}
        type="button"
      >
        La Si Do
      </button>
    </div>
  );
}
