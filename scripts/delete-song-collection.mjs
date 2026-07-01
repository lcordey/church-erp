import postgres from "postgres";

import { loadLocalEnv, songPdfBucket } from "./song-pdf-library.mjs";
import { parseTargetOption, resolveTargetConfig, stripTargetOption } from "./song-import-target.mjs";

function parseArgs(argv) {
  const options = {
    collection: null,
    skipPdfDelete: false,
    sourceTypes: [],
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

    if (argument === "--skip-pdf-delete") {
      options.skipPdfDelete = true;
      continue;
    }

    if (argument === "--source-type" && next) {
      options.sourceTypes.push(next);
      index += 1;
      continue;
    }

    if (argument === "--source-types" && next) {
      options.sourceTypes.push(
        ...next
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      );
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
  const resolved = value;

  if (!resolved || resolved.startsWith("replace-with-")) {
    throw new Error(`${name} is required.`);
  }

  return resolved;
}

const supportedSourceTypes = new Set(["chordpro", "musicxml", "pdf", "youtube"]);

function normalizeSourceTypes(sourceTypes) {
  const normalized = [...new Set(sourceTypes.map((value) => value.trim().toLowerCase()))];

  for (const sourceType of normalized) {
    if (!supportedSourceTypes.has(sourceType)) {
      throw new Error(
        `Unsupported source type "${sourceType}". Use one of: ${[...supportedSourceTypes].join(", ")}.`,
      );
    }
  }

  return normalized;
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
  const target = parseTargetOption(process.argv.slice(2));
  const collection = requireOption("collection", args.collection);
  const sourceTypes = normalizeSourceTypes(args.sourceTypes);
  const config = resolveTargetConfig(target);
  const sql = postgres(
    requireConfigValue("DATABASE_URL", config.databaseUrl),
    { max: 1, prepare: false },
  );
  const canDeletePdfs =
    !args.skipPdfDelete &&
    Boolean(config.supabaseUrl) &&
    Boolean(config.serviceRoleKey);
  const isSourceScopedDelete = sourceTypes.length > 0;

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
    const sourceTypeSql = isSourceScopedDelete ? sql(sourceTypes) : null;
    const pdfSources = await sql`
      select distinct storage_path
      from song_sources
      where song_id in ${sql(songIds)}
        and source_type = 'pdf'
        and storage_path is not null
        ${isSourceScopedDelete ? sql`and source_type in ${sourceTypeSql}` : sql``}
    `;

    let deletedPdfs = 0;

    if (canDeletePdfs) {
      for (const source of pdfSources) {
        await deletePdf(source.storage_path, config);
        deletedPdfs += 1;
      }
    }

    if (isSourceScopedDelete) {
      const deletedSources = await sql`
        delete from song_sources
        where song_id in ${sql(songIds)}
          and source_type in ${sourceTypeSql}
        returning id
      `;

      console.log(
        `Deleted ${deletedSources.length} sources (${sourceTypes.join(", ")}) from collection ${collection}.`,
      );
    } else {
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
    }

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
