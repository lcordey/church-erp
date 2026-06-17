"use client";

import { formatMusicalKey } from "../music/musical-key";
import { useMusicNotation } from "./music-notation-provider";

export function MusicalKeyText({ musicalKey }: { musicalKey: string }) {
  const { notation } = useMusicNotation();

  return <>{formatMusicalKey(musicalKey, notation)}</>;
}
