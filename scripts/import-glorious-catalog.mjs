import path from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";

import postgres from "postgres";

import {
  createDeterministicUuid,
  gloriousSnapshotPath,
  loadLocalEnv,
  normalizeAscii,
  writeJson,
  slugify,
  songPdfBucket,
  songPdfMimeType,
} from "./song-pdf-library.mjs";

const localDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:15432/postgres";
const localSupabaseUrl = "http://127.0.0.1:15431";
const localServiceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0." +
  "EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const gloriousChordProDirectory =
  process.env.GLORIOUS_CHORDPRO_DIR ??
  "/home/lcordey/work/download_for_church_erp/Glorious_ChordPro/canonical";
const gloriousPdfDirectory =
  process.env.GLORIOUS_PDF_DIR ??
  "/home/lcordey/work/download_for_church_erp/Glorious";
const gloriousCollectionCode = "Glorious";
const gloriousCollectionNamespace = "glorious";

function resolveConfig() {
  return {
    databaseUrl: process.env.LOCAL_DATABASE_URL ?? localDatabaseUrl,
    supabaseUrl: process.env.LOCAL_SUPABASE_URL ?? localSupabaseUrl,
    serviceRoleKey:
      process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY ??
      localServiceRoleKey,
  };
}

function requireConfigValue(name, value) {
  const resolved = value;

  if (!resolved || resolved.startsWith("replace-with-")) {
    throw new Error(`${name} is required.`);
  }

  return resolved;
}

function storageObjectUrl(storagePath, supabaseUrl) {
  const normalizedUrl = requireConfigValue("SUPABASE_URL", supabaseUrl).replace(/\/$/, "");
  const encodedPath = storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${normalizedUrl}/storage/v1/object/${songPdfBucket}/${encodedPath}`;
}

function cleanupText(content) {
  return content.replace(/\r\n/g, "\n").trim();
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = cleanupText(value);
  return trimmed || null;
}

function parseChordProDirective(content, names) {
  for (const name of names) {
    const pattern = new RegExp(`^\\{${name}:\\s*(.+?)\\s*\\}$`, "im");
    const match = content.match(pattern);

    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function parseChordProComments(content) {
  return [...content.matchAll(/^\{(?:c|comment):\s*(.+?)\s*\}$/gim)].map(
    (match) => match[1].trim(),
  );
}

function extractCopyright(content) {
  const comments = parseChordProComments(content);

  for (const comment of comments) {
    if (comment.includes("©")) {
      return comment;
    }
  }

  return null;
}

function normalizeStem(value) {
  return normalizeAscii(value)
    .toLowerCase()
    .replace(/\.(cho|pdf)$/i, "")
    .replace(/\bglorious\b/g, "")
    .replace(/\boriginal\b/g, "")
    .replace(/\btt\b/g, "")
    .replace(/\bor\b/g, "")
    .replace(/\b1p\b/g, "")
    .replace(/\b4 voix\b/g, "")
    .replace(/\(\d+\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfVariantScore(fileName) {
  const normalized = normalizeAscii(fileName).toLowerCase();
  let score = 0;

  if (!normalized.includes(" tt")) {
    score += 4;
  }

  if (!normalized.includes(" or")) {
    score += 2;
  }

  if (!normalized.includes(" 1p")) {
    score += 1;
  }

  return score;
}

async function listCanonicalChordProFiles(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".cho"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "fr"));
}

async function listPdfFilesRecursively(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listPdfFilesRecursively(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right, "fr"));
}

function buildPdfIndex(pdfPaths) {
  const index = new Map();

  for (const pdfPath of pdfPaths) {
    const fileName = path.basename(pdfPath);
    const key = normalizeStem(fileName);

    if (!key) {
      continue;
    }

    const current = index.get(key);
    const candidate = {
      fileName,
      path: pdfPath,
      score: pdfVariantScore(fileName),
    };

    if (
      !current ||
      candidate.score > current.score ||
      (candidate.score === current.score &&
        candidate.fileName.localeCompare(current.fileName, "fr") < 0)
    ) {
      index.set(key, candidate);
    }
  }

  return index;
}

function toSongRecord(fileName, chordProContent) {
  const fileStem = fileName.replace(/\.cho$/i, "");
  const title =
    normalizeOptionalText(parseChordProDirective(chordProContent, ["title", "t"])) ??
    fileStem;
  const author =
    normalizeOptionalText(
      parseChordProDirective(chordProContent, ["subtitle", "st"]),
    ) ??
    normalizeOptionalText(parseChordProDirective(chordProContent, ["artist"]));
  const defaultKey = normalizeOptionalText(
    parseChordProDirective(chordProContent, ["key"]),
  );
  const copyright = normalizeOptionalText(extractCopyright(chordProContent));
  const slug = `${gloriousCollectionNamespace}-${slugify(fileStem)}`;
  const songKey = `${gloriousCollectionCode}:${fileStem}`;
  const songId = createDeterministicUuid("song", songKey);

  return {
    id: songId,
    title,
    slug,
    status: "published",
    author,
    copyright,
    defaultKey,
    collection: gloriousCollectionCode,
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: false,
    chordSourceId: createDeterministicUuid("song-source", `${songKey}:chordpro`),
    chordProContent,
    sourceChordProUrl: null,
  };
}

async function uploadPdf(storagePath, filePath, config) {
  const serviceKey = requireConfigValue(
    "SUPABASE_SERVICE_ROLE_KEY",
    config.serviceRoleKey,
  );
  const body = await readFile(filePath);

  if (!body.subarray(0, 4).equals(Buffer.from("%PDF"))) {
    throw new Error(`${filePath} is not a PDF file.`);
  }

  const response = await fetch(storageObjectUrl(storagePath, config.supabaseUrl), {
    method: "PUT",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": songPdfMimeType,
      "x-upsert": "true",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Upload failed for ${filePath}: ${response.status} ${await response.text()}`,
    );
  }
}

