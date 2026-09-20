// Only same-origin relative paths are allowed as post-login targets, so a
// crafted `?redirect=` can't bounce a freshly logged-in user to another site.
export function safeRedirectPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}
