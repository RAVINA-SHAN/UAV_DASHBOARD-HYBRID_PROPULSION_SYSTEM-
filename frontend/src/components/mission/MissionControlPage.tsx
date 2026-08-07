import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, Zap, Flame, Fuel, Activity, Compass, ArrowRight, Layers } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { TelemetryFrame } from '../../types'

interface MissionControlPageProps {
  telemetry: TelemetryFrame | null
  missionTime: number
  playSpeed: number
  isPlaying: boolean
  onPlayToggle: () => void
  onSpeedChange: (speed: number) => void
}

const DEFAULT_DESIGN = { battery_kwh: 40, fc_kw: 20, h2_kg: 10, jeta_kg: 30 }
const TOTAL_MISSION_MIN = 640.0
const SPEEDS = [1, 2, 3, 5, 10, 25, 50, 75, 100, 150, 200, 250]
const PHASE_COLORS: Record<string, string> = {
  'Take-off': '#EF4444',
  'Climb': '#F59E0B',
  'Cruise': '#3B82F6',
  'Loiter': '#10B981',
  'Descent': '#8B5CF6',
  'Landing': '#06B6D4',
}

const PHASE_DETAILS_DATA: Record<string, {
  name: string
  objective: string
  durationStr: string
  powerKw: number
  batteryPct: number
  fcPct: number
  enginePct: number
  genOutputKw: number
  motorPowerKw: number
  socRange: string
  fuelRange: string
  h2Range: string
  altM: number
  velMps: number
  thrustN: number
  rpmEng: number
  rpmMotor: number
  rpmProp: number
  apemsReason: string
}> = {
  'Take-off': {
    name: 'Take-off',
    objective: 'Aircraft lift-off and acceleration.',
    durationStr: '2 Minutes',
    powerKw: 93.5,
    batteryPct: 58.8,
    fcPct: 8.6,
    enginePct: 32.6,
    genOutputKw: 30.5,
    motorPowerKw: 93.5,
    socRange: '95.0% – 100.0%',
    fuelRange: '58.0 – 60.0 kg',
    h2Range: '19.8 – 20.0 kg',
    altM: 200,
    velMps: 40.0,
    thrustN: 2337,
    rpmEng: 4200,
    rpmMotor: 3000,
    rpmProp: 1950,
    apemsReason: 'Battery provides peak power boost while engine & fuel cell assist.',
  },
  'Climb': {
    name: 'Climb',
    objective: 'Reach cruise altitude.',
    durationStr: '18 Minutes',
    powerKw: 83.0,
    batteryPct: 48.2,
    fcPct: 21.7,
    enginePct: 30.1,
    genOutputKw: 25.0,
    motorPowerKw: 83.0,
    socRange: '80.0% – 95.0%',
    fuelRange: '50.0 – 58.0 kg',
    h2Range: '18.0 – 19.8 kg',
    altM: 4000,
    velMps: 55.0,
    thrustN: 1509,
    rpmEng: 3900,
    rpmMotor: 2800,
    rpmProp: 1820,
    apemsReason: 'Engine and battery supply primary climb power with FC support.',
  },
  'Cruise': {
    name: 'Cruise',
    objective: 'Long-range efficient flight.',
    durationStr: '5 Hours',
    powerKw: 28.7,
    batteryPct: 19.9,
    fcPct: 40.1,
    enginePct: 40.1,
    genOutputKw: 11.5,
    motorPowerKw: 28.7,
    socRange: '35.0% – 80.0%',
    fuelRange: '15.0 – 50.0 kg',
    h2Range: '5.0 – 18.0 kg',
    altM: 8000,
    velMps: 60.0,
    thrustN: 478,
    rpmEng: 3300,
    rpmMotor: 2400,
    rpmProp: 1560,
    apemsReason: 'Fuel cell & engine operate at peak efficiency; battery provides baseline.',
  },
  'Loiter': {
    name: 'Loiter',
    objective: 'Maximum endurance surveillance.',
    durationStr: '5 Hours 5 Minutes',
    powerKw: 23.5,
    batteryPct: 9.8,
    fcPct: 60.0,
    enginePct: 30.2,
    genOutputKw: 7.1,
    motorPowerKw: 23.5,
    socRange: '15.0% – 35.0%',
    fuelRange: '6.0 – 15.0 kg',
    h2Range: '2.5 – 5.0 kg',
    altM: 6000,
    velMps: 45.0,
    thrustN: 522,
    rpmEng: 3100,
    rpmMotor: 2200,
    rpmProp: 1430,
    apemsReason: 'Fuel cell dominates energy delivery; battery draw is minimized.',
  },
  'Descent': {
    name: 'Descent',
    objective: 'Controlled altitude reduction.',
    durationStr: '10 Minutes',
    powerKw: 21.0,
    batteryPct: 23.8,
    fcPct: 47.6,
    enginePct: 28.6,
    genOutputKw: 6.0,
    motorPowerKw: 21.0,
    socRange: '12.0% – 15.0%',
    fuelRange: '5.5 – 6.0 kg',
    h2Range: '2.2 – 2.5 kg',
    altM: 1000,
    velMps: 50.0,
    thrustN: 420,
    rpmEng: 2900,
    rpmMotor: 2100,
    rpmProp: 1365,
    apemsReason: 'Reduced engine power while maintaining stable descent profile.',
  },
  'Landing': {
    name: 'Landing',
    objective: 'Safe touchdown.',
    durationStr: '5 Minutes',
    powerKw: 25.0,
    batteryPct: 48.0,
    fcPct: 32.0,
    enginePct: 20.0,
    genOutputKw: 5.0,
    motorPowerKw: 25.0,
    socRange: '10.0% – 12.0%',
    fuelRange: '5.0 – 5.5 kg',
    h2Range: '2.0 – 2.2 kg',
    altM: 0,
    velMps: 30.0,
    thrustN: 833,
    rpmEng: 2800,
    rpmMotor: 2000,
    rpmProp: 1300,
    apemsReason: 'Battery provides instant response for touchdown precision.',
  },
}

