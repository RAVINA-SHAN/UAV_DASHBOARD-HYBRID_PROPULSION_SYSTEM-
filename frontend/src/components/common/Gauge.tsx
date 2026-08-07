import { useEffect, useState } from 'react'

interface GaugeProps {
  value: number
  min?: number
  max?: number
  label: string
  unit?: string
  color?: string
  size?: number
}

/**
 * Radial gauge for aeronautical instrumentation (speed, altitude, SOC, etc.)
 * Draws a 270° arc sweep from -225° to 45°.
 */
export function Gauge({
  value,
  min = 0,
  max = 100,
  label,
  unit,
  color = '#0066CC',
  size = 140,
}: GaugeProps) {
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    setDisplayValue(value)
  }, [value])

  // Clamp
  const clamped = Math.max(min, Math.min(max, displayValue))
  const pct = max === min ? 0 : (clamped - min) / (max - min)
  const angle = -225 + pct * 270

  // Compute arc endpoint
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 14
  const rad = (angle * Math.PI) / 180
  const endX = cx + r * Math.cos(rad)
  const endY = cy + r * Math.sin(rad)

  // Background arc endpoints (270° from -225 to 45)
  const bgStart = -225
  const bgEnd = 45
  const bgRadStart = (bgStart * Math.PI) / 180
  const bgRadEnd = (bgEnd * Math.PI) / 180
  const bgX1 = cx + r * Math.cos(bgRadStart)
  const bgY1 = cy + r * Math.sin(bgRadStart)
  const bgX2 = cx + r * Math.cos(bgRadEnd)
  const bgY2 = cy + r * Math.sin(bgRadEnd)
  const largeArc = 1 // 270° > 180°

  return (
    <div className="gauge-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={`M ${bgX1} ${bgY1} A ${r} ${r} 0 ${largeArc} 1 ${bgX2} ${bgY2}`}
          fill="none"
          stroke="#E2E8F0"
          className="dark:stroke-steel-700"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${bgX1} ${bgY1} A ${r} ${r} 0 ${angle - bgStart > 180 ? 1 : 0} 1 ${endX} ${endY}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Tick marks */}
        {Array.from({ length: 11 }).map((_, i) => {
          const tAngle = -225 + i * 27
          const tRad = (tAngle * Math.PI) / 180
          const outer = r - 3
          const inner = r - 7
          const x1 = cx + inner * Math.cos(tRad)
          const y1 = cy + inner * Math.sin(tRad)
          const x2 = cx + outer * Math.cos(tRad)
          const y2 = cy + outer * Math.sin(tRad)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94A3B8" className="dark:stroke-steel-500" strokeWidth="1" />
        })}
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={endX}
          y2={endY}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="4" fill={color} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-xl font-bold text-navy-900 dark:text-steel-100">
          {displayValue.toFixed(max > 200 ? 0 : 1)}
        </div>
        {unit && <div className="text-[10px] text-steel-400 dark:text-steel-400 uppercase tracking-wider">{unit}</div>}
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wider"
        style={{ bottom: size / 2 - r - 22 }}
      >
        {label}
      </div>
    </div>
  )
}

export function LinearGauge({
  value,
  max = 100,
  label,
  unit,
  color = '#0066CC',
}: {
  value: number
  max?: number
  label: string
  unit?: string
  color?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="telemetry-label">{label}</span>
        <span className="font-mono text-[12px] font-semibold" style={{ color }}>
          {value.toFixed(1)}
          {unit && <span className="text-steel-400"> {unit}</span>}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}