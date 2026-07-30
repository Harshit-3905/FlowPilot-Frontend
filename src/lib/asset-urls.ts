const HTTP_URL = /^https?:\/\//i;

/** Collect unique http(s) URL strings from a node output (string, array, or object). */
export function extractAssetUrls(value: unknown): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  function walk(v: unknown): void {
    if (typeof v === "string") {
      if (HTTP_URL.test(v) && !seen.has(v)) {
        seen.add(v);
        urls.push(v);
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) walk(item);
      return;
    }
    if (v !== null && typeof v === "object") {
      for (const item of Object.values(v as Record<string, unknown>)) {
        walk(item);
      }
    }
  }

  walk(value);
  return urls;
}

export function isLikelyImageUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(path);
  } catch {
    return false;
  }
}
