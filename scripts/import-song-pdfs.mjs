import path from "node:path";
import { readFile, stat } from "node:fs/promises";

import postgres from "postgres";

import {
  defaultPdfDirectory,
  jemafSnapshotPath,
  listPdfFiles,
  loadLocalEnv,
  padCollectionNumber,
  readJsonIfExists,
  songPdfBucket,
  songPdfMimeType,
} from "./song-pdf-library.mjs";

const localDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:15432/postgres";
const localSupabaseUrl = "http://127.0.0.1:15431";
const localServiceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0." +
  "EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

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

async function importPdf(sql, pdfDirectory, pdf, config) {
  const filePath = path.join(pdfDirectory, pdf.fileName);
  const fileStat = await stat(filePath);
  const storagePath = `songs/${pdf.songId}/score.pdf`;

  await uploadPdf(storagePath, filePath, config);

  await sql.begin(async (transaction) => {
    await transaction`
      update song_sources
      set status = 'archived', updated_at = now()
      where song_id = ${pdf.songId}
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
        ${pdf.songId},
        'pdf',
        'active',
        ${storagePath},
        ${pdf.fileName},
        ${songPdfMimeType},
        ${fileStat.size}
      )
    `;
  });

  console.log(`${pdf.label} imported: ${pdf.fileName}`);
}

function buildJemPdfImports(jemafSnapshot, fileNames) {
  const byCollectionNumber = new Map(
    (jemafSnapshot?.songs ?? [])
      .filter((song) => song.collection === "JEM")
      .map((song) => [song.collectionNumber, song]),
  );

  return fileNames
    .filter((fileName) => /^\d{4}-/.test(fileName))
    .flatMap((fileName) => {
      const number = Number.parseInt(fileName.slice(0, 4), 10);
      const song = byCollectionNumber.get(number);

      if (!song) {
        return [];
      }

      return [
        {
          songId: song.id,
          fileName,
          label: `JEM ${padCollectionNumber(number)}`,
        },
      ];
    });
}

async function main() {
  await loadLocalEnv();
  const config = resolveConfig();

  const pdfDirectory = process.env.SONG_PDF_DIR || process.env.JEM_PDF_DIR || defaultPdfDirectory;
  const fileNames = await listPdfFiles(pdfDirectory);
  const jemafSnapshot = await readJsonIfExists(jemafSnapshotPath);
  const imports = buildJemPdfImports(jemafSnapshot, fileNames);

  if (imports.length === 0) {
    console.log(`No PDF imports found in ${pdfDirectory}.`);
    return;
  }

  let sql;

  try {
    sql = postgres(
      requireConfigValue("DATABASE_URL", config.databaseUrl),
      { max: 1, prepare: false },
    );
  } catch (error) {
    console.log(`Skipping PDF import: ${error.message}`);
    return;
  }

  try {
    for (const pdf of imports) {
      await importPdf(sql, pdfDirectory, pdf, config);
    }
  } finally {
    await sql.end();
  }
}

await main();
