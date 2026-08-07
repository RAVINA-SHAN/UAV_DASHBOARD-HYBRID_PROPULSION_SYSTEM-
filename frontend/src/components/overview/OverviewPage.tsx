import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { TelemetryFrame } from '../../types'

interface OverviewPageProps {
  telemetry: TelemetryFrame | null
}

const DEFAULT_DESIGN = { battery_kwh: 40, fc_kw: 20, h2_kg: 10, jeta_kg: 30 }

function formatTime(min: number): string {
  const totalSec = Math.max(0, Math.min(38400, Math.floor(min * 60)))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getPhaseNumber(phaseIdOrName?: string, tMin?: number): number {
  if (phaseIdOrName) {
    const key = phaseIdOrName.toLowerCase().replace(/[^a-z]/g, '')
    const map: Record<string, number> = {
      takeoff: 1,
      climb: 2,
      cruise: 3,
      loiter: 4,
      descent: 5,
      landing: 6,
    }
    if (map[key]) return map[key]
  }
  const min = tMin || 0
  if (min < 2) return 1
  if (min < 20) return 2
  if (min < 320) return 3
  if (min < 625) return 4
  if (min < 635) return 5
  return 6
}

function KpiCard({
  label,
  value,
  unit,
  sub,
  color = 'text-navy-900',
}: {
  label: string
  value: string
  unit?: string
  sub?: string
  color?: string
}) {
  return (
    <div className="card">
      <div className="p-4">
        <div className="kpi-label mb-1">{label}</div>
        <div className="flex items-baseline">
          <span className={`kpi-value ${color}`}>{value}</span>
          {unit && <span className="kpi-unit">{unit}</span>}
        </div>
        {sub && <div className="mt-1 text-[11px] text-steel-400 dark:text-steel-500">{sub}</div>}
      </div>
    </div>
  )
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
  return (
    <svg className="w-full h-8" viewBox="0 0 100 32" preserveAspectRatio="none">
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

export function OverviewPage({ telemetry }: OverviewPageProps) {
  const { data: compareData, isLoading } = useQuery({
    queryKey: ['compare', DEFAULT_DESIGN],
    queryFn: () => api.compare(DEFAULT_DESIGN),
  })

  const timeline = compareData?.physics.timeline || []
  const socData = timeline.map((f) => f.soc)
  const powerData = timeline.map((f) => f.p_req_W / 1000)
  const fuelData = timeline.map((f) => f.jeta_kg)
  const h2Data = timeline.map((f) => f.h2_kg)

  const current = telemetry || timeline[0]
  const phaseNum = getPhaseNumber(current?.phase_name || current?.phase, telemetry?.t_min)

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900 dark:text-steel-100">Mission Overview</h1>
          <p className="text-[12px] text-steel-500 dark:text-steel-400">Real-time mission status and system health</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-green">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            System Nominal
          </span>
          <span className="badge badge-blue">Mission Active</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-3">
          <KpiCard
            label="Mission Time"
            value={formatTime(telemetry?.t_min || 0)}
            sub={`${((telemetry?.mission_progress_pct || 0)).toFixed(1)}% complete`}
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Current Phase"
            value={current?.phase_name || '—'}
            sub={`Phase ${phaseNum} of 6`}
            color="text-aerospace-600 dark:text-aerospace-400"
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Est. Endurance"
            value={compareData ? compareData.physics.endurance_hr.toFixed(1) : '—'}
            unit="hr"
            sub={`ML: ${compareData?.ml.predicted_endurance_hr.toFixed(1) || '—'} hr`}
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="System Health"
            value={current ? current.system_health_pct.toFixed(0) : '—'}
            unit="%"
            color="text-emerald-600 dark:text-emerald-400"
          />
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-3">
          <KpiCard
            label="Battery SOC"
            value={current ? current.soc.toFixed(1) : '—'}
            unit="%"
            color="text-emerald-600 dark:text-emerald-400"
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Fuel Remaining"
            value={current ? current.jeta_kg.toFixed(1) : '—'}
            unit="kg"
            color="text-amber-600 dark:text-amber-400"
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Hydrogen"
            value={current ? current.h2_kg.toFixed(2) : '—'}
            unit="kg"
            color="text-cyan-600 dark:text-cyan-400"
          />
        </div>
        <div className="col-span-3">
          <KpiCard
            label="Overall Efficiency"
            value={current ? current.overall_efficiency_pct.toFixed(1) : '—'}
            unit="%"
            color="text-aerospace-600 dark:text-aerospace-400"
          />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-12 gap-3">
        {/* Power profile */}
        <div className="col-span-8 card">
          <div className="card-header">
            <div className="card-title">Mission Power Profile</div>
            <div className="flex items-center gap-3 text-[10px] text-steel-500 dark:text-steel-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-navy-800 dark:bg-steel-300" />Total</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Engine</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Battery</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" />Fuel Cell</span>
            </div>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-steel-400 dark:text-steel-500">Loading telemetry…</div>
            ) : (
              <svg className="w-full h-48" viewBox="0 0 800 200" preserveAspectRatio="none">
                {timeline.length > 1 && (
                  <>
                    {/* Grid lines */}
                    {[0, 1, 2, 3].map((i) => (
                      <line key={i} x1="0" y1={i * 50} x2="800" y2={i * 50} stroke="#E2E8F0" className="dark:stroke-steel-700" strokeWidth="0.5" />
                    ))}
                    {/* Total power */}
                    <polyline
                      points={timeline
                        .filter((_, i) => i % 4 === 0)
                        .map((f, i) => `${(i / (timeline.length / 4)) * 800},${200 - (f.p_req_W / 1000 / 120) * 190}`)
                        .join(' ')}
                      fill="none"
                      stroke="#1E293B"
                      className="dark:stroke-steel-200"
                      strokeWidth="2"
                    />
                    {/* Engine power */}
                    <polyline
                      points={timeline
                        .filter((_, i) => i % 4 === 0)
                        .map((f, i) => `${(i / (timeline.length / 4)) * 800},${200 - (f.p_eng_W / 1000 / 120) * 190}`)
                        .join(' ')}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="1.5"
                    />
                    {/* Battery power */}
                    <polyline
                      points={timeline
                        .filter((_, i) => i % 4 === 0)
                        .map((f, i) => `${(i / (timeline.length / 4)) * 800},${200 - (Math.abs(f.p_bat_W) / 1000 / 120) * 190}`)
                        .join(' ')}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="1.5"
                    />
                    {/* Fuel cell power */}
                    <polyline
                      points={timeline
                        .filter((_, i) => i % 4 === 0)
                        .map((f, i) => `${(i / (timeline.length / 4)) * 800},${200 - (f.p_fc_W / 1000 / 120) * 190}`)
                        .join(' ')}
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="1.5"
                    />
                  </>
                )}
              </svg>
            )}
          </div>
        </div>

        {/* Resource levels */}
        <div className="col-span-4 card">
          <div className="card-header">
            <div className="card-title">Resource Levels</div>
          </div>
          <div className="card-body space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="telemetry-label">Battery SOC</span>
                <span className="font-mono text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {current ? current.soc.toFixed(1) : '—'}%
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill bg-emerald-500" style={{ width: `${current?.soc || 0}%` }} />
              </div>
              <div className="mt-1"><Sparkline data={socData.slice(-50)} color="#10B981" /></div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="telemetry-label">Fuel</span>
                <span className="font-mono text-[12px] font-semibold text-amber-600 dark:text-amber-400">
                  {current ? current.jeta_kg.toFixed(1) : '—'} kg
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill bg-amber-500" style={{ width: `${((current?.jeta_kg || 0) / 30) * 100}%` }} />
              </div>
              <div className="mt-1"><Sparkline data={fuelData.slice(-50)} color="#F59E0B" /></div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="telemetry-label">Hydrogen</span>
                <span className="font-mono text-[12px] font-semibold text-cyan-600 dark:text-cyan-400">
                  {current ? current.h2_kg.toFixed(2) : '—'} kg
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill bg-cyan-500" style={{ width: `${((current?.h2_kg || 0) / 10) * 100}%` }} />
              </div>
              <div className="mt-1"><Sparkline data={h2Data.slice(-50)} color="#06B6D4" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Mission phases */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Mission Phases</div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-6 gap-3">
            {compareData?.physics.phases.map((phase) => (
              <div
                key={phase.name}
                className={`p-3 rounded-md border ${
                  current?.phase_name === phase.name
                    ? 'border-aerospace-400 bg-aerospace-50 dark:bg-aerospace-900/30'
                    : 'border-steel-200 bg-white dark:border-navy-800 dark:bg-navy-900'
                }`}
              >
                <div className="text-[11px] font-semibold text-navy-900 dark:text-steel-100">{phase.name}</div>
                <div className="text-[10px] text-steel-500 dark:text-steel-400 mt-0.5">
                  {phase.duration_min >= 60
                    ? `${(phase.duration_min / 60).toFixed(1)} hr`
                    : `${phase.duration_min} min`}
                </div>
                <div className="text-[10px] font-mono text-steel-400 dark:text-steel-500 mt-1">
                  Peak: {phase.peak_power_kw} kW
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}