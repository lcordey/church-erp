const songPdfBucket = "song-pdfs";

export class StorageConfigurationError extends Error {
  constructor() {
    super(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for song PDF storage.",
    );
  }
}

export class StorageObjectNotFoundError extends Error {
  constructor() {
    super("The requested storage object was not found.");
  }
}

export class StorageRequestError extends Error {
  constructor(
    readonly status: number,
    readonly responseBody: string,
  ) {
    super(`Song PDF storage request failed with status ${status}.`);
  }
}

export class StoragePathError extends Error {
  constructor() {
    super("The song PDF storage path is not allowed.");
  }
}

type StorageConfig = {
  baseUrl: string;
  serviceRoleKey: string;
};

function getStorageConfig(): StorageConfig {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new StorageConfigurationError();
  }

  return {
    baseUrl: `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${songPdfBucket}`,
    serviceRoleKey,
  };
}

function storageHeaders(config: StorageConfig, contentType?: string) {
  const headers = new Headers({
    apikey: config.serviceRoleKey,
    authorization: `Bearer ${config.serviceRoleKey}`,
  });

  if (contentType) {
    headers.set("content-type", contentType);
    headers.set("x-upsert", "true");
  }

  return headers;
}

function objectUrl(config: StorageConfig, storagePath: string) {
  if (/^https?:\/\//i.test(storagePath)) {
    const candidate = new URL(storagePath);

    if (!candidate.href.startsWith(`${config.baseUrl}/`)) {
      throw new StoragePathError();
    }

    return candidate.href;
  }

  if (
    !storagePath ||
    storagePath.startsWith("/") ||
    storagePath.includes("\\") ||
    storagePath.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new StoragePathError();
  }

  return `${config.baseUrl}/${storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function isStorageNotFoundResponse(status: number, responseBody: string) {
  if (status === 404) {
    return true;
  }

  if (status !== 400) {
    return false;
  }

  const normalizedBody = responseBody.toLowerCase();

  return (
    normalizedBody.includes("not found") ||
    normalizedBody.includes("not_found") ||
    normalizedBody.includes("no such") ||
    normalizedBody.includes("does not exist")
  );
}

export function getSongPdfStoragePath(songId: string) {
  return `songs/${songId}/score.pdf`;
}

export async function uploadSongPdf(storagePath: string, file: File) {
  const config = getStorageConfig();
  const response = await fetch(objectUrl(config, storagePath), {
    method: "PUT",
    headers: storageHeaders(config, file.type || "application/pdf"),
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Song PDF upload failed with status ${response.status}.`);
  }
}

export async function deleteSongPdf(storagePath: string) {
  const config = getStorageConfig();
  const response = await fetch(objectUrl(config, storagePath), {
    method: "DELETE",
    headers: storageHeaders(config),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Song PDF delete failed with status ${response.status}.`);
  }
}

export async function downloadSongPdf(storagePath: string): Promise<Response> {
  const config = getStorageConfig();
  const response = await fetch(objectUrl(config, storagePath), {
    headers: storageHeaders(config),
  });

  if (response.ok) {
    return response;
  }

  const responseBody = await response.text().catch(() => "");

  if (isStorageNotFoundResponse(response.status, responseBody)) {
    throw new StorageObjectNotFoundError();
  }

  throw new StorageRequestError(response.status, responseBody);
}