function formatHMS(min: number): string {
  const totalSec = Math.max(0, Math.min(38400, Math.floor(min * 60)))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDuration(min: number): string {
  const sec = Math.round(min * 60)
  if (sec < 60) return `${sec}s`
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
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

function getPhaseAtTime(phases: any[], t: number): { phase: any; start: number; end: number } | null {
  let start = 0
  for (const phase of phases) {
    const end = start + phase.duration_min
    if (t >= start && t <= end) return { phase, start, end }
    start = end
  }
  return null
}

export function MissionControlPage({
  telemetry,
  missionTime,
  playSpeed,
  isPlaying,
  onPlayToggle,
  onSpeedChange,
}: MissionControlPageProps) {
  const [selectedPhaseName, setSelectedPhaseName] = useState<string | null>(null)

  const { data: compareData } = useQuery({
    queryKey: ['compare', DEFAULT_DESIGN],
    queryFn: () => api.compare(DEFAULT_DESIGN),
  })

  const phases = compareData?.physics.phases || [
    { name: 'Take-off', duration_min: 2 },
    { name: 'Climb', duration_min: 18 },
    { name: 'Cruise', duration_min: 300 },
    { name: 'Loiter', duration_min: 305 },
    { name: 'Descent', duration_min: 10 },
    { name: 'Landing', duration_min: 5 },
  ]
  const timeline = compareData?.physics.timeline || []
  const current = telemetry || timeline[Math.floor(missionTime * 60)] || timeline[0]
  const currentPhaseInfo = getPhaseAtTime(phases, missionTime)

  const activePhaseName = selectedPhaseName || currentPhaseInfo?.phase.name || 'Take-off'
  const activeDetails = PHASE_DETAILS_DATA[activePhaseName] || PHASE_DETAILS_DATA['Take-off']

  const remaining = Math.max(0, TOTAL_MISSION_MIN - missionTime)
  const progressPct = Math.min(100, (missionTime / TOTAL_MISSION_MIN) * 100)

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900 dark:text-white">Mission Control</h1>
          <p className="text-[12px] text-steel-500 dark:text-steel-400">Mission timeline, phase awareness, and power profile</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-blue">Mission: Grand Challenge 2026</span>
          <span className="badge badge-green">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>
      </div>

      {/* Mission Clock */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Mission Clock</div>
          <div className="flex items-center gap-3">
            <button className="btn btn-sm" onClick={onPlayToggle}>
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <div className="flex items-center gap-1 overflow-x-auto max-w-[320px]">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors flex-shrink-0 ${
                    playSpeed === s
                      ? 'bg-aerospace-500 text-white font-bold'
                      : 'bg-steel-50 text-steel-600 hover:bg-steel-100 border border-steel-200 dark:bg-navy-800 dark:text-navy-300 dark:border-navy-700'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-3 border-r border-steel-100 dark:border-navy-800 pr-3">
              <div className="kpi-label mb-1">Elapsed</div>
              <div className="font-mono text-2xl font-bold text-navy-900 dark:text-white">{formatHMS(missionTime)}</div>
              <div className="text-[11px] text-steel-400 mt-1">/ 10:40:00</div>
            </div>
            <div className="col-span-3 border-r border-steel-100 dark:border-navy-800 pr-3">
              <div className="kpi-label mb-1">Remaining</div>
              <div className="font-mono text-2xl font-bold text-aerospace-600 dark:text-aerospace-400">{formatHMS(remaining)}</div>
              <div className="text-[11px] text-steel-400 mt-1">Time until landing</div>
            </div>
            <div className="col-span-3 border-r border-steel-100 dark:border-navy-800 pr-3">
              <div className="kpi-label mb-1">Current Phase</div>
              <div className="text-lg font-semibold text-navy-900 dark:text-white">{currentPhaseInfo?.phase.name || current?.phase_name || '—'}</div>
              <div className="text-[11px] font-semibold text-aerospace-600 dark:text-aerospace-400 mt-1">
                Phase {getPhaseNumber(currentPhaseInfo?.phase.name || current?.phase_name, missionTime)} of 6
              </div>
            </div>
            <div className="col-span-3">
              <div className="kpi-label mb-1">Mission Progress</div>
              <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">{progressPct.toFixed(1)}%</div>
              <div className="progress-bar mt-2">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Mission timeline Cards */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="card-title">Mission Phases</div>
          <div className="text-[11px] text-steel-400">Click any phase card to inspect detailed telemetry & energy flow</div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-6 gap-2">
            {phases.map((phase) => {
              const isCurrent = currentPhaseInfo?.phase.name === phase.name
              const isSelected = activePhaseName === phase.name
              const pNum = getPhaseNumber(phase.name)
              return (
                <button
                  key={phase.name}
                  onClick={() => setSelectedPhaseName(phase.name)}
                  className={`p-3 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-aerospace-500 bg-aerospace-50 dark:bg-aerospace-900/30 ring-2 ring-aerospace-400/40 shadow-sm'
                      : isCurrent
                      ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-steel-200 dark:border-navy-800 bg-white dark:bg-navy-900 hover:border-aerospace-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PHASE_COLORS[phase.name] || '#94A3B8' }}
                      />
                      <span className="text-[12px] font-bold text-navy-900 dark:text-white truncate">
                        {phase.name}
                      </span>
                    </div>
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Phase" />
                    )}
                  </div>
                  <div className="text-[10px] text-steel-500 dark:text-steel-400 font-mono">
                    Phase {pNum} of 6
                  </div>
                  <div className="text-[11px] font-semibold text-aerospace-600 dark:text-aerospace-400 mt-1">
                    {formatDuration(phase.duration_min)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Dynamic Phase Details Panel */}
      <div className="card border-l-4 border-l-aerospace-500">
        <div className="card-header flex items-center justify-between bg-steel-50/50 dark:bg-navy-900/50">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-aerospace-500" />
            <div className="card-title text-navy-900 dark:text-white">
              Phase Details — <span className="text-aerospace-600 dark:text-aerospace-400">{activeDetails.name}</span> (Phase {getPhaseNumber(activeDetails.name)} of 6)
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-aerospace-100 text-aerospace-800 font-medium">
              Duration: {activeDetails.durationStr}
            </span>
            <span className="px-2 py-0.5 rounded bg-navy-100 text-navy-800 font-medium">
              Target Power: {activeDetails.powerKw} kW
            </span>
          </div>
        </div>
        <div className="card-body space-y-4">
          {/* Objective & APEMS Reason */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6 p-3 rounded-md bg-white dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-steel-400 mb-1">Mission Objective</div>
              <div className="text-[13px] font-medium text-navy-900 dark:text-white">{activeDetails.objective}</div>
            </div>
            <div className="col-span-6 p-3 rounded-md bg-white dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-steel-400 mb-1">Supervisory APEMS Controller Decision</div>
              <div className="text-[13px] font-medium text-aerospace-700 dark:text-aerospace-300">{activeDetails.apemsReason}</div>
            </div>
          </div>

          {/* Energy Flow Diagram */}
          <div className="p-3.5 rounded-lg bg-navy-950 text-white border border-navy-800">
            <div className="text-[11px] font-semibold text-navy-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-aerospace-400" />
              Interactive Energy Flow Diagram — {activeDetails.name} Phase ({activeDetails.powerKw} kW Required)
            </div>
            <div className="flex items-center justify-between gap-2 overflow-x-auto py-2 px-1">
              {/* Battery Source */}
              <div className="flex-1 p-2.5 rounded-md bg-navy-900 border border-emerald-500/40 text-center min-w-[110px]">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-400 mb-1">
                  <Zap className="w-3.5 h-3.5" /> Battery
                </div>
                <div className="text-base font-bold text-white">{activeDetails.batteryPct}%</div>
                <div className="text-[10px] text-navy-300 mt-0.5">{(activeDetails.powerKw * activeDetails.batteryPct / 100).toFixed(1)} kW</div>
                <div className="text-[9px] text-emerald-400/80 mt-1 font-mono">SOC: {activeDetails.socRange}</div>
              </div>

              <ArrowRight className="w-4 h-4 text-navy-500 flex-shrink-0" />

              {/* Fuel Cell Source */}
              <div className="flex-1 p-2.5 rounded-md bg-navy-900 border border-cyan-500/40 text-center min-w-[110px]">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-cyan-400 mb-1">
                  <Fuel className="w-3.5 h-3.5" /> Fuel Cell
                </div>
                <div className="text-base font-bold text-white">{activeDetails.fcPct}%</div>
                <div className="text-[10px] text-navy-300 mt-0.5">{(activeDetails.powerKw * activeDetails.fcPct / 100).toFixed(1)} kW</div>
                <div className="text-[9px] text-cyan-400/80 mt-1 font-mono">H₂: {activeDetails.h2Range}</div>
              </div>

              <ArrowRight className="w-4 h-4 text-navy-500 flex-shrink-0" />

              {/* Engine + Generator */}
              <div className="flex-1 p-2.5 rounded-md bg-navy-900 border border-amber-500/40 text-center min-w-[110px]">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-400 mb-1">
                  <Flame className="w-3.5 h-3.5" /> Engine
                </div>
                <div className="text-base font-bold text-white">{activeDetails.enginePct}%</div>
                <div className="text-[10px] text-navy-300 mt-0.5">Gen: {activeDetails.genOutputKw} kW</div>
                <div className="text-[9px] text-amber-400/80 mt-1 font-mono">Fuel: {activeDetails.fuelRange}</div>
              </div>

              <ArrowRight className="w-4 h-4 text-navy-400 flex-shrink-0" />

              {/* 800V DC Bus */}
              <div className="p-2.5 rounded-md bg-aerospace-900/60 border border-aerospace-500 text-center min-w-[100px]">
                <div className="text-[10px] font-semibold text-aerospace-300 uppercase tracking-wider mb-1">DC Bus</div>
                <div className="text-sm font-mono font-bold text-white">800 V</div>
                <div className="text-[10px] text-aerospace-200 mt-0.5">{activeDetails.powerKw} kW Total</div>
              </div>

              <ArrowRight className="w-4 h-4 text-navy-400 flex-shrink-0" />

              {/* PMSM Motor */}
              <div className="p-2.5 rounded-md bg-violet-950 border border-violet-500/40 text-center min-w-[110px]">
                <div className="text-[10px] font-semibold text-violet-300 uppercase tracking-wider mb-1">PMSM Motor</div>
                <div className="text-sm font-mono font-bold text-white">{activeDetails.motorPowerKw} kW</div>
                <div className="text-[10px] text-violet-300 mt-0.5">{activeDetails.rpmMotor} RPM</div>
              </div>

              <ArrowRight className="w-4 h-4 text-navy-400 flex-shrink-0" />

              {/* Propeller & Thrust */}
              <div className="p-2.5 rounded-md bg-navy-900 border border-steel-600 text-center min-w-[120px]">
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-steel-300 uppercase tracking-wider mb-1">
                  <Compass className="w-3.5 h-3.5" /> Propeller
                </div>
                <div className="text-sm font-mono font-bold text-white">{activeDetails.thrustN.toLocaleString()} N</div>
                <div className="text-[10px] text-steel-400 mt-0.5">{activeDetails.rpmProp} RPM</div>
              </div>
            </div>
          </div>

          {/* Phase Parameters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Power Requirement</div>
              <div className="telemetry-value text-navy-900 dark:text-white">{activeDetails.powerKw} kW</div>
            </div>
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Battery Contribution</div>
              <div className="telemetry-value text-emerald-600 dark:text-emerald-400">{activeDetails.batteryPct}%</div>
            </div>
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Fuel Cell Contribution</div>
              <div className="telemetry-value text-cyan-600 dark:text-cyan-400">{activeDetails.fcPct}%</div>
            </div>
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Engine Contribution</div>
              <div className="telemetry-value text-amber-600 dark:text-amber-400">{activeDetails.enginePct}%</div>
            </div>
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Generator Output</div>
              <div className="telemetry-value text-indigo-600 dark:text-indigo-400">{activeDetails.genOutputKw} kW</div>
            </div>
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Motor Power</div>
              <div className="telemetry-value text-violet-600 dark:text-violet-400">{activeDetails.motorPowerKw} kW</div>
            </div>
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Battery SOC</div>
              <div className="telemetry-value text-emerald-600 dark:text-emerald-400">{activeDetails.socRange}</div>
            </div>

            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Fuel Remaining</div>
              <div className="telemetry-value text-amber-600 dark:text-amber-400">{activeDetails.fuelRange}</div>
            </div>
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Hydrogen Remaining</div>
              <div className="telemetry-value text-cyan-600 dark:text-cyan-400">{activeDetails.h2Range}</div>
            </div>
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Expected Altitude</div>
              <div className="telemetry-value text-navy-900 dark:text-white">{activeDetails.altM} m</div>
            </div>
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Expected Velocity</div>
              <div className="telemetry-value text-navy-900 dark:text-white">{activeDetails.velMps} m/s</div>
            </div>
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Expected Thrust</div>
              <div className="telemetry-value text-navy-900 dark:text-white">{activeDetails.thrustN.toLocaleString()} N</div>
            </div>
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Expected Engine RPM</div>
              <div className="telemetry-value text-amber-600 dark:text-amber-400">{activeDetails.rpmEng} RPM</div>
            </div>
            <div className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-200 dark:border-navy-800">
              <div className="telemetry-label">Expected Motor RPM</div>
              <div className="telemetry-value text-violet-600 dark:text-violet-400">{activeDetails.rpmMotor} RPM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Power profile + Energy split */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 card">
          <div className="card-header">
            <div className="card-title">Mission Power Profile — {activePhaseName} Highlighted</div>
            <div className="flex items-center gap-3 text-[10px] text-steel-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-navy-800" />Total</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Engine</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Battery</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" />Fuel Cell</span>
            </div>
          </div>
          <div className="card-body">
            <svg className="w-full h-52" viewBox="0 0 800 220" preserveAspectRatio="none">
              {/* Phase background shading with active phase highlighting */}
              {(() => {
                let start = 0
                const colors = [
                  'rgba(239,68,68,0.12)',
                  'rgba(245,158,11,0.12)',
                  'rgba(59,130,246,0.12)',
                  'rgba(16,185,129,0.12)',
                  'rgba(139,92,246,0.12)',
                  'rgba(6,182,212,0.12)',
                ]
                return phases.map((phase, i) => {
                  const isSelected = activePhaseName === phase.name
                  const x = (start / TOTAL_MISSION_MIN) * 800
                  const w = (phase.duration_min / TOTAL_MISSION_MIN) * 800
                  const rect = (
                    <rect
                      key={phase.name}
                      x={x}
                      y="0"
                      width={w}
                      height="220"
                      fill={isSelected ? colors[i % colors.length].replace('0.12', '0.35') : colors[i % colors.length]}
                      stroke={isSelected ? '#0066CC' : 'none'}
                      strokeWidth={isSelected ? '2' : '0'}
                    />
                  )
                  start += phase.duration_min
                  return rect
                })
              })()}

              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={i} x1="0" y1={i * 44} x2="800" y2={i * 44} stroke="#E2E8F0" strokeWidth="0.5" />
              ))}

              {/* Power curves */}
              {timeline.length > 1 && (
                <>
                  <polyline
                    points={timeline
                      .filter((_, i) => i % 4 === 0)
                      .map((f, i) => `${(i / (timeline.length / 4)) * 800},${220 - (f.p_req_W / 1000 / 120) * 200}`)
                      .join(' ')}
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="2"
                  />
                  <polyline
                    points={timeline
                      .filter((_, i) => i % 4 === 0)
                      .map((f, i) => `${(i / (timeline.length / 4)) * 800},${220 - (f.p_eng_W / 1000 / 120) * 200}`)
                      .join(' ')}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                  />
                  <polyline
                    points={timeline
                      .filter((_, i) => i % 4 === 0)
                      .map((f, i) => `${(i / (timeline.length / 4)) * 800},${220 - (Math.abs(f.p_bat_W) / 1000 / 120) * 200}`)
                      .join(' ')}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="1.5"
                  />
                  <polyline
                    points={timeline
                      .filter((_, i) => i % 4 === 0)
                      .map((f, i) => `${(i / (timeline.length / 4)) * 800},${220 - (f.p_fc_W / 1000 / 120) * 200}`)
                      .join(' ')}
                    fill="none"
                    stroke="#06B6D4"
                    strokeWidth="1.5"
                  />
                </>
              )}

              {/* Current time cursor */}
              <line
                x1={(missionTime / TOTAL_MISSION_MIN) * 800}
                y1="0"
                x2={(missionTime / TOTAL_MISSION_MIN) * 800}
                y2="220"
                stroke="#0066CC"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <circle
                cx={(missionTime / TOTAL_MISSION_MIN) * 800}
                cy="10"
                r="4"
                fill="#0066CC"
              />
            </svg>
          </div>
        </div>

        {/* Phase energy split */}
        <div className="col-span-4 card">
          <div className="card-header">
            <div className="card-title">Phase Energy Split — {activePhaseName}</div>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {phases.map((phase) => {
                const split = PHASE_DETAILS_DATA[phase.name] || { batteryPct: 33, fcPct: 33, enginePct: 33, powerKw: 0 }
                const isSelected = activePhaseName === phase.name
                return (
                  <div
                    key={phase.name}
                    onClick={() => setSelectedPhaseName(phase.name)}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-aerospace-500 bg-aerospace-50 dark:bg-aerospace-900/30 ring-1 ring-aerospace-400'
                        : 'border-steel-200 hover:border-steel-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-semibold text-navy-900 dark:text-white">{phase.name}</span>
                      <span className="text-[10px] text-steel-500 font-mono">
                        Power: {split.powerKw} kW
                      </span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500" style={{ width: `${split.batteryPct}%` }} />
                      <div className="bg-cyan-500" style={{ width: `${split.fcPct}%` }} />
                      <div className="bg-amber-500" style={{ width: `${split.enginePct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-steel-500">
                      <span>BAT {split.batteryPct}%</span>
                      <span>FC {split.fcPct}%</span>
                      <span>ENG {split.enginePct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Live telemetry for active phase */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="card-title">Telemetry Parameters — {activePhaseName} Phase</div>
          <span className="badge badge-blue">Synchronized</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: 'Bat Power', value: `${(activeDetails.powerKw * activeDetails.batteryPct / 100).toFixed(1)} kW`, color: 'text-emerald-600' },
              { label: 'FC Power', value: `${(activeDetails.powerKw * activeDetails.fcPct / 100).toFixed(1)} kW`, color: 'text-cyan-600' },
              { label: 'Motor Power', value: `${activeDetails.motorPowerKw} kW`, color: 'text-violet-600' },
              { label: 'Gen Output', value: `${activeDetails.genOutputKw} kW`, color: 'text-indigo-600' },
              { label: 'Bat SOC', value: activeDetails.socRange, color: 'text-emerald-600' },
              { label: 'Expected Thrust', value: `${activeDetails.thrustN.toLocaleString()} N` },
              { label: 'H₂ Remaining', value: activeDetails.h2Range, color: 'text-cyan-600' },
              { label: 'Fuel Remaining', value: activeDetails.fuelRange, color: 'text-amber-600' },
              { label: 'Eng RPM', value: `${activeDetails.rpmEng} RPM`, color: 'text-amber-600' },
              { label: 'Mot RPM', value: `${activeDetails.rpmMotor} RPM` },
              { label: 'Prop RPM', value: `${activeDetails.rpmProp} RPM` },
              { label: 'Altitude', value: `${activeDetails.altM} m` },
            ].map((item) => (
              <div key={item.label} className="p-2.5 rounded-md bg-steel-50 dark:bg-navy-900 border border-steel-100 dark:border-navy-800">
                <div className="telemetry-label">{item.label}</div>
                <div className={`telemetry-value text-sm ${item.color || 'text-navy-900 dark:text-white'}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}