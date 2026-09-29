'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * CountUp — animates a number from 0 (or previous value) to target.
 * Uses requestAnimationFrame with easeOutExpo.
 */
export function CountUp({
  value,
  duration = 1500,
  className,
  prefix = '',
  suffix = '',
  format = 'number',
}: {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
  format?: 'number' | 'percent'
}) {
  const [display, setDisplay] = useState(0)
  const previousValue = useRef(0)
  const rafId = useRef<number>()

  useEffect(() => {
    const startValue = previousValue.current
    const delta = value - startValue
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplay(Math.round(startValue + delta * eased))
      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick)
      } else {
        previousValue.current = value
      }
    }
    rafId.current = requestAnimationFrame(tick)
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current) }
  }, [value, duration])

  const formatted = format === 'percent' ? `${display}%` : display.toLocaleString()
  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
