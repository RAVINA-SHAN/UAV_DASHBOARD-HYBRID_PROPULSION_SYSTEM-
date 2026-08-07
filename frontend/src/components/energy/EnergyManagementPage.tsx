import { useState } from 'react'
import { Zap, Battery, Fuel, Flame, ArrowDown, Gauge as GaugeIcon, Activity } from 'lucide-react'
import type { TelemetryFrame } from '../../types'
import { useTelemetryHistory } from '../../hooks/useTelemetryHistory'
import { EquationBox, PageSection } from '../common/EquationBox'
import { LinearGauge } from '../common/Gauge'

interface EnergyManagementPageProps {
  telemetry: TelemetryFrame | null
}

/**
 * Energy Management — Animated Sankey diagram showing power flow from sources
 * (Battery, Fuel Cell, Engine) through DC Bus → Motor → Propeller.
 * Includes APEMS decision logic and efficiency/loss analysis.
 */
export function EnergyManagementPage({ telemetry }: EnergyManagementPageProps) {
  const [selectedPath, setSelectedPath] = useState<'battery' | 'fc' | 'engine'>('battery')
  const history = useTelemetryHistory(telemetry, 80)

  const pBat = telemetry?.p_bat_W || 0
  const pFc = telemetry?.p_fc_W || 0
  const pEng = telemetry?.p_eng_W || 0
  const pGen = telemetry?.p_gen_W || 0
  const pMotor = telemetry?.p_motor_W || 0
  const pReq = telemetry?.p_req_W || 0
  const busV = telemetry?.bus_voltage || 540
  const busI = telemetry?.bus_current || 0
  const totalIn = Math.max(1, Math.abs(pBat) + pFc + pEng + pGen)
  const totalOut = Math.max(1, pMotor + 1)
  const efficiency = pReq > 0 ? (pMotor / pReq) * 100 : 0
  const losses = pReq - pMotor

  const batPct = (Math.abs(pBat) / totalIn) * 100
  const fcPct = (pFc / totalIn) * 100
  const engPct = (pEng / totalIn) * 100

  // Sankey node positions
  const sources = [
    { name: 'Battery', power: Math.abs(pBat), pct: batPct, color: '#10B981', y: 60 },
    { name: 'Fuel Cell', power: pFc, pct: fcPct, color: '#06B6D4', y: 150 },
    { name: 'Engine', power: pEng, pct: engPct, color: '#F59E0B', y: 240 },
  ]
  const bus = { name: 'DC Bus', power: totalIn, y: 150, color: '#0066CC' }
  const motor = { name: 'Motor', power: pMotor, y: 150, color: '#8B5CF6' }
  const prop = { name: 'Propeller', power: pMotor * 0.92, y: 150, color: '#0EA5E9' }

  // 6-Phase APEMS Decision Logic Data
  const APEMS_PHASE_DECISIONS = [
    {
      phase: 'Take-off',
      durationStr: '2 sec',
      powerKw: 110,
      priority: { bat: 'HIGH', fc: 'LOW', eng: 'MEDIUM' },
      energySplit: { bat: 70, fc: 10, eng: 20 },
      reason: 'Battery supplies peak take-off power while the engine supports acceleration.',
      voltageV: 800,
      genOutputKw: 20.9,
      motorPowerKw: 115.8,
      efficiencyPct: 95.5,
    },
    {
      phase: 'Climb',
      durationStr: '18 sec',
      powerKw: 90,
      priority: { bat: 'HIGH', fc: 'MEDIUM', eng: 'MEDIUM' },
      energySplit: { bat: 55, fc: 20, eng: 25 },
      reason: 'Battery assists climb while the fuel cell gradually increases power.',
      voltageV: 800,
      genOutputKw: 21.4,
      motorPowerKw: 94.7,
      efficiencyPct: 95.0,
    },
    {
      phase: 'Cruise',
      durationStr: '5 min',
      powerKw: 30,
      priority: { bat: 'LOW', fc: 'HIGH', eng: 'MEDIUM' },
      energySplit: { bat: 20, fc: 40, eng: 40 },
      reason: 'Fuel cell becomes the primary energy source for efficient long-endurance flight.',
      voltageV: 800,
      genOutputKw: 11.4,
      motorPowerKw: 31.6,
      efficiencyPct: 94.8,
    },
    {
      phase: 'Loiter',
      durationStr: '5 min',
      powerKw: 25,
      priority: { bat: 'MINIMUM', fc: 'HIGH', eng: 'MEDIUM' },
      energySplit: { bat: 15, fc: 50, eng: 35 },
      reason: 'Fuel cell maximizes endurance while minimizing battery usage.',
      voltageV: 800,
      genOutputKw: 8.3,
      motorPowerKw: 26.3,
      efficiencyPct: 94.5,
    },
    {
      phase: 'Descent',
      durationStr: '5 sec',
      powerKw: 25,
      priority: { bat: 'MEDIUM', fc: 'LOW', eng: 'LOW' },
      energySplit: { bat: 40, fc: 25, eng: 35 },
      reason: 'Reduce engine output while battery maintains stable aircraft control.',
      voltageV: 800,
      genOutputKw: 8.3,
      motorPowerKw: 26.3,
      efficiencyPct: 94.5,
    },
    {
      phase: 'Landing',
      durationStr: '10 sec',
      powerKw: 20,
      priority: { bat: 'HIGH', fc: 'LOW', eng: 'LOW' },
      energySplit: { bat: 50, fc: 20, eng: 30 },
      reason: 'Battery provides precise landing power while the engine remains at idle.',
      voltageV: 800,
      genOutputKw: 5.7,
      motorPowerKw: 21.1,
      efficiencyPct: 94.2,
    },
  ]

  const [selectedPhaseName, setSelectedPhaseName] = useState<string | null>(null)
  const activePhaseName = selectedPhaseName || telemetry?.phase_name || 'Take-off'
  const activeDecision = APEMS_PHASE_DECISIONS.find((d) => d.phase === activePhaseName) || APEMS_PHASE_DECISIONS[0]

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'HIGH':
        return 'text-emerald-600 dark:text-emerald-400 font-bold'
      case 'MEDIUM':
        return 'text-amber-600 dark:text-amber-400 font-bold'
      case 'LOW':
        return 'text-orange-500 dark:text-orange-400 font-bold'
      case 'MINIMUM':
        return 'text-red-500 dark:text-red-400 font-bold'
      default:
        return 'text-steel-600 dark:text-steel-300 font-bold'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900 dark:text-white">Energy Management</h1>
          <p className="text-[12px] text-steel-500 dark:text-steel-400">APEMS power flow, efficiency, losses, and decision logic</p>
        </div>
        <span className="badge badge-blue">APEMS v3.0 Active</span>
      </div>

      {/* Sankey diagram */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Animated Power Flow — Sankey</div>
          <div className="flex items-center gap-2">
            {(['battery', 'fc', 'engine'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedPath(key)}
                className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                  selectedPath === key
                    ? 'bg-aerospace-500 text-white'
                    : 'bg-steel-50 text-steel-500 hover:bg-steel-100 border border-steel-200 dark:bg-navy-800 dark:text-navy-300 dark:border-navy-700'
                }`}
              >
                {key === 'battery' ? 'Battery' : key === 'fc' ? 'Fuel Cell' : 'Engine'}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          <svg className="w-full h-72" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid meet">
            {/* Source nodes */}
            {sources.map((src) => (
              <g key={src.name}>
                <rect
                  x="20" y={src.y - 25 - (src.pct * 0.4)}
                  width="120" height={50 + src.pct * 0.8}
                  rx="6"
                  fill={src.color}
                  opacity="0.85"
                />
                <text x="80" y={src.y + 4} textAnchor="middle" fontSize="11" fill="white" fontWeight="600">
                  {src.name}
                </text>
                <text x="80" y={src.y + 18} textAnchor="middle" fontSize="9" fill="white" opacity="0.9" fontFamily="monospace">
                  {(src.power / 1000).toFixed(1)} kW
                </text>
              </g>
            ))}

            {/* Flow bands (animated) */}
            {sources.map((src, i) => {
              const w = Math.max(4, src.pct * 2)
              return (
                <g key={`flow-${i}`}>
                  <path
                    d={`M 140 ${src.y} C 220 ${src.y}, 240 ${bus.y - 30}, 280 ${bus.y}`}
                    fill="none"
                    stroke={src.color}
                    strokeWidth={w}
                    strokeOpacity="0.5"
                    strokeDasharray="8 6"
                    className="animated-flow"
                  />
                </g>
              )
            })}

            {/* Bus node */}
            <rect x="260" y={bus.y - 35} width="100" height="70" rx="8" fill={bus.color} />
            <text x="310" y={bus.y + 2} textAnchor="middle" fontSize="11" fill="white" fontWeight="600">DC Bus</text>
            <text x="310" y={bus.y + 17} textAnchor="middle" fontSize="9" fill="white" opacity="0.9" fontFamily="monospace">
              {(bus.power / 1000).toFixed(1)} kW
            </text>

            {/* Bus to Motor */}
            <path
              d={`M 360 ${bus.y} C 420 ${bus.y}, 440 ${motor.y - 20}, 460 ${motor.y}`}
              fill="none" stroke="#8B5CF6" strokeWidth="30" strokeOpacity="0.4"
              strokeDasharray="10 8" className="animated-flow"
            />

            {/* Motor node */}
            <rect x="460" y={motor.y - 35} width="110" height="70" rx="8" fill="#8B5CF6" />
            <text x="515" y={motor.y + 2} textAnchor="middle" fontSize="11" fill="white" fontWeight="600">PMSM Motor</text>
            <text x="515" y={motor.y + 17} textAnchor="middle" fontSize="9" fill="white" opacity="0.9" fontFamily="monospace">
              {(motor.power / 1000).toFixed(1)} kW
            </text>

            {/* Motor to Propeller */}
            <path
              d={`M 570 ${motor.y} C 610 ${motor.y}, 630 ${prop.y - 20}, 650 ${prop.y}`}
              fill="none" stroke="#0EA5E9" strokeWidth="24" strokeOpacity="0.4"
              strokeDasharray="10 8" className="animated-flow"
            />

            {/* Propeller node */}
            <rect x="650" y={prop.y - 30} width="120" height="60" rx="8" fill="#0EA5E9" />
            <text x="710" y={prop.y + 2} textAnchor="middle" fontSize="11" fill="white" fontWeight="600">Propeller</text>
            <text x="710" y={prop.y + 17} textAnchor="middle" fontSize="9" fill="white" opacity="0.9" fontFamily="monospace">
              {(prop.power / 1000).toFixed(1)} kW
            </text>

            {/* Loss label */}
            <text x="800" y={prop.y + 5} fontSize="10" fill="#EF4444" fontFamily="monospace">
              Loss: {(losses / 1000).toFixed(1)} kW
            </text>
            <text x="800" y={prop.y + 18} fontSize="10" fill="#64748B" fontFamily="monospace">
              η: {efficiency.toFixed(1)}%
            </text>

            {/* Legend */}
            <g transform="translate(20, 275)">
              <text x="0" y="0" fontSize="10" fill="#64748B" fontFamily="monospace">
                ● Battery({batPct.toFixed(0)}%)  ● FC({fcPct.toFixed(0)}%)  ● Engine({engPct.toFixed(0)}%)
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Power Flow</div>
          <div className="space-y-2">
            {[
              { label: 'Required', value: `${(pReq / 1000).toFixed(1)} kW`, color: 'text-navy-900 dark:text-white' },
              { label: 'Battery', value: `${(Math.abs(pBat) / 1000).toFixed(1)} kW`, color: 'text-emerald-600' },
              { label: 'Fuel Cell', value: `${(pFc / 1000).toFixed(1)} kW`, color: 'text-cyan-600' },
              { label: 'Engine', value: `${(pEng / 1000).toFixed(1)} kW`, color: 'text-amber-600' },
              { label: 'Generator', value: `${(pGen / 1000).toFixed(1)} kW`, color: 'text-indigo-600' },
              { label: 'Motor', value: `${(pMotor / 1000).toFixed(1)} kW`, color: 'text-violet-600' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-[12px]">
                <span className="text-steel-500">{item.label}</span>
                <span className={`font-mono font-semibold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">System Parameters</div>
          <div className="space-y-3">
            <LinearGauge label="DC Bus Voltage" value={busV} max={800} unit="V" color="#0066CC" />
            <LinearGauge label="DC Bus Current" value={Math.abs(busI)} max={300} unit="A" color="#0066CC" />
            <LinearGauge label="System Efficiency" value={efficiency} max={100} unit="%" color="#10B981" />
            <LinearGauge label="Total Losses" value={losses / 1000} max={20} unit="kW" color="#EF4444" />
          </div>
        </div>

        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Energy Distribution</div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1 text-[11px]">
                <span className="text-steel-500">Battery Share</span>
                <span className="font-mono font-semibold text-emerald-600">{batPct.toFixed(1)}%</span>
              </div>
              <div className="progress-bar"><div className="progress-fill bg-emerald-500" style={{ width: `${batPct}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-[11px]">
                <span className="text-steel-500">Fuel Cell Share</span>
                <span className="font-mono font-semibold text-cyan-600">{fcPct.toFixed(1)}%</span>
              </div>
              <div className="progress-bar"><div className="progress-fill bg-cyan-500" style={{ width: `${fcPct}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-[11px]">
                <span className="text-steel-500">Engine Share</span>
                <span className="font-mono font-semibold text-amber-600">{engPct.toFixed(1)}%</span>
              </div>
              <div className="progress-bar"><div className="progress-fill bg-amber-500" style={{ width: `${engPct}%` }} /></div>
            </div>
            <div className="divider" />
            <div className="flex justify-between text-[11px]">
              <span className="text-steel-500">Battery SOC</span>
              <span className="font-mono font-semibold text-emerald-600">{(telemetry?.soc || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-steel-500">Efficiency (η)</span>
              <span className="font-mono font-semibold text-navy-900 dark:text-white">{(telemetry?.overall_efficiency_pct || 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* APEMS Decision Logic */}
      <div className="grid grid-cols-12 gap-3">
        {/* 6-Phase Grid (3 x 2) */}
        <div className="col-span-8 card">
          <div className="card-header flex items-center justify-between">
            <div className="card-title">APEMS Decision Logic — 6 Mission Phases</div>
            <span className="badge badge-green">Interactive Selection</span>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-3 gap-3">
              {APEMS_PHASE_DECISIONS.map((d) => {
                const isSelected = activeDecision.phase === d.phase
                return (
                  <button
                    key={d.phase}
                    type="button"
                    onClick={() => setSelectedPhaseName(d.phase)}
                    className={`p-3 rounded-lg border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between h-full ${
                      isSelected
                        ? 'border-aerospace-500 bg-aerospace-50 dark:bg-aerospace-900/40 ring-2 ring-aerospace-400/40 shadow-sm'
                        : 'border-steel-200 dark:border-navy-800 bg-white dark:bg-navy-900 hover:border-aerospace-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[13px] font-bold text-navy-900 dark:text-white">{d.phase}</span>
                        <span className="text-[10px] font-mono font-semibold text-aerospace-600 dark:text-aerospace-400">
                          {d.durationStr}
                        </span>
                      </div>

                      <div className="text-[11px] font-semibold text-navy-700 dark:text-navy-300 mb-2">
                        Power Req: <span className="font-mono text-aerospace-600 dark:text-aerospace-400">{d.powerKw} kW</span>
                      </div>

                      {/* Priorities */}
                      <div className="space-y-1 mb-2.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-steel-500">Battery Priority</span>
                          <span className={`font-mono ${getPriorityColor(d.priority.bat)}`}>{d.priority.bat}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-steel-500">Fuel Cell Priority</span>
                          <span className={`font-mono ${getPriorityColor(d.priority.fc)}`}>{d.priority.fc}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-steel-500">Engine Priority</span>
                          <span className={`font-mono ${getPriorityColor(d.priority.eng)}`}>{d.priority.eng}</span>
                        </div>
                      </div>

                      {/* Energy Split Bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-[9px] text-steel-500 mb-1">
                          <span>Energy Split</span>
                          <span className="font-mono">B:{d.energySplit.bat}% FC:{d.energySplit.fc}% E:{d.energySplit.eng}%</span>
                        </div>
                        <div className="flex h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500" style={{ width: `${d.energySplit.bat}%` }} title={`Battery ${d.energySplit.bat}%`} />
                          <div className="bg-cyan-500" style={{ width: `${d.energySplit.fc}%` }} title={`Fuel Cell ${d.energySplit.fc}%`} />
                          <div className="bg-amber-500" style={{ width: `${d.energySplit.eng}%` }} title={`Engine ${d.energySplit.eng}%`} />
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-steel-500 dark:text-steel-400 leading-snug pt-1 border-t border-steel-100 dark:border-navy-800">
                      {d.reason}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Current Priority & Engineering Calculations */}
        <div className="col-span-4 space-y-3">
          {/* Current Priority Panel */}
          <PageSection title="Current Priority" subtitle={`Selected Phase: ${activeDecision.phase}`}>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between border-b border-steel-100 dark:border-navy-800 pb-1">
                <span className="text-steel-500">Phase Name</span>
                <span className="font-mono font-bold text-navy-900 dark:text-white">{activeDecision.phase}</span>
              </div>
              <div className="flex justify-between border-b border-steel-100 dark:border-navy-800 pb-1">
                <span className="text-steel-500">Mission Duration</span>
                <span className="font-mono font-semibold text-aerospace-600 dark:text-aerospace-400">{activeDecision.durationStr}</span>
              </div>
              <div className="flex justify-between border-b border-steel-100 dark:border-navy-800 pb-1">
                <span className="text-steel-500">Power Requirement</span>
                <span className="font-mono font-bold text-navy-900 dark:text-white">{activeDecision.powerKw} kW</span>
              </div>

              <div className="pt-1">
                <div className="text-[10px] font-semibold uppercase text-steel-400 tracking-wider mb-1">Source Priorities</div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-steel-500">Battery Priority</span>
                  <span className={`font-mono ${getPriorityColor(activeDecision.priority.bat)}`}>{activeDecision.priority.bat}</span>
                </div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-steel-500">Fuel Cell Priority</span>
                  <span className={`font-mono ${getPriorityColor(activeDecision.priority.fc)}`}>{activeDecision.priority.fc}</span>
                </div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-steel-500">Engine Priority</span>
                  <span className={`font-mono ${getPriorityColor(activeDecision.priority.eng)}`}>{activeDecision.priority.eng}</span>
                </div>
              </div>

              <div className="pt-1">
                <div className="text-[10px] font-semibold uppercase text-steel-400 tracking-wider mb-1">Energy Split</div>
                <div className="flex h-2 rounded-full overflow-hidden mb-1">
                  <div className="bg-emerald-500" style={{ width: `${activeDecision.energySplit.bat}%` }} />
                  <div className="bg-cyan-500" style={{ width: `${activeDecision.energySplit.fc}%` }} />
                  <div className="bg-amber-500" style={{ width: `${activeDecision.energySplit.eng}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-steel-500 font-mono">
                  <span className="text-emerald-600 font-semibold">BAT: {activeDecision.energySplit.bat}%</span>
                  <span className="text-cyan-600 font-semibold">FC: {activeDecision.energySplit.fc}%</span>
                  <span className="text-amber-600 font-semibold">ENG: {activeDecision.energySplit.eng}%</span>
                </div>
              </div>

              <div className="pt-1">
                <div className="text-[10px] font-semibold uppercase text-steel-400 tracking-wider mb-1">APEMS Decision</div>
                <p className="text-[11px] text-navy-800 dark:text-navy-200 leading-snug bg-steel-50 dark:bg-navy-900 p-2 rounded border border-steel-200 dark:border-navy-800">
                  {activeDecision.reason}
                </p>
              </div>
            </div>
          </PageSection>

          {/* Engineering Calculations Panel */}
          <PageSection title="Engineering Calculations" subtitle={`Dynamic Metrics — ${activeDecision.phase}`}>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-steel-50 dark:bg-navy-900 border border-steel-100 dark:border-navy-800">
                <div className="text-steel-500 text-[10px]">Power (kW)</div>
                <div className="font-mono font-bold text-navy-900 dark:text-white text-xs">{activeDecision.powerKw} kW</div>
              </div>
              <div className="p-2 rounded bg-steel-50 dark:bg-navy-900 border border-steel-100 dark:border-navy-800">
                <div className="text-steel-500 text-[10px]">Voltage (V)</div>
                <div className="font-mono font-bold text-aerospace-600 dark:text-aerospace-400 text-xs">{activeDecision.voltageV} V</div>
              </div>

              <div className="p-2 rounded bg-steel-50 dark:bg-navy-900 border border-steel-100 dark:border-navy-800">
                <div className="text-steel-500 text-[10px]">Current (A)</div>
                <div className="font-mono font-bold text-navy-900 dark:text-white text-xs">
                  {((activeDecision.powerKw * 1000) / activeDecision.voltageV).toFixed(1)} A
                </div>
              </div>
              <div className="p-2 rounded bg-steel-50 dark:bg-navy-900 border border-steel-100 dark:border-navy-800">
                <div className="text-steel-500 text-[10px]">Efficiency (%)</div>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">{activeDecision.efficiencyPct}%</div>
              </div>

              <div className="p-2 rounded bg-steel-50 dark:bg-navy-900 border border-steel-100 dark:border-navy-800">
                <div className="text-steel-500 text-[10px]">Battery Power</div>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  {((activeDecision.powerKw * activeDecision.energySplit.bat) / 100).toFixed(1)} kW
                </div>
              </div>
              <div className="p-2 rounded bg-steel-50 dark:bg-navy-900 border border-steel-100 dark:border-navy-800">
                <div className="text-steel-500 text-[10px]">Fuel Cell Power</div>
                <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-xs">
                  {((activeDecision.powerKw * activeDecision.energySplit.fc) / 100).toFixed(1)} kW
                </div>
              </div>

              <div className="p-2 rounded bg-steel-50 dark:bg-navy-900 border border-steel-100 dark:border-navy-800">
                <div className="text-steel-500 text-[10px]">Engine Power</div>
                <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                  {((activeDecision.powerKw * activeDecision.energySplit.eng) / 100).toFixed(1)} kW
                </div>
              </div>
              <div className="p-2 rounded bg-steel-50 dark:bg-navy-900 border border-steel-100 dark:border-navy-800">
                <div className="text-steel-500 text-[10px]">Generator Output</div>
                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">{activeDecision.genOutputKw} kW</div>
              </div>

              <div className="col-span-2 p-2 rounded bg-steel-50 dark:bg-navy-900 border border-steel-100 dark:border-navy-800 flex items-center justify-between">
                <div className="text-steel-500 text-[10px]">Motor Power</div>
                <div className="font-mono font-bold text-violet-600 dark:text-violet-400 text-sm">{activeDecision.motorPowerKw} kW</div>
              </div>
            </div>
          </PageSection>
        </div>
      </div>
    </div>
  )
}