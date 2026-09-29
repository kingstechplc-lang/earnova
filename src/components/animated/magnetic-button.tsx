'use client'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useRef } from 'react'

/**
 * MagneticButton — button that subtly follows the cursor when hovered.
 */
export function MagneticButton({
  children,
  className = '',
  onClick,
  disabled,
  intensity = 0.3,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  intensity?: number
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 150, damping: 12 })
  const sy = useSpring(my, { stiffness: 150, damping: 12 })

  function onMove(e: React.MouseEvent<HTMLButtonElement>) {
    if (disabled) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    mx.set(dx * intensity)
    my.set(dy * intensity)
  }
  function onLeave() {
    mx.set(0)
    my.set(0)
  }

  return (
    <motion.button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      disabled={disabled}
      style={{ x: sx, y: sy }}
      whileTap={{ scale: 0.97 }}
      className={className}
    >
      {children}
    </motion.button>
  )
}
