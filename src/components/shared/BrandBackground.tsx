import { useEffect, useRef } from 'react'
import marbleBg from '../../assets/brand/marble-bg.png'
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

      for (const p of particles) {
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity))
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)

        // diamond / rhombus shape for each mote
        const s = p.size
        ctx.beginPath()
        ctx.moveTo(0, -s)
        ctx.lineTo(s * 0.6, 0)
        ctx.lineTo(0, s)
        ctx.lineTo(-s * 0.6, 0)
        ctx.closePath()

        // gold gradient fill
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s)
        grad.addColorStop(0, 'rgba(255,235,150,1)')
        grad.addColorStop(0.5, 'rgba(212,175,55,0.9)')
        grad.addColorStop(1, 'rgba(180,130,20,0)')
        ctx.fillStyle = grad
        ctx.fill()
        ctx.restore()

        // update
        p.x += p.speedX
        p.y += p.speedY
        p.opacity += p.opacityDelta
        p.rotation += p.rotationSpeed

        if (p.opacity <= 0 || p.opacity >= 0.85) p.opacityDelta *= -1

        // wrap
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
      style={{ backgroundImage: `url(${marbleBg})` }}
      aria-hidden
    >
      <canvas ref={canvasRef} className="brand-bg__dust" />
    </div>
  )
}
