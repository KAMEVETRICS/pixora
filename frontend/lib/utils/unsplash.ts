const UNSPLASH_API = "https://api.unsplash.com";

function getAccessKey(): string {
  return process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || "";
}

export interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
  };
}

/**
 * Search Unsplash for photos by query.
 * Returns up to `perPage` results.
 */
export async function searchImages(
  query: string,
  page = 1,
  perPage = 12
): Promise<{ results: UnsplashPhoto[]; total: number }> {
  const key = getAccessKey();
  if (!key) throw new Error("Unsplash API key not configured");

  const params = new URLSearchParams({
    query,
    page: String(page),
    per_page: String(perPage),
  });

  const res = await fetch(`${UNSPLASH_API}/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${key}` },
  });

  if (!res.ok) throw new Error(`Unsplash search failed: ${res.statusText}`);
  return res.json();
}

/**
 * Get N random photos, optionally filtered by query.
 * Ideal for auto-filling round images in one call.
 */
export async function getRandomImages(
  count: number,
  query?: string
): Promise<UnsplashPhoto[]> {
  const key = getAccessKey();
  if (!key) throw new Error("Unsplash API key not configured");

  const params = new URLSearchParams({ count: String(count) });
  if (query) params.set("query", query);

  const res = await fetch(`${UNSPLASH_API}/photos/random?${params}`, {
    headers: { Authorization: `Client-ID ${key}` },
  });

  if (!res.ok) throw new Error(`Unsplash random failed: ${res.statusText}`);
  const data = await res.json();

  // API returns single object when count=1, array otherwise
  return Array.isArray(data) ? data : [data];
}

/**
 * Preset categories for quick image selection.
 */
export const IMAGE_CATEGORIES = [
  { label: "Animals", query: "animals", emoji: "🐾" },
  { label: "Vehicles", query: "vehicles cars", emoji: "🚗" },
  { label: "Food", query: "food dishes", emoji: "🍕" },
  { label: "Nature", query: "nature landscape", emoji: "🏔️" },
  { label: "Architecture", query: "architecture buildings", emoji: "🏛️" },
  { label: "Sports", query: "sports action", emoji: "⚽" },
  { label: "Technology", query: "technology gadgets", emoji: "💻" },
  { label: "Random", query: "", emoji: "🎲" },
] as const;

/**
 * Get N random image URLs ready for the contract.
 * Returns the `regular` size URLs as plain strings.
 */
export async function getRandomImageUrls(
  count: number,
  query?: string
): Promise<string[]> {
  const photos = await getRandomImages(count, query);
  return photos.map((p) => p.urls.regular);
}

/**
 * Extract the best URL for game display (regular = ~1080px wide).
 * Accepts either an UnsplashPhoto object or a raw URL string.
 * If given a string, appends width param for Unsplash CDN resizing.
 */
export function getDisplayUrl(photoOrUrl: UnsplashPhoto | string, width?: number): string {
  if (typeof photoOrUrl === "string") {
    if (width && photoOrUrl.includes("unsplash.com")) {
      const sep = photoOrUrl.includes("?") ? "&" : "?";
      return `${photoOrUrl}${sep}w=${width}&fit=crop`;
    }
    return photoOrUrl;
  }
  return photoOrUrl.urls.regular;
}
