const logoWhite = '/logo-white.webp'
const logoBlack = '/logo-black.webp'
import './Logo.css'

type LogoProps = {
  /** full = crest + wordmark; mark = crest only */
  variant?: 'full' | 'mark'
  theme?: 'white' | 'black'
  /** Height in px for the rendered logo */
  height?: number
  className?: string
  alt?: string
}

export function Logo({
  variant = 'full',
  theme = 'white',
  height = 140,
  className = '',
  alt = 'House of Holland Tattoo Emporium',
}: LogoProps) {
  const src = theme === 'white' ? logoWhite : logoBlack

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
