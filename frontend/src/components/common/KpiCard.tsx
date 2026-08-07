import { useEffect, useMemo, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { AnimatedNumber } from './AnimatedNumber'

interface KpiCardProps {
  label: string
  value: number
  decimals?: number
  unit?: string
  sub?: string
  color?: string
  trendData?: number[]
  trendDirection?: 'up' | 'down' | 'flat'
  statusColor?: string // emerald / amber / red
}

function Sparkline({ data, color = '#0066CC' }: { data: number[]; color?: string }) {
  if (data.length < 2) return <div className="h-8" />
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 28 - ((v - min) / range) * 24
      return `${x},${y}`
    })
    .join(' ')
  const areaPoints = `0,32 ${points} 100,32`

  return (
    <svg className="w-full h-8" viewBox="0 0 100 32" preserveAspectRatio="none">
      <polygon points={areaPoints} fill={color} opacity="0.08" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function KpiCard({
  label,
  value,
  decimals = 0,
  unit,
  sub,
  color = 'text-navy-900',
  trendData,
  trendDirection,
  statusColor,
}: KpiCardProps) {
  const [history, setHistory] = useState<number[]>(trendData || [])
  const lastValueRef = useRef(value)

  // Append new values to history (for live trend)
  useEffect(() => {
    if (trendData) {
      setHistory(trendData)
      return
    }
    setHistory((h) => {
      const next = [...h, value]
      return next.length > 30 ? next.slice(-30) : next
    })
  }, [value, trendData])

  // Determine trend direction if not provided
  const dir = useMemo(() => {
    if (trendDirection) return trendDirection
    if (history.length < 2) return 'flat'
    const delta = value - lastValueRef.current
    lastValueRef.current = value
    if (Math.abs(delta) < 0.001) return 'flat'
    return delta > 0 ? 'up' : 'down'
  }, [value, history.length, trendDirection])

  // Determine status pill
  const statusPill =
    statusColor === 'emerald' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
    statusColor === 'red' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
    statusColor === 'amber' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'

  return (
    <div className="card relative overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="kpi-label mb-1">{label}</div>
          {statusColor && (
            <span className={`w-2 h-2 rounded-full ${
              statusColor === 'emerald' ? 'bg-emerald-500' :
              statusColor === 'red' ? 'bg-red-500' :
              statusColor === 'amber' ? 'bg-amber-500' : 'bg-blue-500'
            }`} />
          )}
        </div>
        <div className="flex items-baseline">
          <AnimatedNumber
            value={value}
            decimals={decimals}
            className={`kpi-value ${color}`}
          />
          {unit && <span className="kpi-unit">{unit}</span>}
          <span className={`ml-2 inline-flex items-center gap-0.5 text-[10px] font-medium ${
            dir === 'up' ? 'text-emerald-600 dark:text-emerald-400' : dir === 'down' ? 'text-red-500 dark:text-red-400' : 'text-steel-400 dark:text-steel-500'
          }`}>
            {dir === 'up' ? <TrendingUp className="w-3 h-3" /> : dir === 'down' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—'}
          </span>
        </div>
        <div className="mt-2">
          <Sparkline data={history} color={color.includes('emerald') ? '#10B981' : color.includes('amber') ? '#F59E0B' : color.includes('cyan') ? '#06B6D4' : '#0066CC'} />
        </div>
        {sub && <div className="mt-1 text-[11px] text-steel-400 dark:text-steel-500">{sub}</div>}
      </div>
    </div>
  )
}