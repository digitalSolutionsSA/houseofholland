const SUPABASE_URL = 'https://tgaxteclhzmzfsvaulzr.supabase.co'

export function storageImg(url: string | null | undefined, width: number, quality = 80): string {
  if (!url) return ''
  if (!url.startsWith(SUPABASE_URL)) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}width=${width}&quality=${quality}&format=webp`
}