async function upsertSong(sql, song) {
  await sql.begin(async (transaction) => {
    await transaction`
      insert into songs (
        id,
        title,
        slug,
        status,
        author,
        copyright,
        default_key,
        collection,
        collection_number,
        source_page_url,
        is_editable
      )
      values (
        ${song.id},
        ${song.title},
        ${song.slug},
        ${song.status},
        ${song.author},
        ${song.copyright},
        ${song.defaultKey},
        ${song.collection},
        ${song.collectionNumber},
        ${song.sourcePageUrl},
        ${song.isEditable}
      )
      on conflict (id) do update set
        title = excluded.title,
        slug = excluded.slug,
        status = excluded.status,
        author = excluded.author,
        copyright = excluded.copyright,
        default_key = excluded.default_key,
        collection = excluded.collection,
        collection_number = excluded.collection_number,
        source_page_url = excluded.source_page_url,
        is_editable = excluded.is_editable,
        updated_at = now()
    `;

    await transaction`
      update song_sources
      set status = 'archived', updated_at = now()
      where song_id = ${song.id}
        and source_type = 'chordpro'
        and status = 'active'
        and id <> ${song.chordSourceId}
    `;

    await transaction`
      insert into song_sources (
        id,
        song_id,
        source_type,
        status,
        text_content,
        external_url
      )
      values (
        ${song.chordSourceId},
        ${song.id},
        'chordpro',
        'active',
        ${song.chordProContent},
        null
      )
      on conflict (id) do update set
        song_id = excluded.song_id,
        source_type = excluded.source_type,
        status = excluded.status,
        text_content = excluded.text_content,
        external_url = excluded.external_url,
        updated_at = now()
    `;
  });
}

async function upsertPdf(sql, songId, pdf, config) {
  const fileStat = await stat(pdf.path);
  const storagePath = `songs/${songId}/score.pdf`;

  await uploadPdf(storagePath, pdf.path, config);

  await sql.begin(async (transaction) => {
    await transaction`
      update song_sources
      set status = 'archived', updated_at = now()
      where song_id = ${songId}
        and source_type = 'pdf'
        and status = 'active'
    `;

    await transaction`
      insert into song_sources (
        id,
        song_id,
        source_type,
        status,
        storage_path,
        file_name,
        mime_type,
        file_size_bytes
      )
      values (
        ${createDeterministicUuid("song-source", `${songId}:pdf`)},
        ${songId},
        'pdf',
        'active',
        ${storagePath},
        ${pdf.fileName},
        ${songPdfMimeType},
        ${fileStat.size}
      )
      on conflict (id) do update set
        song_id = excluded.song_id,
        source_type = excluded.source_type,
        status = excluded.status,
        storage_path = excluded.storage_path,
        file_name = excluded.file_name,
        mime_type = excluded.mime_type,
        file_size_bytes = excluded.file_size_bytes,
        updated_at = now()
    `;
  });
}

async function main() {
  await loadLocalEnv();
  const chordProFiles = await listCanonicalChordProFiles(gloriousChordProDirectory);
  const pdfFiles = await listPdfFilesRecursively(gloriousPdfDirectory);
  const pdfIndex = buildPdfIndex(pdfFiles);
  const mode = process.argv[2] ?? "import";

  if (chordProFiles.length === 0) {
    console.log(`No Glorious ChordPro files found in ${gloriousChordProDirectory}.`);
    return;
  }

  const songs = [];

  for (const fileName of chordProFiles) {
    const filePath = path.join(gloriousChordProDirectory, fileName);
    const chordProContent = cleanupText(await readFile(filePath, "utf8"));
    songs.push(toSongRecord(fileName, chordProContent));
  }

  songs.sort((left, right) => left.title.localeCompare(right.title, "fr"));

  if (mode === "snapshot") {
    await writeJson(gloriousSnapshotPath, {
      generatedAt: new Date().toISOString(),
      source: "glorious-local-files",
      collection: gloriousCollectionCode,
      importedCount: songs.length,
      songs,
    });
    console.log(`Glorious snapshot written to ${gloriousSnapshotPath}.`);
    return;
  }

  const config = resolveConfig();
  const sql = postgres(
    requireConfigValue("DATABASE_URL", config.databaseUrl),
    { max: 1, prepare: false },
  );

  let importedSongs = 0;
  let importedPdfs = 0;
  const unmatchedPdfTitles = [];

  try {
    for (const song of songs) {
      await upsertSong(sql, song);
      importedSongs += 1;

      const pdf = pdfIndex.get(normalizeStem(song.title)) ??
        pdfIndex.get(normalizeStem(song.slug.replace(/^glorious-/, "")));

      if (pdf) {
        await upsertPdf(sql, song.id, pdf, config);
        importedPdfs += 1;
      } else {
        unmatchedPdfTitles.push(song.title);
      }
    }
  } finally {
    await sql.end();
  }

  console.log(
    `Imported ${importedSongs} Glorious songs into collection ${gloriousCollectionCode}.`,
  );
  console.log(`Attached ${importedPdfs} PDF scores.`);

  if (unmatchedPdfTitles.length > 0) {
    console.log(
      `No PDF match for ${unmatchedPdfTitles.length} songs: ${unmatchedPdfTitles.join(", ")}`,
    );
  }
}

await main();
