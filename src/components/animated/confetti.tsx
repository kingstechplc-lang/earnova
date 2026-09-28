'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

/**
 * Confetti — programmatic confetti burst.
 *
 * Usage:
 *   const { fire } = useConfetti()
 *   fire() // single burst at center top
 *   fire({ x: 0.5, y: 0.5, count: 200 }) // burst at center of viewport
 *
 * Or render the <ConfettiBurst /> component directly with `trigger` prop.
 *
 * Uses CSS animations only — no external library. ~150 particles per burst.
 * Each particle has random color, rotation, drift, fall speed.
 */

type Particle = {
  id: number
  left: number      // start x position (0-100%)
  color: string
  shape: 'rect' | 'circle'
  size: number      // px
  delay: number     // ms before falling
  duration: number  // ms total
  drift: number     // px horizontal drift during fall
  rotation: number  // deg
}

const COLORS = [
  '#0F4C3A',  // evergreen
  '#1a8d6e',  // evergreen-light
  '#D4A437',  // gold
  '#E8C547',  // gold-light
  '#8B2C5C',  // berry
  '#C0392B',  // cranberry
  '#4a9cc4',  // accent blue
  '#FBF8F2',  // cream
]

type ConfettiOptions = {
  x?: number         // 0-1, fraction of viewport width (default 0.5)
  y?: number         // 0-1, fraction of viewport height (default 0.3)
  count?: number     // particle count (default 120)
  spread?: number    // 0-100, how wide horizontally particles spread (default 60)
}

export function useConfetti() {
  const [bursts, setBursts] = useState<{ id: number; particles: Particle[]; origin: { x: number; y: number } }[]>([])
  const burstId = useRef(0)

  const fire = useCallback((opts: ConfettiOptions = {}) => {
    const { x = 0.5, y = 0.3, count = 120, spread = 60 } = opts
    const id = burstId.current++
    const particles: Particle[] = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: 50 + (Math.random() - 0.5) * spread,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      size: 6 + Math.random() * 8,
      delay: Math.random() * 300,
      duration: 2500 + Math.random() * 1500,
      drift: (Math.random() - 0.5) * 200,
      rotation: Math.random() * 720,
    }))
    setBursts(prev => [...prev, { id, particles, origin: { x, y } }])
    // Auto-cleanup after animation
    setTimeout(() => {
      setBursts(prev => prev.filter(b => b.id !== id))
    }, 5000)
  }, [])

  const ConfettiLayer = (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {bursts.map(burst => (
        <div key={burst.id} className="absolute inset-0">
          {burst.particles.map(p => (
            <span
              key={p.id}
              className="absolute"
              style={{
                left: `${p.left}%`,
                top: `${burst.origin.y * 100}%`,
                width: p.shape === 'rect' ? p.size : p.size,
                height: p.shape === 'rect' ? p.size * 0.6 : p.size,
                backgroundColor: p.color,
                borderRadius: p.shape === 'circle' ? '50%' : '1px',
                animation: `confetti-fall ${p.duration}ms cubic-bezier(0.2, 0.7, 0.4, 1) forwards`,
                animationDelay: `${p.delay}ms`,
                ['--drift' as any]: `${p.drift}px`,
                ['--rot' as any]: `${p.rotation}deg`,
                ['--start-y' as any]: `${burst.origin.y * 100}%`,
                transform: `rotate(${Math.random() * 360}deg)`,
                boxShadow: `0 0 4px ${p.color}80`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )

  return { fire, ConfettiLayer }
}

// Inline keyframes for confetti (avoids globals.css bloat)
const CONFETTI_STYLE_ID = 'confetti-keyframes'
if (typeof document !== 'undefined' && !document.getElementById(CONFETTI_STYLE_ID)) {
  const style = document.createElement('style')
  style.id = CONFETTI_STYLE_ID
  style.textContent = `
    @keyframes confetti-fall {
      0% {
        transform: translate(0, 0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translate(var(--drift), 100vh) rotate(var(--rot));
        opacity: 0;
      }
    }
  `
  document.head.appendChild(style)
}
