import path from "node:path";
import { readFile, readdir, stat } from "node:fs/promises";

import postgres from "postgres";

import {
  createDeterministicUuid,
  loadLocalEnv,
  normalizeAscii,
  slugify,
  songPdfBucket,
  songPdfMimeType,
} from "./song-pdf-library.mjs";

const localDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:15432/postgres";
const localSupabaseUrl = "http://127.0.0.1:15431";
const localServiceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdWJhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0." +
  "EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

function parseArgs(argv) {
  const options = {
    collection: null,
    namespace: null,
    chordProDir: null,
    pdfDir: null,
    skipPdf: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = argv[index + 1];

    if (argument === "--collection" && next) {
      options.collection = next;
      index += 1;
      continue;
    }

    if (argument === "--namespace" && next) {
      options.namespace = next;
      index += 1;
      continue;
    }

    if (argument === "--chordpro-dir" && next) {
      options.chordProDir = next;
      index += 1;
      continue;
    }

    if (argument === "--pdf-dir" && next) {
      options.pdfDir = next;
      index += 1;
      continue;
    }

    if (argument === "--skip-pdf") {
      options.skipPdf = true;
      continue;
    }
  }

  return options;
}

function requireOption(name, value) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function requireConfigValue(name, value) {
  const resolved = value;

  if (!resolved || resolved.startsWith("replace-with-")) {
    throw new Error(`${name} is required.`);
  }

  return resolved;
}

function resolveConfig() {
  const databaseUrl =
    process.env.DATABASE_URL ?? process.env.LOCAL_DATABASE_URL ?? localDatabaseUrl;
  const useLocalDefaults =
    !process.env.SUPABASE_URL &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY &&
    databaseUrl === localDatabaseUrl;

  return {
    databaseUrl,
    supabaseUrl:
      process.env.SUPABASE_URL ??
      process.env.LOCAL_SUPABASE_URL ??
      (useLocalDefaults ? localSupabaseUrl : null),
    serviceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY ??
      (useLocalDefaults ? localServiceRoleKey : null),
  };
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
    .replace(/\.(cho|chordpro|pdf)$/i, "")
    .replace(/\bexo\b/g, "")
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

function chordProVariantScore(fileName) {
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

async function listFilesRecursively(directory, matcher) {
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
      files.push(...(await listFilesRecursively(entryPath, matcher)));
      continue;
    }

    if (entry.isFile() && matcher(entry.name)) {
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

function toSongRecord(filePath, chordProContent, collectionCode, namespace) {
  const extension = path.extname(filePath);
  const fileStem = path.basename(filePath, extension);
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
  const slug = `${namespace}-${slugify(fileStem)}`;
  const songKey = `${collectionCode}:${fileStem}`;
  const songId = createDeterministicUuid("song", songKey);

  return {
    id: songId,
    title,
    slug,
    status: "published",
    author,
    copyright,
    defaultKey,
    collection: collectionCode,
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: false,
    chordSourceId: createDeterministicUuid("song-source", `${songKey}:chordpro`),
    chordProContent,
  };
}

function buildPreferredSongs(songEntries) {
  const index = new Map();

  for (const entry of songEntries) {
    const current = index.get(entry.song.slug);

    if (
      !current ||
      entry.score > current.score ||
      (entry.score === current.score &&
        entry.song.slug.localeCompare(current.song.slug, "fr") < 0) ||
      (entry.score === current.score &&
        entry.song.slug === current.song.slug &&
        entry.fileName.localeCompare(current.fileName, "fr") < 0)
    ) {
      index.set(entry.song.slug, entry);
    }
  }

  return [...index.values()].map((entry) => entry.song);
}

function storageObjectUrl(storagePath, supabaseUrl) {
  const normalizedUrl = requireConfigValue("SUPABASE_URL", supabaseUrl).replace(/\/$/, "");
  const encodedPath = storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${normalizedUrl}/storage/v1/object/${songPdfBucket}/${encodedPath}`;
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

  const args = parseArgs(process.argv.slice(2));
  const collectionCode = requireOption("collection", args.collection);
  const namespace = args.namespace ?? collectionCode.toLowerCase();
  const chordProDirectory = requireOption("chordpro-dir", args.chordProDir);
  const pdfDirectory = args.pdfDir;
  const config = resolveConfig();

  const chordProFiles = await listFilesRecursively(
    chordProDirectory,
    (fileName) => /\.(cho|chordpro)$/i.test(fileName),
  );

  if (chordProFiles.length === 0) {
    console.log(`No ChordPro files found in ${chordProDirectory}.`);
    return;
  }

  const songEntries = [];

  for (const filePath of chordProFiles) {
    const chordProContent = cleanupText(await readFile(filePath, "utf8"));
    songEntries.push({
      fileName: path.basename(filePath),
      score: chordProVariantScore(path.basename(filePath)),
      song: toSongRecord(filePath, chordProContent, collectionCode, namespace),
    });
  }

  const songs = buildPreferredSongs(songEntries);
  songs.sort((left, right) => left.title.localeCompare(right.title, "fr"));

  const pdfFiles = pdfDirectory
    ? await listFilesRecursively(
      pdfDirectory,
      (fileName) => fileName.toLowerCase().endsWith(".pdf"),
    )
    : [];
  const pdfIndex = buildPdfIndex(pdfFiles);
  const sql = postgres(
    requireConfigValue("DATABASE_URL", config.databaseUrl),
    { max: 1, prepare: false },
  );
  const canUploadPdfs =
    !args.skipPdf &&
    Boolean(config.supabaseUrl) &&
    Boolean(config.serviceRoleKey);

  let importedSongs = 0;
  let importedPdfs = 0;
  const unmatchedPdfTitles = [];
  const pdfUploadSkipped = [];

  try {
    for (const song of songs) {
      await upsertSong(sql, song);
      importedSongs += 1;

      const pdf = pdfIndex.get(normalizeStem(song.title)) ??
        pdfIndex.get(normalizeStem(song.slug.replace(`${namespace}-`, "")));

      if (!pdf) {
        unmatchedPdfTitles.push(song.title);
        continue;
      }

      if (!canUploadPdfs) {
        pdfUploadSkipped.push(song.title);
        continue;
      }

      await upsertPdf(sql, song.id, pdf, config);
      importedPdfs += 1;
    }
  } finally {
    await sql.end();
  }

  console.log(`Imported ${importedSongs} songs into collection ${collectionCode}.`);

  if (canUploadPdfs) {
    console.log(`Attached ${importedPdfs} PDF scores.`);
  } else if (pdfFiles.length > 0) {
    console.log("Skipped PDF uploads because the target storage configuration is unavailable.");
  }

  if (unmatchedPdfTitles.length > 0) {
    console.log(
      `No PDF match for ${unmatchedPdfTitles.length} songs: ${unmatchedPdfTitles.join(", ")}`,
    );
  }

  if (pdfUploadSkipped.length > 0) {
    console.log(
      `PDF upload skipped for ${pdfUploadSkipped.length} songs: ${pdfUploadSkipped.join(", ")}`,
    );
  }
}

await main();
