const collectionLabels: Record<string, string> = {
  JEM: "J'aime l'Eternel",
  JEMK: "JEM Kids",
  AF: "Ailes de la Foi",
  ATG: "À Toi la Gloire",
  LeMont: "LeMont",
};

const collectionSearchAliases: Record<string, string[]> = {
  JEM: ["JEM", "J'aime l'Eternel"],
  JEMK: ["JEMK", "JEM Kids"],
  AF: ["AF", "Ailes de la Foi"],
  ATG: ["ATG", "À Toi la Gloire", "A Toi la Gloire"],
  LeMont: ["LeMont"],
};

export function getSongCollectionLabel(collection: string): string {
  return collectionLabels[collection] ?? collection;
}

export function getSongCollectionSearchTerms(collection: string): string[] {
  return collectionSearchAliases[collection] ?? [collection];
}

export function formatSongCollectionLabel(
  collection: string | null,
  collectionNumber: number | null,
): string | null {
  if (!collection) {
    return null;
  }

  const label = getSongCollectionLabel(collection);

  if (!collectionNumber) {
    return label;
  }

  return `${label} ${String(collectionNumber).padStart(3, "0")}`;
}
