import { useEffect, useRef, useState } from 'react'

/**
 * Hook that animates a number toward its target value.
 * Used for KPI cards so values transition smoothly instead of jumping.
 */
export function useAnimatedNumber(target: number, duration = 700): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number>()

  useEffect(() => {
    const from = fromRef.current
    const delta = target - from
    if (Math.abs(delta) < 0.0001) {
      setValue(target)
      fromRef.current = target
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + delta * eased
      setValue(current)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = target
    }
  }, [target, duration])

  return value
}

interface AnimatedNumberProps {
  value: number
  decimals?: number
  duration?: number
  className?: string
}

/** Displays an animated number that smoothly transitions to new values. */
export function AnimatedNumber({ value, decimals = 0, duration = 700, className }: AnimatedNumberProps) {
  const animated = useAnimatedNumber(value, duration)
  return <span className={className}>{animated.toFixed(decimals)}</span>
}