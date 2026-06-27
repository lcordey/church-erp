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
  "eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0." +
  "EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const musicXmlMimeType = "application/vnd.recordare.musicxml+xml";

function parseArgs(argv) {
  const options = {
    collection: null,
    namespace: null,
    musicXmlDir: null,
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

    if (argument === "--musicxml-dir" && next) {
      options.musicXmlDir = next;
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
  const databaseUrl = process.env.LOCAL_DATABASE_URL ?? localDatabaseUrl;
  const useLocalDefaults = databaseUrl === localDatabaseUrl;

  return {
    databaseUrl,
    supabaseUrl:
      process.env.LOCAL_SUPABASE_URL ??
      (useLocalDefaults ? localSupabaseUrl : null),
    serviceRoleKey:
      process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY ??
      (useLocalDefaults ? localServiceRoleKey : null),
  };
}

function cleanupText(content) {
  return content.replace(/\r\n/g, "\n").trim();
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function normalizeStem(value) {
  return normalizeAscii(value)
    .toLowerCase()
    .replace(/\.(musicxml|xml|pdf)$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function buildFileIndex(filePaths) {
  const index = new Map();

  for (const filePath of filePaths) {
    const fileName = path.basename(filePath);
    const key = normalizeStem(fileName);

    if (!key || index.has(key)) {
      continue;
    }

    index.set(key, {
      fileName,
      path: filePath,
    });
  }

  return index;
}

function looksLikeMusicXml(content) {
  return /<\s*(score-partwise|score-timewise)\b/i.test(content);
}

function extractMusicXmlTitle(content, fallbackTitle) {
  const patterns = [
    /<work-title>([\s\S]*?)<\/work-title>/i,
    /<movement-title>([\s\S]*?)<\/movement-title>/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);

    if (match) {
      const title = cleanupText(decodeXmlEntities(match[1].replace(/<[^>]+>/g, "")));

      if (title) {
        return title;
      }
    }
  }

  return fallbackTitle;
}

function extractMusicXmlCreators(content) {
  const creators = [...content.matchAll(/<creator(?:\s+type="([^"]*)")?>([\s\S]*?)<\/creator>/gi)]
    .map((match) => cleanupText(decodeXmlEntities(match[2].replace(/<[^>]+>/g, ""))))
    .filter(Boolean)
    .filter((creator) => creator.toLowerCase() !== "music21");

  return creators.length > 0 ? creators.join(" - ") : null;
}

function toSupportedKey(fifths, mode) {
  const majorKeys = {
    "-7": "B",
    "-6": "F#",
    "-5": "Db",
    "-4": "Ab",
    "-3": "Eb",
    "-2": "Bb",
    "-1": "F",
    "0": "C",
    "1": "G",
    "2": "D",
    "3": "A",
    "4": "E",
    "5": "B",
    "6": "F#",
    "7": "Db",
  };
  const minorKeys = {
    "-7": "G#m",
    "-6": "Ebm",
    "-5": "Bbm",
    "-4": "Fm",
    "-3": "Cm",
    "-2": "Gm",
    "-1": "Dm",
    "0": "Am",
    "1": "Em",
    "2": "Bm",
    "3": "F#m",
    "4": "C#m",
    "5": "G#m",
    "6": "Ebm",
    "7": "Bbm",
  };

  if (mode === "minor") {
    return minorKeys[String(fifths)] ?? null;
  }

  return majorKeys[String(fifths)] ?? null;
}

function extractMusicXmlDefaultKey(content) {
  const fifthsMatch = content.match(/<fifths>(-?\d+)<\/fifths>/i);
  const modeMatch = content.match(/<mode>(major|minor)<\/mode>/i);

  if (!fifthsMatch) {
    return null;
  }

  return toSupportedKey(
    Number.parseInt(fifthsMatch[1], 10),
    modeMatch?.[1]?.toLowerCase() ?? "major",
  );
}

function buildPlaceholderChordPro(title) {
  return cleanupText(`{title: ${title}}
{comment: Paroles non disponibles dans cette importation.}
Utilise la partition MusicXML ou le PDF.`);
}

function toSongRecord({
  collectionCode,
  namespace,
  fileStem,
  musicXmlContent,
}) {
  const title = extractMusicXmlTitle(musicXmlContent, fileStem);
  const slug = `${namespace}-${slugify(fileStem)}`;
  const songKey = `${collectionCode}:${fileStem}`;
  const songId = createDeterministicUuid("song", songKey);

  return {
    id: songId,
    title,
    slug,
    status: "published",
    author: extractMusicXmlCreators(musicXmlContent),
    copyright: null,
    defaultKey: extractMusicXmlDefaultKey(musicXmlContent),
    collection: collectionCode,
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: false,
    chordProContent: buildPlaceholderChordPro(title),
    musicXmlContent,
    chordSourceId: createDeterministicUuid("song-source", `${songKey}:chordpro`),
    musicXmlSourceId: createDeterministicUuid("song-source", `${songId}:musicxml`),
  };
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

async function upsertSong(sql, song, musicXmlFileName, musicXmlFileSizeBytes) {
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

    await transaction`
      update song_sources
      set status = 'archived', updated_at = now()
      where song_id = ${song.id}
        and source_type = 'musicxml'
        and status = 'active'
        and id <> ${song.musicXmlSourceId}
    `;

    await transaction`
      insert into song_sources (
        id,
        song_id,
        source_type,
        status,
        text_content,
        file_name,
        mime_type,
        file_size_bytes
      )
      values (
        ${song.musicXmlSourceId},
        ${song.id},
        'musicxml',
        'active',
        ${song.musicXmlContent},
        ${musicXmlFileName},
        ${musicXmlMimeType},
        ${musicXmlFileSizeBytes}
      )
      on conflict (id) do update set
        song_id = excluded.song_id,
        source_type = excluded.source_type,
        status = excluded.status,
        text_content = excluded.text_content,
        file_name = excluded.file_name,
        mime_type = excluded.mime_type,
        file_size_bytes = excluded.file_size_bytes,
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
  const musicXmlDirectory = requireOption("musicxml-dir", args.musicXmlDir);
  const pdfDirectory = args.pdfDir;
  const config = resolveConfig();

  const musicXmlFiles = await listFilesRecursively(
    musicXmlDirectory,
    (fileName) => /\.(musicxml|xml)$/i.test(fileName),
  );

  if (musicXmlFiles.length === 0) {
    console.log(`No MusicXML files found in ${musicXmlDirectory}.`);
    return;
  }

  const pdfFiles = pdfDirectory
    ? await listFilesRecursively(
      pdfDirectory,
      (fileName) => fileName.toLowerCase().endsWith(".pdf"),
    )
    : [];

  const musicXmlIndex = buildFileIndex(musicXmlFiles);
  const pdfIndex = buildFileIndex(pdfFiles);
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
  const songsWithoutPdf = [];
  const pdfUploadSkipped = [];

  try {
    for (const [stem, musicXml] of musicXmlIndex.entries()) {
      const musicXmlContent = cleanupText(await readFile(musicXml.path, "utf8"));

      if (!looksLikeMusicXml(musicXmlContent)) {
        throw new Error(`${musicXml.path} does not look like a MusicXML file.`);
      }

      const fileStat = await stat(musicXml.path);
      const song = toSongRecord({
        collectionCode,
        namespace,
        fileStem: path.basename(musicXml.fileName, path.extname(musicXml.fileName)),
        musicXmlContent,
      });

      await upsertSong(sql, song, musicXml.fileName, fileStat.size);
      importedSongs += 1;

      const pdf = pdfIndex.get(stem);

      if (!pdf) {
        songsWithoutPdf.push(song.title);
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

  if (songsWithoutPdf.length > 0) {
    console.log(
      `No PDF match for ${songsWithoutPdf.length} songs: ${songsWithoutPdf.join(", ")}`,
    );
  }

  if (pdfUploadSkipped.length > 0) {
    console.log(
      `PDF upload skipped for ${pdfUploadSkipped.length} songs: ${pdfUploadSkipped.join(", ")}`,
    );
  }
}

await main();
