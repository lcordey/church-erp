import { randomBytes } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const defaultMaximumApiBodyBytes = 256 * 1024;

function maximumApiBodyBytes(pathname: string) {
  if (/^\/api\/admin\/songs\/[^/]+\/pdf$/.test(pathname)) {
    return 21 * 1024 * 1024;
  }

  if (/^\/api\/admin\/songs\/[^/]+\/musicxml$/.test(pathname)) {
    return 6 * 1024 * 1024;
  }

  return defaultMaximumApiBodyBytes;
}

function isCrossSiteMutation(request: NextRequest) {
  if (safeMethods.has(request.method)) {
    return false;
  }

  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return true;
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).origin !== request.nextUrl.origin;
  } catch {
    return true;
  }
}

function contentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const isApiMutation =
    request.nextUrl.pathname.startsWith("/api/") &&
    !safeMethods.has(request.method);

  if (
    isApiMutation &&
    isCrossSiteMutation(request)
  ) {
    return Response.json(
      {
        error: {
          code: "CROSS_SITE_REQUEST_FORBIDDEN",
          message: "Cette requête n’est pas autorisée.",
        },
      },
      { status: 403 },
    );
  }

  const contentLength = Number(request.headers.get("content-length"));

  if (
    isApiMutation &&
    Number.isFinite(contentLength) &&
    contentLength > maximumApiBodyBytes(request.nextUrl.pathname)
  ) {
    return Response.json(
      {
        error: {
          code: "REQUEST_TOO_LARGE",
          message: "La requête est trop volumineuse.",
        },
      },
      { status: 413 },
    );
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const nonce = randomBytes(16).toString("base64");
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("content-security-policy", policy);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("content-security-policy", policy);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|pdfjs/|sw.js|manifest.webmanifest).*)",
  ],
};
