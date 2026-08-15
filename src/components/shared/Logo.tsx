import './Logo.css'
import { useDisplayTier } from '../../hooks/useDisplayTier'

const TIER_LOGOS: Record<string, string> = {
  'black-card': '/logo-gold.webp',
  'premium':    '/logo-red.webp',
  'free':       '/logo-black.webp',
}

type LogoProps = {
  variant?: 'full' | 'mark'
  height?: number
  className?: string
  alt?: string
}

export function Logo({
  variant = 'full',
  height = 140,
  className = '',
  alt = 'House of Holland Tattoo Emporium',
}: LogoProps) {
  const tier = useDisplayTier()
  const src = TIER_LOGOS[tier] ?? '/logo-gold.webp'

  if (variant === 'mark') {
    return (
      <span
        className={`brand-logo brand-logo--mark ${className}`}
        style={{ width: height, height }}
        aria-hidden={alt ? undefined : true}
      >
        <img src={src} alt={alt} loading="eager" decoding="async" fetchPriority="high" />
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
    />
  )
}
