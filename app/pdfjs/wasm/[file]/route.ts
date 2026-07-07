import { readFile } from "node:fs/promises";
import path from "node:path";

const pdfJsWasmFiles = {
  "jbig2.wasm": "application/wasm",
  "jbig2_nowasm_fallback.js": "application/javascript; charset=utf-8",
  "openjpeg.wasm": "application/wasm",
  "qcms_bg.wasm": "application/wasm",
  "quickjs-eval.wasm": "application/wasm",
} as const;

type PdfJsWasmFile = keyof typeof pdfJsWasmFiles;

type RouteContext = {
  params: Promise<unknown>;
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(pdfJsWasmFiles).map((file) => ({ file }));
}

function isPdfJsWasmFile(file: string): file is PdfJsWasmFile {
  return Object.hasOwn(pdfJsWasmFiles, file);
}

function getFileParam(params: unknown) {
  if (
    typeof params === "object" &&
    params !== null &&
    "file" in params &&
    typeof params.file === "string"
  ) {
    return params.file;
  }

  return "";
}

export async function GET(_request: Request, { params }: RouteContext) {
  const file = getFileParam(await params);

  if (!isPdfJsWasmFile(file)) {
    return Response.json(
      {
        error: {
          code: "PDFJS_WASM_NOT_FOUND",
          message: "Décodeur PDF introuvable.",
        },
      },
      { status: 404 },
    );
  }

  const wasmPath = path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "wasm",
    file,
  );
  const body = await readFile(wasmPath);

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": pdfJsWasmFiles[file],
    },
  });
}
