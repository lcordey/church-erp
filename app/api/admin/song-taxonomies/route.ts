import { songTaxonomyErrorResponse } from "@/src/modules/songs/http/song-taxonomy-response";
import {
  createSongTaxonomyItem,
  listAdminSongTaxonomies,
  parseSongTaxonomyKind,
} from "@/src/modules/songs/services/song-taxonomy-management";

export async function GET() {
  try {
    return Response.json({ data: await listAdminSongTaxonomies() });
  } catch (error) {
    return songTaxonomyErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as {
    kind?: string;
    name?: unknown;
  } | null;
  const kind = parseSongTaxonomyKind(input?.kind ?? "");

  if (!kind) {
    return Response.json(
      { error: { code: "INVALID_TAXONOMY_KIND", message: "Type de liste invalide." } },
      { status: 400 },
    );
  }

  try {
    const item = await createSongTaxonomyItem(kind, input?.name);
    return Response.json({ data: item }, { status: 201 });
  } catch (error) {
    return songTaxonomyErrorResponse(error);
  }
}
