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
import { parseTargetOption, resolveTargetConfig, stripTargetOption } from "./song-import-target.mjs";

function parseArgs(argv) {
  const options = {
    collection: null,
    pdfDir: null,
  };

  const filteredArgv = stripTargetOption(argv);

  for (let index = 0; index < filteredArgv.length; index += 1) {
    const argument = filteredArgv[index];
    const next = filteredArgv[index + 1];

    if (argument === "--collection" && next) {
      options.collection = next;
      index += 1;
      continue;
    }

    if (argument === "--pdf-dir" && next) {
      options.pdfDir = next;
      index += 1;
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
  if (!value || value.startsWith("replace-with-")) {
    throw new Error(`${name} is required.`);
  }

  return value;
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

function getCollectionPattern(collectionCode) {
  if (collectionCode === "JEM") {
    return /^(\d{4})-/i;
  }

  if (collectionCode === "JEMK") {
    return /^JK(\d{4})-/i;
  }

  throw new Error(`Unsupported official PDF collection "${collectionCode}".`);
}

function parseOfficialPdfMetadata(collectionCode, fileName) {
  const pattern = getCollectionPattern(collectionCode);
  const match = fileName.match(pattern);

  if (!match) {
    return null;
  }

  const number = Number.parseInt(match[1], 10);
  const title = path
    .basename(fileName, path.extname(fileName))
    .replace(pattern, "")
    .trim();

  return { number, title };
}

async function listPdfFiles(pdfDirectory) {
  const entries = await readdir(pdfDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "fr"));
}

function buildMissingOfficialSong(collectionCode, number, title) {
  const paddedNumber = String(number).padStart(4, "0");
  const songKey = `${collectionCode}:${paddedNumber}`;
  const songId = createDeterministicUuid("song", songKey);

  return {
    id: songId,
    title,
    slug: `${collectionCode.toLowerCase()}-${slugify(`${paddedNumber}-${title}`)}-${songId.slice(0, 8)}`,
    collection: collectionCode,
    collectionNumber: number,
    chordSourceId: createDeterministicUuid("song-source", `${songKey}:chordpro`),
  };
}

function buildPdfImports(songs, collectionCode, fileNames) {
  const byCollectionNumber = new Map(
    songs
      .filter((song) => song.collection === collectionCode)
      .map((song) => [song.collection_number, song]),
  );

  return fileNames.flatMap((fileName) => {
    const metadata = parseOfficialPdfMetadata(collectionCode, fileName);

    if (!metadata) {
      return [];
    }

    const song =
      byCollectionNumber.get(metadata.number) ??
      buildMissingOfficialSong(collectionCode, metadata.number, metadata.title);

    return [
      {
        song,
        needsCreation: !byCollectionNumber.has(metadata.number),
        fileName,
        label: `${collectionCode} ${String(metadata.number).padStart(4, "0")}`,
      },
    ];
  });
}

async function upsertMissingOfficialSong(sql, song) {
  const placeholder = `{title: ${song.title}}
{comment: Paroles non disponibles dans cette importation officielle.}
Utilise la partition PDF.`;

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

async function upsertPdfSource(sql, songId, storagePath, fileName, fileSizeBytes) {
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
        song_id,
        source_type,
        status,
        storage_path,
        file_name,
        mime_type,
        file_size_bytes
      )
      values (
        ${songId},
        'pdf',
        'active',
        ${storagePath},
        ${fileName},
        ${songPdfMimeType},
        ${fileSizeBytes}
      )
    `;
  });
}

async function importPdf(sql, pdfDirectory, pdf, config) {
  const filePath = path.join(pdfDirectory, pdf.fileName);
  const fileStat = await stat(filePath);
  const storagePath = `songs/${pdf.song.id}/score.pdf`;

  await uploadPdf(storagePath, filePath, config);
  await upsertPdfSource(sql, pdf.song.id, storagePath, pdf.fileName, fileStat.size);

  console.log(`${pdf.label} imported: ${pdf.fileName}`);
}

async function main() {
  await loadLocalEnv();

  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const target = parseTargetOption(argv);
  const collectionCode = requireOption("collection", args.collection);
  const pdfDirectory = requireOption("pdf-dir", args.pdfDir);
  const config = resolveTargetConfig(target);
  const sql = postgres(
    requireConfigValue("DATABASE_URL", config.databaseUrl),
    { max: 1, prepare: false },
  );

  try {
    const songs = await sql`
      select id, collection, collection_number
      from songs
      where collection = ${collectionCode}
        and collection_number is not null
    `;
    const fileNames = await listPdfFiles(pdfDirectory);
    const imports = buildPdfImports(songs, collectionCode, fileNames);

    if (imports.length === 0) {
      console.log(`No official PDF imports found for ${collectionCode} in ${pdfDirectory}.`);
      return;
    }

    for (const pdf of imports) {
      if (pdf.needsCreation) {
        await upsertMissingOfficialSong(sql, pdf.song);
      }
      await importPdf(sql, pdfDirectory, pdf, config);
    }

    console.log(`Imported ${imports.length} official PDFs into collection ${collectionCode}.`);
  } finally {
    await sql.end();
  }
}

await main();
