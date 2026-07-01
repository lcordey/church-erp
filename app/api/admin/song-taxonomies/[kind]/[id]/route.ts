import { songTaxonomyErrorResponse } from "@/src/modules/songs/http/song-taxonomy-response";
import {
  deleteSongTaxonomyItem,
  parseSongTaxonomyKind,
} from "@/src/modules/songs/services/song-taxonomy-management";

type RouteContext = {
  params: Promise<{ kind: string; id: string }>;
};

function invalidKindResponse() {
  return Response.json(
    { error: { code: "INVALID_TAXONOMY_KIND", message: "Type de liste invalide." } },
    { status: 400 },
  );
}

function notFoundResponse() {
  return Response.json(
    { error: { code: "TAXONOMY_NOT_FOUND", message: "Élément introuvable." } },
    { status: 404 },
  );
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { kind: kindValue, id } = await params;
  const kind = parseSongTaxonomyKind(kindValue);

  if (!kind) {
    return invalidKindResponse();
  }

  try {
    const deleted = await deleteSongTaxonomyItem(kind, id);
    return deleted ? new Response(null, { status: 204 }) : notFoundResponse();
  } catch (error) {
    return songTaxonomyErrorResponse(error);
  }
}
