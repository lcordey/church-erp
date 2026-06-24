export function buildSongDocumentFileStem(
  title: string,
  collection: string | null,
  collectionNumber: number | null,
) {
  const parts = [title.trim()];

  if (collection) {
    if (collectionNumber) {
      parts.push(`${collection} ${String(collectionNumber).padStart(3, "0")}`);
    } else {
      parts.push(collection);
    }
  }

  return parts
    .join(" - ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
