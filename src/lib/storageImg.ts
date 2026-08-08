const MARKER = '/storage/v1/object/public/'

/**
 * Converts a Supabase Storage URL to a resized WebP via the image transform API.
 * Passes non-storage URLs through unchanged.
 */
export function storageImg(
  url: string | null | undefined,
  width: number,
  quality = 80,
): string | null {
  if (!url) return null
  const idx = url.indexOf(MARKER)
  if (idx === -1) return url
  const base = url.slice(0, idx)
  const path = url.slice(idx + MARKER.length)
  return `${base}/storage/v1/render/image/public/${path}?width=${width}&quality=${quality}&format=webp`
}
