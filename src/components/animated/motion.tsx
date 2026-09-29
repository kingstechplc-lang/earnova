'use client'
import { motion } from 'framer-motion'

/**
 * StaggerContainer + StaggerItem — for staggered list reveals.
 */
export function StaggerContainer({
  children,
  className = '',
  delay = 0,
  stagger = 0.08,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  stagger?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: stagger,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className = '',
  y = 20,
}: {
  children: React.ReactNode
  className?: string
  y?: number
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: 'spring',
            stiffness: 200,
            damping: 18,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * FadeIn — simple in-view fade-in wrapper using whileInView.
 */
export function FadeIn({
  children,
  className = '',
  delay = 0,
  y = 20,
  duration = 0.5,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
  duration?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/**
 * PageTransition — used on view changes to give a smooth entrance.
 */
export function PageTransition({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
