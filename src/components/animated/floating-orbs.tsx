'use client'
import { motion } from 'framer-motion'

/**
 * FloatingOrbs — animated colored blobs floating in the background.
 * Purely decorative.
 */
export function FloatingOrbs({
  count = 3,
  colors = ['evergreen', 'gold', 'berry'],
  className = '',
}: {
  count?: number
  colors?: Array<'evergreen' | 'gold' | 'berry' | 'cranberry' | 'sage'>
  className?: string
}) {
  const colorMap: Record<string, string> = {
    evergreen: 'bg-evergreen/20',
    gold: 'bg-gold/25',
    berry: 'bg-berry/20',
    cranberry: 'bg-cranberry/20',
    sage: 'bg-sage/30',
  }
  const positions = [
    { top: '5%', left: '5%', size: 'h-48 w-48' },
    { top: '15%', right: '8%', size: 'h-64 w-64' },
    { bottom: '8%', left: '15%', size: 'h-56 w-56' },
    { bottom: '20%', right: '20%', size: 'h-40 w-40' },
    { top: '45%', left: '40%', size: 'h-72 w-72' },
  ]

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {Array.from({ length: count }).map((_, i) => {
        const pos = positions[i % positions.length]
        const color = colorMap[colors[i % colors.length]]
        const dur = 8 + i * 2
        return (
          <motion.div
            key={i}
            className={`absolute rounded-full blur-3xl ${color} ${pos.size}`}
            style={pos as any}
            animate={{
              x: [0, 30, -20, 0],
              y: [0, -25, 15, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{
              duration: dur,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </div>
  )
}
