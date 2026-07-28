const publicReadPaths = [
  /^\/api\/events(?:\/[^/]+)?\/?$/,
  /^\/api\/setlists(?:\/[^/]+)?\/?$/,
  /^\/api\/songs(?:\/[^/]+)?\/?$/,
  /^\/api\/push\/config\/?$/,
];

const authenticationEntryPoints = new Set([
  "POST /api/auth/login",
  "POST /api/auth/logout",
]);

export function apiRequestRequiresAuthentication(
  method: string,
  pathname: string,
) {
  const normalizedMethod = method.toUpperCase();

  if (!pathname.startsWith("/api/")) {
    return false;
  }

  if (normalizedMethod === "OPTIONS") {
    return false;
  }

  if (
    authenticationEntryPoints.has(`${normalizedMethod} ${pathname}`)
  ) {
    return false;
  }

  if (
    (normalizedMethod === "GET" || normalizedMethod === "HEAD") &&
    publicReadPaths.some((pattern) => pattern.test(pathname))
  ) {
    return false;
  }

  return true;
}
