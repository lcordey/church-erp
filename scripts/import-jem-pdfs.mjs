import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const projectRoot = process.cwd();
const envFiles = [".env.local", ".env"];
const songPdfBucket = "song-pdfs";
const songPdfMimeType = "application/pdf";
const defaultPdfDirectory = "/mnt/c/Users/lcordey/Downloads";

const jemPdfs = [
  {
    collectionNumber: 1,
    songId: "11111111-1111-4111-8111-111111111111",
    fileName: "0001-J'aime l'Eternel.pdf",
  },
  {
    collectionNumber: 2,
    songId: "22222222-2222-4222-8222-222222222222",
    fileName: "0002-Quand je vois le ciel.pdf",
  },
  {
    collectionNumber: 3,
    songId: "33333333-3333-4333-8333-333333333333",
    fileName: "0003-L'Eternel est mon berger.pdf",
  },
  {
    collectionNumber: 4,
    songId: "44444444-4444-4444-8444-444444444444",
    fileName: "0004-Eternel fais-moi connaître.pdf",
  },
  {
    collectionNumber: 5,
    songId: "55555555-5555-4555-8555-555555555555",
    fileName: "0005-Je t'instruirai.pdf",
  },
];

async function loadEnvFile(fileName) {
  try {
    const content = await readFile(path.join(projectRoot, fileName), "utf8");

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [key, ...valueParts] = trimmed.split("=");
      process.env[key] ??= valueParts.join("=");
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "ENOENT") {
        return;
      }
    }

    throw error;
  }
}

async function loadLocalEnv() {
  for (const envFile of envFiles) {
    await loadEnvFile(envFile);
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function storageObjectUrl(storagePath) {
  const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const encodedPath = storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${supabaseUrl}/storage/v1/object/${songPdfBucket}/${encodedPath}`;
}

async function uploadPdf(storagePath, filePath) {
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const body = await readFile(filePath);

  if (!body.subarray(0, 4).equals(Buffer.from("%PDF"))) {
    throw new Error(`${filePath} is not a PDF file.`);
  }

  const response = await fetch(storageObjectUrl(storagePath), {
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

async function importPdf(sql, pdfDirectory, pdf) {
  const filePath = path.join(pdfDirectory, pdf.fileName);
  const fileStat = await stat(filePath);
  const storagePath = `songs/${pdf.songId}/score.pdf`;

  await uploadPdf(storagePath, filePath);

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

  console.log(
    `JEM ${String(pdf.collectionNumber).padStart(3, "0")} imported: ${pdf.fileName}`,
  );
}

await loadLocalEnv();

const pdfDirectory = process.env.JEM_PDF_DIR || defaultPdfDirectory;
const sql = postgres(requireEnv("DATABASE_URL"), { max: 1, prepare: false });

try {
  for (const pdf of jemPdfs) {
    await importPdf(sql, pdfDirectory, pdf);
  }
} finally {
  await sql.end();
}
