import type { SyntheticEvent } from 'react'
import './Logo.css'
import { useDisplayTier } from '../../hooks/useDisplayTier'

const TIER_LOGOS: Record<string, string> = {
  'black-card': '/logo-gold.webp',
  'premium':    '/logo-red.webp',
  'free':       '/logo-black.webp',
}

// If a .webp fails to decode (seen intermittently in WKWebView), fall back
// to the equivalent .png that already ships alongside each logo.
function fallbackToPng(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (img.src.endsWith('.webp')) {
    img.src = img.src.replace(/\.webp$/, '.png')
  }
}

type LogoProps = {
  variant?: 'full' | 'mark'
  height?: number
  className?: string
  alt?: string
  /** Bypass the membership-tier logo lookup — for contexts like the login
   * screen where no tier is known yet (defaulting to the free tier's black
   * logo there would be invisible against the dark background). */
  forceSrc?: string
}

export function Logo({
  variant = 'full',
  height = 140,
  className = '',
  alt = 'House of Holland Tattoo Emporium',
  forceSrc,
}: LogoProps) {
  const tier = useDisplayTier()
  const src = forceSrc ?? TIER_LOGOS[tier] ?? '/logo-gold.webp'

  if (variant === 'mark') {
    return (
      <span
        className={`brand-logo brand-logo--mark ${className}`}
        style={{ width: height, height }}
        aria-hidden={alt ? undefined : true}
      >
        <img src={src} alt={alt} loading="eager" decoding="async" fetchPriority="high" onError={fallbackToPng} />
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`brand-logo brand-logo--full ${className}`}
      style={{ height, width: 'auto' }}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      onError={fallbackToPng}
    />
  )
}
