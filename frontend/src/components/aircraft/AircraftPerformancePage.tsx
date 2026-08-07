import type { TelemetryFrame } from '../../types'
import { useTelemetryHistory, mpsToKmh, mToFt } from '../../hooks/useTelemetryHistory'
import { EquationBox, PageSection } from '../common/EquationBox'
import { LinearGauge } from '../common/Gauge'

interface AircraftPerformancePageProps {
  telemetry: TelemetryFrame | null
}

/** Aircraft Performance - altitude, velocity, range, lift, drag, thrust,
 * wing loading, L/D, payload, mass, CG, endurance and range calculations. */
export function AircraftPerformancePage({ telemetry }: AircraftPerformancePageProps) {
  const history = useTelemetryHistory(telemetry, 60)

  const alt = telemetry?.alt_m || 0
  const vel = telemetry?.vel_mps || 0
  const dist = telemetry?.dist_m || 0
  const lift = telemetry?.lift_N || 0
  const drag = telemetry?.drag_N || 0
  const thrust = telemetry?.thrust_N || 0
  const wingLoading = telemetry?.wing_loading || 0
  const ldRatio = telemetry?.ld_ratio || 0
  const payload = telemetry?.payload_kg || 0
  const mass = telemetry?.mass_kg || 0
  const cg = telemetry?.cg_pos || 0
  const endurance = telemetry?.endurance_remaining_min || 0
  const range = telemetry?.range_km || 0

  const wingArea = 18.5 // m2
  const wingLoadingCalc = (mass * 9.81) / wingArea

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">Aircraft Performance</h1>
          <p className="text-[12px] text-steel-500">Aerodynamic and mission performance parameters</p>
        </div>
        <span className="badge badge-blue">HE-UAV-01</span>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Flight Conditions</div>
          <div className="space-y-3">
            <LinearGauge label="Altitude" value={alt} max={4000} unit="m" color="#3B82F6" />
            <LinearGauge label="Velocity" value={vel} max={80} unit="m/s" color="#10B981" />
            <LinearGauge label="Distance Flown" value={dist / 1000} max={500} unit="km" color="#0066CC" />
          </div>
        </div>

        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Aerodynamic Forces</div>
          <div className="space-y-3">
            <LinearGauge label="Lift" value={lift / 1000} max={20} unit="kN" color="#3B82F6" />
            <LinearGauge label="Drag" value={drag / 1000} max={5} unit="kN" color="#EF4444" />
            <LinearGauge label="Thrust" value={thrust / 1000} max={8} unit="kN" color="#F59E0B" />
            <div className="divider" />
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">L/D Ratio</span>
              <span className="font-mono font-semibold text-emerald-600">{ldRatio.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Aircraft Configuration</div>
          <div className="space-y-3">
            <LinearGauge label="Mass" value={mass} max={1500} unit="kg" color="#334155" />
            <LinearGauge label="Payload" value={payload} max={300} unit="kg" color="#8B5CF6" />
            <LinearGauge label="CG Position" value={cg} max={100} unit="%" color="#06B6D4" />
            <div className="divider" />
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Wing Loading</span>
              <span className="font-mono font-semibold text-amber-600">{wingLoading.toFixed(1)} N/m2</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 card p-4">
          <div className="card-title mb-3">Performance Envelope</div>
          <svg className="w-full h-48" viewBox="0 0 800 180" preserveAspectRatio="none">
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1="0" y1={i * 45} x2="800" y2={i * 45} stroke="#F1F5F9" strokeWidth="0.5" />
            ))}
            {history.map((f, i) => (
              <circle key={i} cx={(i / 59) * 800} cy={175 - (f.alt_m / 4000) * 160} r="2" fill="#3B82F6" opacity="0.5" />
            ))}
            {history.map((f, i) => (
              <circle key={`v-${i}`} cx={(i / 59) * 800} cy={175 - (f.vel_mps / 80) * 160} r="2" fill="#10B981" opacity="0.5" />
            ))}
            {history.length > 0 && (
              <line x1={((history.length - 1) / 59) * 800} y1="0" x2={((history.length - 1) / 59) * 800} y2="180" stroke="#0066CC" strokeWidth="1" strokeDasharray="4 4" />
            )}
          </svg>
          <div className="flex items-center justify-between text-[10px] text-steel-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Altitude (m)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Velocity (m/s)</span>
          </div>
        </div>

        <div className="col-span-4 space-y-3">
          <PageSection title="Mission Metrics" subtitle="Live from telemetry">
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-steel-500">Endurance</span>
                <span className="font-mono font-semibold text-emerald-600">{(endurance / 60).toFixed(1)} hr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel-500">Range</span>
                <span className="font-mono font-semibold text-aerospace-600">{range.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel-500">Ground Speed</span>
                <span className="font-mono font-semibold">{mpsToKmh(vel).toFixed(1)} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel-500">Altitude</span>
                <span className="font-mono font-semibold">{mToFt(alt).toFixed(0)} ft</span>
              </div>
            </div>
          </PageSection>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4">
          <EquationBox
            formula="L = 0.5 x rho x V^2 x S x C_L"
            description="Lift force - dynamic pressure x wing area x lift coefficient"
            inputs={[
              { name: 'Air density', value: '1.225 kg/m3' },
              { name: 'Velocity', value: `${vel.toFixed(1)} m/s` },
              { name: 'Wing area', value: `${wingArea} m2` },
            ]}
            output={`L = ${(lift / 1000).toFixed(2)} kN`}
            outputLabel="Lift force"
          />
        </div>
        <div className="col-span-4">
          <EquationBox
            formula="D = 0.5 x rho x V^2 x S x C_D"
            description="Drag force - dynamic pressure x wing area x drag coefficient"
            inputs={[
              { name: 'Air density', value: '1.225 kg/m3' },
              { name: 'Velocity', value: `${vel.toFixed(1)} m/s` },
              { name: 'Wing area', value: `${wingArea} m2` },
            ]}
            output={`D = ${(drag / 1000).toFixed(2)} kN`}
            outputLabel="Drag force"
          />
        </div>
        <div className="col-span-4">
          <EquationBox
            formula="W/S = W / S"
            description="Wing loading - aircraft weight / wing area"
            inputs={[
              { name: 'Weight', value: `${(mass * 9.81 / 1000).toFixed(2)} kN` },
              { name: 'Wing area', value: `${wingArea} m2` },
            ]}
            output={`W/S = ${wingLoadingCalc.toFixed(1)} N/m2`}
            outputLabel="Wing loading"
          />
        </div>
      </div>
    </div>
  )
}
