import { spawn } from "node:child_process";
import path from "node:path";

import { loadLocalEnv } from "./song-pdf-library.mjs";
import { parseCollectionSelection } from "./base-chants-library.mjs";
import { buildTargetEnv, parseTargetOption, stripTargetOption } from "./song-import-target.mjs";

async function runDeleteCollection(collectionCode, target, extraArgs) {
  const scriptPath = path.join(process.cwd(), "scripts", "delete-song-collection.mjs");

  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [scriptPath, "--collection", collectionCode, "--target", target, ...extraArgs],
      {
        stdio: "inherit",
        env: buildTargetEnv(target),
      },
    );

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`delete-song-collection.mjs exited with code ${code ?? "unknown"}.`));
    });
    child.on("error", reject);
  });
}

async function main() {
  await loadLocalEnv();

  const argv = process.argv.slice(2);
  const target = parseTargetOption(argv);
  const collections = parseCollectionSelection(argv);
  const extraArgs = stripTargetOption(argv).filter(
    (argument) => !["--all", "--include-official"].includes(argument),
  );

  for (let index = 0; index < extraArgs.length; index += 1) {
    if (extraArgs[index] === "--collection") {
      extraArgs.splice(index, 2);
      index -= 1;
    }
  }

  for (const collection of collections) {
    if (!collection.clearable) {
      throw new Error(
        `Bulk clear does not support official collection ${collection.collectionCode}. Use the dedicated seed workflow if you need to rebuild official JEM/JEMK songs.`,
      );
    }

    console.log(`\n==> Clear ${collection.collectionCode}`);
    await runDeleteCollection(collection.collectionCode, target, extraArgs);
  }
}

await main();
