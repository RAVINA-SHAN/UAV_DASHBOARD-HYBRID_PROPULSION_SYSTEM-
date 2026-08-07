import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { TelemetryFrame } from '../../types'
import { EquationBox } from '../common/EquationBox'

interface OptimizationPageProps {
  telemetry: TelemetryFrame | null
}

const DEFAULT_DESIGN = { battery_kwh: 40, fc_kw: 20, h2_kg: 10, jeta_kg: 30 }

/** Optimization - Adaptive Predictive Energy Management (APEMS).
 * Shows optimization variables, objectives, and the grid-search optimization result. */
export function OptimizationPage({ telemetry }: OptimizationPageProps) {
  const [design, setDesign] = useState(DEFAULT_DESIGN)

  const { data: optResult, isLoading, refetch } = useQuery({
    queryKey: ['optimize', design],
    queryFn: () => api.optimize(design),
    enabled: true,
  })

  const variables = [
    { name: 'Battery', value: design.battery_kwh, unit: 'kWh', max: 200, color: '#10B981', label: 'Battery Energy Capacity' },
    { name: 'Fuel Cell', value: design.fc_kw, unit: 'kW', max: 100, color: '#06B6D4', label: 'FC Rated Power' },
    { name: 'Hydrogen', value: design.h2_kg, unit: 'kg', max: 60, color: '#0EA5E9', label: 'H2 On-Board Mass' },
    { name: 'Generator', value: design.jeta_kg, unit: 'kg', max: 150, color: '#F59E0B', label: 'Jet-A1 Mass' },
    { name: 'Motor', value: 60, unit: 'kW', max: 100, color: '#8B5CF6', label: 'Motor Rated Power' },
    { name: 'Fuel Cell Stack', value: design.fc_kw * 1.2, unit: 'kW', max: 120, color: '#06B6D4', label: 'FC Stack Capacity' },
  ]

  const objectives = [
    { name: 'Maximum Endurance', weight: 0.6, score: optResult?.endurance_min || 0, color: 'text-emerald-600' },
    { name: 'Minimum Fuel', weight: 0.3, score: optResult ? 100 - optResult.fuel_used_kg * 2 : 0, color: 'text-amber-600' },
    { name: 'Maximum Efficiency', weight: 0.1, score: optResult?.efficiency_pct || 0, color: 'text-cyan-600' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">Optimization</h1>
          <p className="text-[12px] text-steel-500">Adaptive Predictive Energy Management - design space search</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-blue">Grid Search</span>
          <button className="btn btn-sm" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? 'Optimizing...' : 'Re-Optimize'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="card p-8 text-center text-steel-400">
          Running design space optimization...
        </div>
      )}

      {optResult && !isLoading && (
        <>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-8 card p-4">
              <div className="card-title mb-3">Optimization Variables</div>
              <div className="space-y-3">
                {variables.map((v) => (
                  <div key={v.name}>
                    <div className="flex justify-between mb-1 text-[11px]">
                      <span className="text-steel-500">{v.label}</span>
                      <span className="font-mono font-semibold" style={{ color: v.color }}>
                        {v.name === 'Battery' ? optResult.battery_kwh.toFixed(1) :
                         v.name === 'Fuel Cell Stack' ? (optResult.fc_kw * 1.2).toFixed(1) :
                         v.name === 'Hydrogen' ? optResult.h2_kg.toFixed(1) :
                         v.name === 'Generator' ? optResult.jeta_kg.toFixed(1) :
                         v.name === 'Jet-A1' ? optResult.jeta_kg.toFixed(1) : '60.0'} {v.unit}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill transition-all duration-700"
                        style={{
                          width: `${Math.min(100, ((v.name === 'Battery' ? optResult.battery_kwh : v.name === 'Fuel Cell Stack' ? optResult.fc_kw * 1.2 : v.name === 'Hydrogen' ? optResult.h2_kg : v.name === 'Generator' ? optResult.jeta_kg : 60) / v.max) * 100)}%`,
                          background: v.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-4 space-y-3">
              <div className="card p-4">
                <div className="card-title mb-3">Objectives</div>
                <div className="space-y-3">
                  {objectives.map((o) => (
                    <div key={o.name}>
                      <div className="flex justify-between mb-1 text-[11px]">
                        <span className="text-steel-500">{o.name}</span>
                        <span className={`font-mono font-semibold ${o.color}`}>{o.score.toFixed(1)}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min(100, o.score)}%`, background: o.weight === 0.6 ? '#10B981' : o.weight === 0.3 ? '#F59E0B' : '#06B6D4' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <EquationBox
                formula="Score = E - 2m_f - 3m_h2"
                description="APEMS optimization score - endurance minus fuel and hydrogen penalties"
                inputs={[
                  { name: 'Endurance (E)', value: `${optResult.endurance_min.toFixed(0)} min` },
                  { name: 'Fuel used (m_f)', value: `${optResult.fuel_used_kg.toFixed(1)} kg` },
                  { name: 'H2 used (m_h2)', value: `${optResult.h2_used_kg.toFixed(1)} kg` },
                ]}
                output={`Score = ${optResult.score.toFixed(1)}`}
                outputLabel="Optimization score"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6 card p-4">
              <div className="card-title mb-3">Optimized Design Configuration</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Battery', value: `${optResult.battery_kwh.toFixed(1)} kWh`, color: 'text-emerald-600' },
                  { label: 'Fuel Cell', value: `${optResult.fc_kw.toFixed(1)} kW`, color: 'text-cyan-600' },
                  { label: 'Hydrogen', value: `${optResult.h2_kg.toFixed(1)} kg`, color: 'text-sky-600' },
                  { label: 'Jet-A1', value: `${optResult.jeta_kg.toFixed(1)} kg`, color: 'text-amber-600' },
                  { label: 'Endurance', value: `${optResult.endurance_min.toFixed(0)} min`, color: 'text-emerald-600' },
                  { label: 'Efficiency', value: `${optResult.efficiency_pct.toFixed(1)}%`, color: 'text-cyan-600' },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-md bg-steel-50 border border-steel-100">
                    <div className="telemetry-label">{item.label}</div>
                    <div className={`font-mono text-lg font-bold ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-6 card p-4">
              <div className="card-title mb-3">Optimization Result</div>
              <div className="space-y-3">
                <div className="flex justify-between text-[12px]">
                  <span className="text-steel-500">Best Score</span>
                  <span className="font-mono font-semibold text-emerald-600">{optResult.score.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-steel-500">Predicted Endurance</span>
                  <span className="font-mono font-semibold">{optResult.endurance_min.toFixed(0)} min</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-steel-500">Fuel Consumption</span>
                  <span className="font-mono font-semibold text-amber-600">{optResult.fuel_used_kg.toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-steel-500">H2 Consumption</span>
                  <span className="font-mono font-semibold text-cyan-600">{optResult.h2_used_kg.toFixed(1)} kg</span>
                </div>
                <div className="divider" />
                <p className="text-[11px] text-steel-400 leading-snug">
                  The optimization grid-searched the design space (battery, FC, H2, fuel) evaluating
                  625 candidate configurations. The selected design maximizes endurance while
                  minimizing fuel and hydrogen consumption.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
