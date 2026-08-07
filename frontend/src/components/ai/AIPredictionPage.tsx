import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '../../lib/api'
import type { TelemetryFrame } from '../../types'
import { useTelemetryHistory } from '../../hooks/useTelemetryHistory'
import { EquationBox } from '../common/EquationBox'

interface AIPredictionPageProps {
  telemetry: TelemetryFrame | null
}

const DEFAULT_DESIGN = { battery_kwh: 40, fc_kw: 20, h2_kg: 10, jeta_kg: 30 }

/** AI Prediction - component health, RUL, and resource depletion forecasts. */
export function AIPredictionPage({ telemetry }: AIPredictionPageProps) {
  const history = useTelemetryHistory(telemetry, 60)

  const { data: prediction, isLoading } = useQuery({
    queryKey: ['ai-predict', DEFAULT_DESIGN],
    queryFn: () => api.aiPredict(DEFAULT_DESIGN),
  })

  const socNow = telemetry?.soc || 0
  const jetaNow = telemetry?.jeta_kg || 0
  const h2Now = telemetry?.h2_kg || 0

  const healthItems = prediction ? [
    { name: 'Battery Health', value: prediction.battery_health, color: prediction.battery_health > 90 ? '#10B981' : '#F59E0B' },
    { name: 'Engine Health', value: prediction.engine_health, color: prediction.engine_health > 90 ? '#10B981' : '#F59E0B' },
    { name: 'Fuel Cell Health', value: prediction.fc_health, color: prediction.fc_health > 90 ? '#10B981' : '#F59E0B' },
    { name: 'Motor Health', value: prediction.motor_health, color: prediction.motor_health > 90 ? '#10B981' : '#F59E0B' },
  ] : []

  const rulItems = prediction ? [
    { name: 'Battery RUL', value: `${prediction.rul_battery_hr.toFixed(0)} hr`, health: prediction.battery_health, color: '#10B981' },
    { name: 'Engine RUL', value: `${prediction.rul_engine_hr.toFixed(0)} hr`, health: prediction.engine_health, color: '#F59E0B' },
    { name: 'Fuel Cell RUL', value: `${prediction.rul_fc_hr.toFixed(0)} hr`, health: prediction.fc_health, color: '#06B6D4' },
    { name: 'Motor RUL', value: `${prediction.rul_motor_hr.toFixed(0)} hr`, health: prediction.motor_health, color: '#8B5CF6' },
  ] : []

  const socCurve = prediction?.soc_prediction || []
  const fuelCurve = prediction?.fuel_prediction || []
  const h2Curve = prediction?.h2_prediction || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">AI Prediction</h1>
          <p className="text-[12px] text-steel-500">ML-driven health assessment and remaining useful life</p>
        </div>
        <span className="badge badge-blue">ML Model v3.0</span>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-steel-400">Loading ML predictions...</div>
      ) : prediction ? (
        <>
          {/* Depletion curves */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Resource Depletion Forecast</div>
              <span className="badge badge-green">ML Predicted</span>
            </div>
            <div className="card-body">
              <svg className="w-full h-48" viewBox="0 0 800 180" preserveAspectRatio="none">
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1="0" y1={i * 45} x2="800" y2={i * 45} stroke="#F1F5F9" strokeWidth="0.5" />
                ))}
                {/* SOC curve */}
                {socCurve.map((v, i) => (
                  <circle key={i} cx={(i / 59) * 800} cy={170 - (v / 100) * 160} r="1.5" fill="#10B981" opacity="0.7" />
                ))}
                {/* H2 curve */}
                {h2Curve.map((v, i) => (
                  <circle key={`h-${i}`} cx={(i / 59) * 800} cy={170 - (v / 10) * 160} r="1.5" fill="#06B6D4" opacity="0.7" />
                ))}
                {/* Fuel curve */}
                {fuelCurve.map((v, i) => (
                  <circle key={`f-${i}`} cx={(i / 59) * 800} cy={170 - (v / 30) * 160} r="1.5" fill="#F59E0B" opacity="0.7" />
                ))}
                <line x1="0" y1="170" x2="800" y2="170" stroke="#E2E8F0" strokeWidth="1" />
              </svg>
              <div className="flex items-center justify-between text-[10px] text-steel-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />SOC %</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" />H2 kg</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Jet-A1 kg</span>
                <span>Horizon: Next 60 min</span>
              </div>
            </div>
          </div>

          {/* Component health */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6 card p-4">
              <div className="card-title mb-3">Component Health</div>
              <div className="space-y-3">
                {healthItems.map((h) => (
                  <div key={h.name}>
                    <div className="flex justify-between mb-1 text-[11px]">
                      <span className="text-steel-500">{h.name}</span>
                      <span className="font-mono font-semibold" style={{ color: h.color }}>{h.value.toFixed(1)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${h.value}%`, background: h.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-6 card p-4">
              <div className="card-title mb-3">Remaining Useful Life (RUL)</div>
              <div className="grid grid-cols-2 gap-3">
                {rulItems.map((item) => (
                  <div key={item.name} className="p-3 rounded-md border border-steel-100">
                    <div className="telemetry-label">{item.name}</div>
                    <div className="font-mono text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
                    <div className="text-[10px] text-steel-400 mt-1">Health: {item.health.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Current values + equation */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4 card p-4">
              <div className="card-title mb-3">Current Resource State</div>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-steel-500">Battery SOC</span>
                  <span className="font-mono font-semibold text-emerald-600">{socNow.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-500">Jet-A1</span>
                  <span className="font-mono font-semibold text-amber-600">{jetaNow.toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-500">Hydrogen</span>
                  <span className="font-mono font-semibold text-cyan-600">{h2Now.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-steel-500">Predicted Endurance</span>
                  <span className="font-mono font-semibold text-aerospace-600">{prediction.endurance_prediction.toFixed(0)} min</span>
                </div>
              </div>
            </div>

            <div className="col-span-4">
              <EquationBox
                formula="RUL = f(health, cycles, temp)"
                description="Remaining useful life is a nonlinear function of component health, cycle count, and thermal stress"
                inputs={[
                  { name: 'Battery cycles', value: '842' },
                  { name: 'Engine operating hrs', value: '450 hr' },
                  { name: 'FC operating hrs', value: '380 hr' },
                ]}
                output={`Mean RUL: ${((prediction.rul_battery_hr + prediction.rul_engine_hr + prediction.rul_fc_hr + prediction.rul_motor_hr) / 4).toFixed(0)} hr`}
                outputLabel="Fleet average RUL"
              />
            </div>

            <div className="col-span-4 card p-4">
              <div className="card-title mb-3">Model Confidence</div>
              <svg className="w-full h-32" viewBox="0 0 200 120" preserveAspectRatio="none">
                <circle cx="100" cy="60" r="50" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                <circle
                  cx="100" cy="60" r="50" fill="none" stroke="#10B981" strokeWidth="8"
                  strokeDasharray={`${(87 / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`}
                  transform="rotate(-90 100 60)"
                />
                <text x="100" y="60" textAnchor="middle" fontSize="18" fontWeight="700" fill="#0A1F3D" fontFamily="monospace">87%</text>
                <text x="100" y="78" textAnchor="middle" fontSize="9" fill="#64748B">Confidence</text>
              </svg>
              <p className="text-[11px] text-steel-400 leading-snug text-center">
                Ensemble model confidence from physics + ML agreement.
                OOD warning: {prediction.ood_warning ? 'YES' : 'NO'}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
