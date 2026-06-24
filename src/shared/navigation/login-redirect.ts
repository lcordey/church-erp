export function getLoginHref(redirectTo: string): string {
  return `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
}

export function getSafeRedirectPath(
  redirectTo: string | null | undefined,
  fallback = "/worship",
): string {
  if (
    !redirectTo ||
    !redirectTo.startsWith("/") ||
    redirectTo.startsWith("//") ||
    redirectTo.includes("\\") ||
    /[\r\n]/.test(redirectTo)
  ) {
    return fallback;
  }

  return redirectTo;
}
