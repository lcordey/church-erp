import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const projectRoot = process.cwd();
export const envFiles = [".env.local", ".env"];
export const generatedDir = path.join(projectRoot, "supabase", "generated");
export const jemafSnapshotPath = path.join(generatedDir, "jemaf-catalog.json");
export const defaultPdfDirectory = "/home/lcordey/work/download_for_church_erp";
export const songPdfBucket = "song-pdfs";
export const songPdfMimeType = "application/pdf";

export async function loadEnvFile(fileName) {
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
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

export async function loadLocalEnv() {
  for (const envFile of envFiles) {
    await loadEnvFile(envFile);
  }
}

export function normalizeAscii(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae");
}

export function slugify(value) {
  const normalized = normalizeAscii(value)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "chant";
}

export function createDeterministicUuid(namespace, value) {
  const hex = createHash("sha1").update(`${namespace}:${value}`).digest("hex");
  const chars = hex.slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = ["8", "9", "a", "b"][Number.parseInt(chars[16], 16) % 4];

  return [
    chars.slice(0, 8).join(""),
    chars.slice(8, 12).join(""),
    chars.slice(12, 16).join(""),
    chars.slice(16, 20).join(""),
    chars.slice(20, 32).join(""),
  ].join("-");
}

export async function readJsonIfExists(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function listPdfFiles(pdfDirectory) {
  const entries = await readdir(pdfDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "fr"));
}

export function padCollectionNumber(value) {
  return String(value).padStart(3, "0");
}
