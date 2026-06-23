import path from "node:path";
import { readFile, readdir, stat } from "node:fs/promises";

import postgres from "postgres";

import {
  createDeterministicUuid,
  loadLocalEnv,
  normalizeAscii,
} from "./song-pdf-library.mjs";

const localDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:15432/postgres";
const gloriousMusicXmlDirectory =
  process.env.GLORIOUS_MUSICXML_DIR ??
  "/home/lcordey/work/download_for_church_erp/Glorious_MusicXML/musicxml";
const gloriousCollectionCode = "Glorious";
const musicXmlMimeType = "application/vnd.recordare.musicxml+xml";

function requireConfigValue(name, value) {
  const resolved = value;

  if (!resolved || resolved.startsWith("replace-with-")) {
    throw new Error(`${name} is required.`);
  }

  return resolved;
}

function cleanupText(content) {
  return content.replace(/\r\n/g, "\n").trim();
}

function normalizeStem(value) {
  return normalizeAscii(value)
    .toLowerCase()
    .replace(/\.(musicxml|xml)$/i, "")
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

function musicXmlVariantScore(fileName) {
  const normalized = normalizeAscii(fileName).toLowerCase();
  let score = 0;

  if (!normalized.includes(" or")) {
    score += 8;
  }

  if (!normalized.includes(" 1p")) {
    score += 4;
  }

  if (!normalized.includes("original")) {
    score += 2;
  }

  if (!/\(\d+\)/.test(normalized)) {
    score += 1;
  }

  return score;
}

async function listMusicXmlFilesRecursively(directory) {
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
      files.push(...(await listMusicXmlFilesRecursively(entryPath)));
      continue;
    }

    if (entry.isFile() && /\.(musicxml|xml)$/i.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right, "fr"));
}

function buildMusicXmlIndex(filePaths) {
  const index = new Map();

  for (const filePath of filePaths) {
    const fileName = path.basename(filePath);
    const key = normalizeStem(fileName);

    if (!key) {
      continue;
    }

    const candidate = {
      fileName,
      path: filePath,
      score: musicXmlVariantScore(fileName),
    };
    const current = index.get(key);

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

function looksLikeMusicXml(content) {
  return /<\s*(score-partwise|score-timewise)\b/i.test(content);
}

async function upsertMusicXml(sql, song, musicXml) {
  const content = cleanupText(await readFile(musicXml.path, "utf8"));

  if (!looksLikeMusicXml(content)) {
    throw new Error(`${musicXml.path} does not look like a MusicXML file.`);
  }

  const fileStat = await stat(musicXml.path);
  const sourceId = createDeterministicUuid("song-source", `${song.id}:musicxml`);

  await sql.begin(async (transaction) => {
    await transaction`
      update song_sources
      set status = 'archived', updated_at = now()
      where song_id = ${song.id}
        and source_type = 'musicxml'
        and status = 'active'
        and id <> ${sourceId}
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
        ${sourceId},
        ${song.id},
        'musicxml',
        'active',
        ${content},
        ${musicXml.fileName},
        ${musicXmlMimeType},
        ${fileStat.size}
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

async function main() {
  await loadLocalEnv();

  const filePaths = await listMusicXmlFilesRecursively(gloriousMusicXmlDirectory);

  if (filePaths.length === 0) {
    console.log(`No Glorious MusicXML files found in ${gloriousMusicXmlDirectory}.`);
    return;
  }

  const sql = postgres(
    requireConfigValue(
      "DATABASE_URL",
      process.env.LOCAL_DATABASE_URL ?? localDatabaseUrl,
    ),
    { max: 1, prepare: false },
  );

  const musicXmlIndex = buildMusicXmlIndex(filePaths);
  const unmatchedSongs = [];
  const usedFiles = new Set();
  let attachedCount = 0;

  try {
    const songs = await sql`
      select id, title, slug
      from songs
      where collection = ${gloriousCollectionCode}
      order by title
    `;

    for (const song of songs) {
      const candidates = [
        normalizeStem(song.title),
        normalizeStem(song.slug.replace(/^glorious-/, "")),
      ];
      const musicXml = candidates
        .map((candidate) => musicXmlIndex.get(candidate))
        .find(Boolean);

      if (!musicXml) {
        unmatchedSongs.push(song.title);
        continue;
      }

      await upsertMusicXml(sql, song, musicXml);
      usedFiles.add(musicXml.path);
      attachedCount += 1;
      console.log(`${song.title} imported: ${musicXml.fileName}`);
    }
  } finally {
    await sql.end();
  }

  const unusedFiles = filePaths.filter((filePath) => !usedFiles.has(filePath));

  console.log(`Attached ${attachedCount} Glorious MusicXML scores.`);

  if (unmatchedSongs.length > 0) {
    console.log(
      `No MusicXML match for ${unmatchedSongs.length} songs: ${unmatchedSongs.join(", ")}`,
    );
  }

  if (unusedFiles.length > 0) {
    console.log(
      `Unused MusicXML files (${unusedFiles.length}): ${unusedFiles
        .map((filePath) => path.basename(filePath))
        .join(", ")}`,
    );
  }
}

await main();
