import { spawn } from "node:child_process";
import path from "node:path";

import { loadLocalEnv } from "./song-pdf-library.mjs";
import {
  parseCollectionSelection,
  resolveBaseChantsRoot,
  resolveCollectionPaths,
  pathExists,
  stripBaseChantsSelectionArgs,
} from "./base-chants-library.mjs";
import { buildTargetEnv, parseTargetOption, stripTargetOption } from "./song-import-target.mjs";

async function runNodeScript(scriptName, args, target) {
  const scriptPath = path.join(process.cwd(), "scripts", scriptName);

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: "inherit",
      env: buildTargetEnv(target),
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptName} exited with code ${code ?? "unknown"}.`));
    });
    child.on("error", reject);
  });
}

async function importMixedCollection(collection, paths, target, argv) {
  const sharedArgs = ["--collection", collection.collectionCode, "--target", target];

  await runNodeScript(
    "import-pdf-catalog.mjs",
    [
      ...sharedArgs,
      "--namespace",
      collection.namespace,
      "--pdf-dir",
      paths.pdfDirectory,
      ...argv,
    ],
    target,
  );

  if (await pathExists(paths.chordProDirectory)) {
    await runNodeScript(
      "import-chordpro-catalog.mjs",
      [
        ...sharedArgs,
        "--namespace",
        collection.namespace,
        "--chordpro-dir",
        paths.chordProDirectory,
        "--skip-pdf",
        ...argv,
      ],
      target,
    );
  }

  if (await pathExists(paths.musicXmlDirectory)) {
    await runNodeScript(
      "import-musicxml-catalog.mjs",
      [
        ...sharedArgs,
        "--namespace",
        collection.namespace,
        "--musicxml-dir",
        paths.musicXmlDirectory,
        "--skip-pdf",
        "--canonical-stems",
        ...argv,
      ],
      target,
    );
  }

}

async function importOfficialPdfCollection(collection, paths, target) {
  await runNodeScript(
    "import-official-pdfs.mjs",
    [
      "--collection",
      collection.collectionCode,
      "--pdf-dir",
      paths.pdfDirectory,
      "--target",
      target,
    ],
    target,
  );
}

async function main() {
  await loadLocalEnv();

  const argv = process.argv.slice(2);
  const target = parseTargetOption(argv);
  const baseRoot = resolveBaseChantsRoot(argv);
  const collections = parseCollectionSelection(argv);
  const passthroughArgs = stripBaseChantsSelectionArgs(stripTargetOption(argv));

  for (const collection of collections) {
    const paths = resolveCollectionPaths(baseRoot, collection);

    console.log(`\n==> Import ${collection.collectionCode} from ${paths.rootDirectory}`);

    if (collection.strategy === "official-pdf") {
      await importOfficialPdfCollection(collection, paths, target);
      continue;
    }

    await importMixedCollection(collection, paths, target, passthroughArgs);
  }
}

await main();
