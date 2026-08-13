import { useEffect, useRef } from 'react'
import { useDisplayTier } from '../../hooks/useDisplayTier'
import './BrandBackground.css'

type Props = { className?: string; vignette?: boolean }

const TIER_COLORS: Record<string, [string, string, string]> = {
  'black-card': ['rgba(255,235,150,1)', 'rgba(212,175,55,0.9)', 'rgba(180,130,20,0)'],
  'premium':    ['rgba(255,140,140,1)', 'rgba(220,38,38,0.9)',  'rgba(150,10,10,0)'],
  'free':       ['rgba(0,0,0,1)',        'rgba(0,0,0,0.85)',     'rgba(0,0,0,0)'],
}

// Pre-baked particle sizes — one stamp canvas per size bucket
const STAMP_SIZES = [1, 1.5, 2, 2.5, 3]
const PARTICLE_COUNT = 55  // was 120 — halved for performance

type Particle = {
  x: number; y: number
  speedX: number; speedY: number
  opacity: number; opacityDelta: number
  rotation: number; rotationSpeed: number
  stampIdx: number  // index into baked stamp array
}

// Bake gradient diamond stamps once per tier change (not per frame)
function bakeStamps(colors: [string, string, string]): HTMLCanvasElement[] {
  return STAMP_SIZES.map(s => {
    const dim = Math.ceil(s * 2 + 4)
    const sc = document.createElement('canvas')
    sc.width = dim; sc.height = dim
    const sctx = sc.getContext('2d')!
    const cx = dim / 2
    sctx.beginPath()
    sctx.moveTo(cx, cx - s); sctx.lineTo(cx + s * 0.6, cx)
    sctx.lineTo(cx, cx + s); sctx.lineTo(cx - s * 0.6, cx)
    sctx.closePath()
    const grad = sctx.createRadialGradient(cx, cx, 0, cx, cx, s)
    grad.addColorStop(0, colors[0])
    grad.addColorStop(0.5, colors[1])
    grad.addColorStop(1, colors[2])
    sctx.fillStyle = grad
    sctx.fill()
    return sc
  })
}

function initParticle(cw: number, ch: number): Particle {
  return {
    x: Math.random() * cw,
    y: Math.random() * ch,
    speedX: (Math.random() - 0.5) * 0.3,
    speedY: -(Math.random() * 0.4 + 0.1),
    opacity: Math.random() * 0.6 + 0.1,
    opacityDelta: (Math.random() * 0.004 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.04,
    stampIdx: Math.floor(Math.random() * STAMP_SIZES.length),
  }
}

export function BrandBackground({ className = '', vignette = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tier = useDisplayTier()
  const tierRef = useRef(tier)
  tierRef.current = tier

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const particles: Particle[] = []
    let stamps: HTMLCanvasElement[] | null = null
    let lastTier = ''
    let raf: number
    let paused = false
    let resizeTimer: ReturnType<typeof setTimeout>

    const setSize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    setSize()

    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(setSize, 200)
    }
    window.addEventListener('resize', onResize, { passive: true })

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(initParticle(canvas.width, canvas.height))
    }

    // Pause animation when tab is not visible — saves CPU/battery
    const onVisibility = () => {
      paused = document.hidden
      if (!paused) raf = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', onVisibility)

    function draw() {
      if (paused || !canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Rebuild stamps only when tier changes
      const curTier = tierRef.current
      if (!stamps || curTier !== lastTier) {
        stamps = bakeStamps(TIER_COLORS[curTier] ?? TIER_COLORS['black-card'])
        lastTier = curTier
      }

      for (const p of particles) {
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity))
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        const stamp = stamps[p.stampIdx]
        ctx.drawImage(stamp, -stamp.width / 2, -stamp.height / 2)
        ctx.restore()

        p.x += p.speedX
        p.y += p.speedY
        p.opacity += p.opacityDelta
        p.rotation += p.rotationSpeed

        if (p.opacity <= 0 || p.opacity >= 0.85) p.opacityDelta *= -1
        if (p.y < -10)               p.y = canvas.height + 10
        if (p.x < -10)               p.x = canvas.width  + 10
        if (p.x > canvas.width + 10) p.x = -10
      }

      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div className={`brand-bg ${vignette ? 'brand-bg--vignette' : ''} ${className}`} aria-hidden>
      <canvas ref={canvasRef} className="brand-bg__dust" />
    </div>
  )
}
