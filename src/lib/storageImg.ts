const MARKER = '/storage/v1/object/public/'

/**
 * Converts a Supabase Storage URL to a resized WebP via the image transform API.
 * Passes non-storage URLs through unchanged.
 *
 * Always requests a square (width×width) with resize=cover so the API does
 * a proper center-crop server-side. Without an explicit height, a source
 * image that isn't already square (e.g. a wide landscape headshot) comes
 * back as a proportionally-scaled rectangle instead — which then gets
 * force-cropped again by CSS object-fit into a circular avatar, landing on
 * a random sliver of the image instead of the face.
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
  return `${base}/storage/v1/render/image/public/${path}?width=${width}&height=${width}&resize=cover&quality=${quality}&format=webp`
}
