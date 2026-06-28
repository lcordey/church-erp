import postgres from "postgres";

import { loadLocalEnv, songPdfBucket } from "./song-pdf-library.mjs";

const localDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:15432/postgres";
const localSupabaseUrl = "http://127.0.0.1:15431";
const localServiceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdWJhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0." +
  "EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

function parseArgs(argv) {
  const options = {
    collection: null,
    skipPdfDelete: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = argv[index + 1];

    if (argument === "--collection" && next) {
      options.collection = next;
      index += 1;
      continue;
    }

    if (argument === "--skip-pdf-delete") {
      options.skipPdfDelete = true;
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

function storageObjectUrl(storagePath, supabaseUrl) {
  const normalizedUrl = requireConfigValue("SUPABASE_URL", supabaseUrl).replace(/\/$/, "");
  const encodedPath = storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${normalizedUrl}/storage/v1/object/${songPdfBucket}/${encodedPath}`;
}

async function deletePdf(storagePath, config) {
  const serviceKey = requireConfigValue(
    "SUPABASE_SERVICE_ROLE_KEY",
    config.serviceRoleKey,
  );

  const response = await fetch(storageObjectUrl(storagePath, config.supabaseUrl), {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Storage delete failed for ${storagePath}: ${response.status} ${await response.text()}`,
    );
  }
}

async function main() {
  await loadLocalEnv();

  const args = parseArgs(process.argv.slice(2));
  const collection = requireOption("collection", args.collection);
  const config = resolveConfig();
  const sql = postgres(
    requireConfigValue("DATABASE_URL", config.databaseUrl),
    { max: 1, prepare: false },
  );
  const canDeletePdfs =
    !args.skipPdfDelete &&
    Boolean(config.supabaseUrl) &&
    Boolean(config.serviceRoleKey);

  try {
    const songs = await sql`
      select id, title
      from songs
      where collection = ${collection}
      order by title
    `;

    if (songs.length === 0) {
      console.log(`No songs found in collection ${collection}.`);
      return;
    }

    const songIds = songs.map((song) => song.id);
    const pdfSources = await sql`
      select distinct storage_path
      from song_sources
      where song_id in ${sql(songIds)}
        and source_type = 'pdf'
        and storage_path is not null
    `;

    let deletedPdfs = 0;

    if (canDeletePdfs) {
      for (const source of pdfSources) {
        await deletePdf(source.storage_path, config);
        deletedPdfs += 1;
      }
    }

    await sql.begin(async (transaction) => {
      await transaction`
        delete from setlist_items
        where song_id in ${sql(songIds)}
      `;

      await transaction`
        delete from songs
        where id in ${sql(songIds)}
      `;
    });

    console.log(`Deleted ${songs.length} songs from collection ${collection}.`);

    if (canDeletePdfs) {
      console.log(`Deleted ${deletedPdfs} PDF storage objects.`);
    } else if (pdfSources.length > 0) {
      console.log("Skipped PDF storage deletes because the target storage configuration is unavailable.");
    }
  } finally {
    await sql.end();
  }
}

await main();
