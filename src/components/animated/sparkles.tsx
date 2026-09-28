'use client'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

/**
 * Sparkles — decorative animated sparkle particles floating in a container.
 */
type Sparkle = {
  id: number
  top: string
  left: string
  size: number
  delay: number
  duration: number
}

export function Sparkles({
  count = 8,
  className = '',
}: {
  count?: number
  className?: string
}) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([])

  useEffect(() => {
    const arr: Sparkle[] = Array.from({ length: count }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: 4 + Math.random() * 8,
      delay: Math.random() * 4,
      duration: 3 + Math.random() * 3,
    }))
    // Defer the state update to avoid cascading renders in dev StrictMode
    const id = window.setTimeout(() => setSparkles(arr), 0)
    return () => window.clearTimeout(id)
  }, [count])

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {sparkles.map(s => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-gold"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            boxShadow: '0 0 12px oklch(0.78 0.14 84 / 0.8)',
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
