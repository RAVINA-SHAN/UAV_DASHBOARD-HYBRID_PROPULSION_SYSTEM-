import type { TelemetryFrame } from '../../types'

interface StatusBarProps {
  telemetry: TelemetryFrame | null
  missionTime: number
}

function formatTime(min: number): string {
  const totalSec = Math.max(0, Math.min(38400, Math.floor(min * 60)))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function StatusBar({ telemetry, missionTime }: StatusBarProps) {
  const items = [
    { label: 'Phase', value: telemetry?.phase_name || '—' },
    { label: 'Sim Time', value: formatTime(missionTime) },
    { label: 'SOC', value: telemetry ? `${telemetry.soc.toFixed(1)}%` : '—', color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Fuel', value: telemetry ? `${telemetry.jeta_kg.toFixed(1)} kg` : '—', color: 'text-amber-600 dark:text-amber-400' },
    { label: 'H₂', value: telemetry ? `${telemetry.h2_kg.toFixed(2)} kg` : '—', color: 'text-cyan-600 dark:text-cyan-400' },
    { label: 'Power', value: telemetry ? `${(telemetry.p_req_W / 1000).toFixed(1)} kW` : '—' },
    { label: 'Alt', value: telemetry ? `${telemetry.alt_m.toFixed(0)} m` : '—' },
    { label: 'Vel', value: telemetry ? `${telemetry.vel_mps.toFixed(1)} m/s` : '—' },
    { label: 'Health', value: telemetry ? `${telemetry.system_health_pct.toFixed(0)}%` : '—', color: 'text-emerald-600 dark:text-emerald-400' },
  ]

  return (
    <footer className="flex items-center gap-4 px-4 py-1.5 bg-white border-t border-steel-200 dark:bg-navy-900 dark:border-navy-800 text-[11px] text-steel-500 dark:text-steel-400 overflow-x-auto flex-shrink-0">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-3">
          {i > 0 && <div className="w-px h-3.5 bg-steel-200 dark:bg-navy-700" />}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-steel-400 dark:text-navy-300">{item.label}</span>
            <span className={`font-mono font-semibold ${item.color || 'text-navy-800 dark:text-steel-200'}`}>{item.value}</span>
          </div>
        </div>
      ))}
    </footer>
  )
}
