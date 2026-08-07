import { useEffect, useRef, useState } from 'react'

/**
 * Maintains a rolling history of telemetry values.
 * Used for sparklines, moving cursors, and trend analysis across all module pages.
 */
export function useTelemetryHistory<T>(value: T | null | undefined, maxPoints = 120): T[] {
  const [history, setHistory] = useState<T[]>([])
  const lastRef = useRef<T | null | undefined>(null)

  useEffect(() => {
    if (value === null || value === undefined) return
    if (JSON.stringify(value) === JSON.stringify(lastRef.current)) return
    lastRef.current = value
    setHistory((h) => {
      const next = [...h, value]
      return next.length > maxPoints ? next.slice(-maxPoints) : next
    })
  }, [value, maxPoints])

  return history
}

/** Formats mission time minutes into HH:MM:SS. */
export function formatHMS(min: number): string {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  const r = m % 60
  const s = Math.round((min - Math.floor(min)) * 60)
  return `${String(h).padStart(2, '0')}:${String(r).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Formats minutes into human-readable duration, e.g. "2h 15m". */
export function formatDuration(min: number): string {
  const m = Math.round(min)
  if (m <= 0) return '0 min'
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r} min`
  return r === 0 ? `${h}h` : `${h}h ${r}m`
}

/** Formats minutes into HH:MM:SS mission clock. */
export function formatTime(min: number): string {
  const totalSec = Math.max(0, Math.min(38400, Math.floor(min * 60)))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Converts m/s to km/h. */
export function mpsToKmh(mps: number): number {
  return mps * 3.6
}

/** Converts m/s to knots. */
export function mpsToKnots(mps: number): number {
  return mps * 1.94384
}

/** Converts meters to feet. */
export function mToFt(m: number): number {
  return m * 3.28084
}

/** Returns a status color based on a threshold. */
export function statusColor(pct: number): string {
  if (pct >= 90) return 'text-emerald-600'
  if (pct >= 70) return 'text-amber-600'
  return 'text-red-600'
}