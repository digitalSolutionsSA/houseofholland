import { useEffect, useRef } from 'react'
import { useDisplayTier } from '../../hooks/useDisplayTier'
import './BrandBackground.css'

type BrandBackgroundProps = {
  className?: string
  vignette?: boolean
}

type Particle = {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  opacityDelta: number
  rotation: number
  rotationSpeed: number
}

const TIER_PARTICLE_COLORS: Record<string, [string, string, string]> = {
  'black-card': ['rgba(255,235,150,1)', 'rgba(212,175,55,0.9)', 'rgba(180,130,20,0)'],
  'premium':    ['rgba(255,140,140,1)', 'rgba(220,38,38,0.9)',  'rgba(150,10,10,0)'],
  'free':       ['rgba(80,80,80,1)',    'rgba(50,50,50,0.8)',   'rgba(20,20,20,0)'],
}

function initParticle(canvas: HTMLCanvasElement): Particle {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2.5 + 0.5,
    speedX: (Math.random() - 0.5) * 0.3,
    speedY: -(Math.random() * 0.4 + 0.1),
    opacity: Math.random() * 0.6 + 0.1,
    opacityDelta: (Math.random() * 0.004 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.04,
  }
}

export function BrandBackground({ className = '', vignette = true }: BrandBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tier = useDisplayTier()
  const tierRef = useRef(tier)
  tierRef.current = tier

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const PARTICLE_COUNT = 120
    const particles: Particle[] = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(initParticle(canvas))
    }

    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const [c0, c1, c2] = TIER_PARTICLE_COLORS[tierRef.current] ?? TIER_PARTICLE_COLORS['black-card']

      for (const p of particles) {
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity))
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)

        const s = p.size
        ctx.beginPath()
        ctx.moveTo(0, -s)
        ctx.lineTo(s * 0.6, 0)
        ctx.lineTo(0, s)
        ctx.lineTo(-s * 0.6, 0)
        ctx.closePath()

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s)
        grad.addColorStop(0, c0)
        grad.addColorStop(0.5, c1)
        grad.addColorStop(1, c2)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.restore()

        p.x += p.speedX
        p.y += p.speedY
        p.opacity += p.opacityDelta
        p.rotation += p.rotationSpeed

        if (p.opacity <= 0 || p.opacity >= 0.85) p.opacityDelta *= -1

        if (p.y < -10) p.y = canvas.height + 10
        if (p.x < -10) p.x = canvas.width + 10
        if (p.x > canvas.width + 10) p.x = -10
      }

      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div
      className={`brand-bg ${vignette ? 'brand-bg--vignette' : ''} ${className}`}
      aria-hidden
    >
      <canvas ref={canvasRef} className="brand-bg__dust" />
    </div>
  )
}
