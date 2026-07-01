import { access } from "node:fs/promises";
import path from "node:path";

export const defaultBaseChantsDirectory = "/home/lcordey/work/base_chants";

const collectionDefinitions = [
  {
    key: "Exo",
    folderName: "Exo",
    collectionCode: "Exo",
    namespace: "exo",
    strategy: "mixed",
    clearable: true,
    official: false,
  },
  {
    key: "Glorious",
    folderName: "Glorious",
    collectionCode: "Glorious",
    namespace: "glorious",
    strategy: "mixed",
    clearable: true,
    official: false,
  },
  {
    key: "LeMont",
    folderName: "LeMont",
    collectionCode: "LeMont",
    namespace: "lemont",
    strategy: "mixed",
    clearable: true,
    official: false,
  },
  {
    key: "JEM",
    folderName: "JEM",
    collectionCode: "JEM",
    namespace: "jem",
    strategy: "official-pdf",
    clearable: false,
    official: true,
    fileNumberPattern: /^(\d{4})-/i,
  },
  {
    key: "JEMK",
    folderName: "JEM KIDs",
    collectionCode: "JEMK",
    namespace: "jemk",
    strategy: "official-pdf",
    clearable: false,
    official: true,
    fileNumberPattern: /^JK(\d{4})-/i,
  },
];

export function listBaseChantsCollections() {
  return collectionDefinitions.map((collection) => ({ ...collection }));
}

function normalizeCollectionToken(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function resolveCollection(token) {
  const normalized = normalizeCollectionToken(token);

  const collection = collectionDefinitions.find((candidate) =>
    [
      candidate.key,
      candidate.folderName,
      candidate.collectionCode,
      candidate.namespace,
      candidate.key === "JEMK" ? "jemkids" : null,
      candidate.key === "JEMK" ? "jemk" : null,
    ]
      .filter(Boolean)
      .map(normalizeCollectionToken)
      .includes(normalized),
  );

  if (!collection) {
    throw new Error(`Unknown collection "${token}".`);
  }

  return { ...collection };
}

export function parseCollectionSelection(argv) {
  const selections = [];
  let all = false;
  let includeOfficial = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = argv[index + 1];

    if (argument === "--collection" && next) {
      selections.push(resolveCollection(next).key);
      index += 1;
      continue;
    }

    if (argument === "--all") {
      all = true;
      continue;
    }

    if (argument === "--include-official") {
      includeOfficial = true;
      continue;
    }
  }

  let collections;

  if (all) {
    collections = collectionDefinitions
      .filter((collection) => includeOfficial || !collection.official)
      .map((collection) => collection.key);
  } else {
    collections = selections;
  }

  if (collections.length === 0) {
    throw new Error(
      "Select at least one collection with --collection <name> or use --all.",
    );
  }

  return [...new Set(collections)].map((key) =>
    resolveCollection(key),
  );
}

export function resolveBaseChantsRoot(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source-root" && argv[index + 1]) {
      return path.resolve(argv[index + 1]);
    }
  }

  return process.env.BASE_CHANTS_DIR ?? defaultBaseChantsDirectory;
}

export function stripBaseChantsSelectionArgs(argv) {
  const filtered = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (
      argument === "--collection" ||
      argument === "--source-root" ||
      argument === "--target"
    ) {
      index += 1;
      continue;
    }

    if (argument === "--all" || argument === "--include-official") {
      continue;
    }

    filtered.push(argument);
  }

  return filtered;
}

export function resolveCollectionPaths(baseRoot, collection) {
  const rootDirectory = path.join(baseRoot, collection.folderName);

  return {
    rootDirectory,
    pdfDirectory: path.join(rootDirectory, "pdf"),
    chordProDirectory: path.join(rootDirectory, "chordpro"),
    musicXmlDirectory: path.join(rootDirectory, "musicxml"),
  };
}

export async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
