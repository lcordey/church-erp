import path from "node:path";
import { readFile, readdir, stat } from "node:fs/promises";

import postgres from "postgres";

import {
  createDeterministicUuid,
  loadLocalEnv,
  slugify,
  songPdfBucket,
  songPdfMimeType,
} from "./song-pdf-library.mjs";
import {
  parseTargetOption,
  resolveTargetConfig,
  stripTargetOption,
} from "./song-import-target.mjs";

function parseArgs(argv) {
  const options = {
    collection: null,
    namespace: null,
    pdfDir: null,
    skipPdf: false,
  };
  const filteredArgv = stripTargetOption(argv);

  for (let index = 0; index < filteredArgv.length; index += 1) {
    const argument = filteredArgv[index];
    const next = filteredArgv[index + 1];

    if (argument === "--collection" && next) {
      options.collection = next;
      index += 1;
    } else if (argument === "--namespace" && next) {
      options.namespace = next;
      index += 1;
    } else if (argument === "--pdf-dir" && next) {
      options.pdfDir = next;
      index += 1;
    } else if (argument === "--skip-pdf") {
      options.skipPdf = true;
    }
  }

  return options;
}

function requireValue(name, value) {
  if (!value || value.startsWith("replace-with-")) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function parseCanonicalIdentity(filePath, collection, namespace) {
  const fileName = path.basename(filePath);
  const fileStem = path.basename(fileName, path.extname(fileName));
  const numberedTitle = fileStem.match(/^(\d{4})\s*(?:-\s*|\s+)(.+)$/);
  const title = numberedTitle?.[2]?.trim() || fileStem;
  const collectionNumber = numberedTitle
    ? Number.parseInt(numberedTitle[1], 10)
    : null;
  const songKey = `${collection}:${fileStem}`;
  const id = createDeterministicUuid("song", songKey);

  return {
    id,
    title,
    slug: `${namespace}-${slugify(fileStem)}-${id.slice(0, 8)}`,
    collection,
    collectionNumber,
    fileName,
    filePath,
    chordSourceId: createDeterministicUuid("song-source", `${songKey}:chordpro`),
  };
}

async function listPdfFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listPdfFiles(entryPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right, "fr"));
}

function storageObjectUrl(storagePath, supabaseUrl) {
  const normalizedUrl = requireValue("SUPABASE_URL", supabaseUrl).replace(/\/$/, "");
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${normalizedUrl}/storage/v1/object/${songPdfBucket}/${encodedPath}`;
}

async function uploadPdf(storagePath, filePath, config) {
  const serviceKey = requireValue(
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

async function upsertCanonicalSong(sql, song) {
  const placeholder = `{title: ${song.title}}
{comment: Paroles non disponibles dans cette importation.}
Utilise la partition PDF ou MusicXML.`;

  await sql.begin(async (transaction) => {
    await transaction`
      insert into songs (
        id, title, slug, status, author, copyright, default_key, collection,
        collection_number, source_page_url, is_editable
      )
      values (
        ${song.id}, ${song.title}, ${song.slug}, 'published', null, null, null,
        ${song.collection}, ${song.collectionNumber}, null, false
      )
      on conflict (id) do update set
        title = excluded.title,
        slug = excluded.slug,
        status = excluded.status,
        collection = excluded.collection,
        collection_number = excluded.collection_number,
        is_editable = excluded.is_editable,
        updated_at = now()
    `;

    await transaction`
      insert into song_sources (
        id, song_id, source_type, status, text_content, external_url
      )
      values (
        ${song.chordSourceId}, ${song.id}, 'chordpro', 'active',
        ${placeholder}, null
      )
      on conflict (id) do nothing
    `;
  });
}

async function upsertPdf(sql, song, config) {
  const fileStat = await stat(song.filePath);
  const storagePath = `songs/${song.id}/score.pdf`;
  const sourceId = createDeterministicUuid("song-source", `${song.id}:pdf`);

  await uploadPdf(storagePath, song.filePath, config);
  await sql.begin(async (transaction) => {
    await transaction`
      update song_sources
      set status = 'archived', updated_at = now()
      where song_id = ${song.id}
        and source_type = 'pdf'
        and status = 'active'
        and id <> ${sourceId}
    `;
    await transaction`
      insert into song_sources (
        id, song_id, source_type, status, storage_path, file_name, mime_type,
        file_size_bytes
      )
      values (
        ${sourceId}, ${song.id}, 'pdf', 'active', ${storagePath},
        ${song.fileName}, ${songPdfMimeType}, ${fileStat.size}
      )
      on conflict (id) do update set
        song_id = excluded.song_id,
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

  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const target = parseTargetOption(argv);
  const collection = requireValue("collection", args.collection);
  const namespace = args.namespace ?? collection.toLowerCase();
  const pdfDirectory = requireValue("pdf-dir", args.pdfDir);
  const config = resolveTargetConfig(target);
  const pdfFiles = await listPdfFiles(pdfDirectory);
  const songs = pdfFiles.map((filePath) =>
    parseCanonicalIdentity(filePath, collection, namespace)
  );
  const collectionNumberCounts = new Map();
  for (const song of songs) {
    if (song.collectionNumber !== null) {
      collectionNumberCounts.set(
        song.collectionNumber,
        (collectionNumberCounts.get(song.collectionNumber) ?? 0) + 1,
      );
    }
  }
  for (const song of songs) {
    if ((collectionNumberCounts.get(song.collectionNumber) ?? 0) > 1) {
      song.collectionNumber = null;
    }
  }
  const sql = postgres(requireValue("DATABASE_URL", config.databaseUrl), {
    max: 1,
    prepare: false,
  });
  const canUpload =
    !args.skipPdf &&
    Boolean(config.supabaseUrl) &&
    Boolean(config.serviceRoleKey);
  let uploaded = 0;

  try {
    for (const song of songs) {
      await upsertCanonicalSong(sql, song);
      if (canUpload) {
        await upsertPdf(sql, song, config);
        uploaded += 1;
      }
    }
  } finally {
    await sql.end();
  }

  console.log(`Canonicalized ${songs.length} PDF-backed songs in ${collection}.`);
  console.log(canUpload ? `Attached ${uploaded} PDF scores.` : "Skipped PDF uploads.");
}

await main();
