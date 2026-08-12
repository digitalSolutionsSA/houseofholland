import { useState, useEffect } from 'react'
import './Logo.css'

const TIER_LOGOS: Record<string, string> = {
  'black-card': '/logo-gold.png',
  'premium':    '/logo-red.png',
  'free':       '/logo-black.webp',
}

function useDisplayTier() {
  const [tier, setTier] = useState(
    () => document.documentElement.dataset.tier ?? 'black-card'
  )
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setTier(document.documentElement.dataset.tier ?? 'black-card')
    })
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-tier'],
    })
    return () => obs.disconnect()
  }, [])
  return tier
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
  const src = TIER_LOGOS[tier] ?? '/logo-gold.png'

  if (variant === 'mark') {
    return (
      <span
        className={`brand-logo brand-logo--mark ${className}`}
        style={{ width: height, height }}
        aria-hidden={alt ? undefined : true}
      >
        <img src={src} alt={alt} />
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`brand-logo brand-logo--full ${className}`}
      style={{ height, width: 'auto' }}
    />
  )
}
