import {
  publishSong,
  unpublishSong,
} from "@/src/modules/songs/services/admin-song-management";
import {
  adminSongErrorResponse,
  songNotFoundResponse,
} from "@/src/modules/songs/http/admin-song-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    published?: unknown;
  } | null;

  if (typeof body?.published !== "boolean") {
    return Response.json(
      {
        error: {
          code: "INVALID_PUBLICATION",
          message: "L’état de publication est invalide.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const song = body.published
      ? await publishSong(id)
      : await unpublishSong(id);

    return song ? Response.json({ data: song }) : songNotFoundResponse();
  } catch (error) {
    return adminSongErrorResponse(error);
  }
}
