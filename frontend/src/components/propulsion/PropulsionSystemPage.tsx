import { useMemo } from 'react'
import type { TelemetryFrame } from '../../types'
import { useTelemetryHistory } from '../../hooks/useTelemetryHistory'
import { EquationBox } from '../common/EquationBox'
import { LinearGauge } from '../common/Gauge'

interface PropulsionSystemPageProps {
  telemetry: TelemetryFrame | null
}

/**
 * Propulsion System — Engineering diagram showing the complete
 * hybrid propulsion train: Jet A1 Tank → PBS TS100 → Generator → DC Bus
 * alongside Battery and Fuel Cell → Inverter → PMSM Motor → Propeller.
 */
export function PropulsionSystemPage({ telemetry }: PropulsionSystemPageProps) {
  const history = useTelemetryHistory(telemetry, 60)

  const jeta = telemetry?.jeta_kg || 0
  const fuelFlow = telemetry?.fuel_flow_kg_hr || 0
  const engRpm = telemetry?.eng_rpm || 0
  const genRpm = telemetry?.gen_rpm || 0
  const motorRpm = telemetry?.motor_rpm || 0
  const propRpm = telemetry?.prop_rpm || 0
  const torque = telemetry?.torque_Nm || 0
  const pEng = telemetry?.p_eng_W || 0
  const pGen = telemetry?.p_gen_W || 0
  const pMotor = telemetry?.p_motor_W || 0
  const busV = telemetry?.bus_voltage || 540
  const busI = telemetry?.bus_current || 0
  const genEff = telemetry?.gen_eff || 0
  const motorEff = telemetry?.motor_eff || 0
  const engEff = telemetry?.eng_eff || 0
  const engEgt = telemetry?.eng_egt_K || 900
  const engBsfc = telemetry?.eng_bsfc || 0
  const h2 = telemetry?.h2_kg || 0
  const pFc = telemetry?.p_fc_W || 0
  const soc = telemetry?.soc || 0
  const pBat = telemetry?.p_bat_W || 0
  const thrust = telemetry?.thrust_N || 0

  // Propeller blade animation angle
  const bladeAngle = useMemo(() => (motorRpm > 0 ? (motorRpm % 360) : 0), [history.length, motorRpm])

  const components = [
    { name: 'Jet A1 Tank', value: `${jeta.toFixed(1)} kg`, color: '#F59E0B', x: 60, y: 80, active: jeta > 5 },
    { name: 'PBS TS100', value: `${engRpm.toFixed(0)} RPM`, color: '#EF4444', x: 200, y: 150, active: pEng > 1000 },
    { name: 'Generator', value: `${genRpm.toFixed(0)} RPM`, color: '#8B5CF6', x: 200, y: 250, active: pGen > 1000 },
    { name: 'DC Bus', value: `${busV.toFixed(0)} V`, color: '#0066CC', x: 400, y: 200, active: true },
    { name: 'Battery', value: `${soc.toFixed(0)}% SOC`, color: '#10B981', x: 320, y: 80, active: Math.abs(pBat) > 100 },
    { name: 'Fuel Cell', value: `${h2.toFixed(1)} kg H₂`, color: '#06B6D4', x: 320, y: 330, active: pFc > 100 },
    { name: 'Inverter', value: `${(busI > 0 ? busI : 0).toFixed(0)} A`, color: '#0EA5E9', x: 540, y: 200, active: true },
    { name: 'PMSM Motor', value: `${motorRpm.toFixed(0)} RPM`, color: '#8B5CF6', x: 680, y: 200, active: pMotor > 100 },
    { name: 'Propeller', value: `${propRpm.toFixed(0)} RPM`, color: '#0EA5E9', x: 810, y: 200, active: true },
    { name: 'Aircraft', value: `${(telemetry?.mass_kg || 0).toFixed(0)} kg`, color: '#334155', x: 850, y: 100, active: true },
  ]

  const flows = [
    { from: { x: 105, y: 100 }, to: { x: 175, y: 140 }, color: '#F59E0B', label: `Fuel ${fuelFlow.toFixed(2)} kg/h`, active: fuelFlow > 0.01 },
    { from: { x: 200, y: 175 }, to: { x: 200, y: 230 }, color: '#EF4444', label: 'Shaft power', active: true },
    { from: { x: 200, y: 250 }, to: { x: 370, y: 210 }, color: '#8B5CF6', label: 'AC', active: pGen > 100 },
    { from: { x: 400, y: 220 }, to: { x: 520, y: 210 }, color: '#0066CC', label: 'DC', active: true },
    { from: { x: 680, y: 220 }, to: { x: 785, y: 210 }, color: '#8B5CF6', label: `Torque ${torque.toFixed(1)} N·m`, active: true },
    { from: { x: 810, y: 220 }, to: { x: 845, y: 130 }, color: '#0EA5E9', label: `Thrust ${thrust.toFixed(0)} N`, active: true },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">Propulsion System</h1>
          <p className="text-[12px] text-steel-500">Hybrid powertrain — PBS TS100 + Fuel Cell + Battery architecture</p>
        </div>
        <span className="badge badge-amber">Hybrid-Electric Powerplant</span>
      </div>

      {/* Engineering schematic */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Powertrain Schematic</div>
          <span className="badge badge-blue">Animated Flow</span>
        </div>
        <div className="card-body">
          <svg className="w-full h-96" viewBox="0 0 900 400" preserveAspectRatio="xMidYMid meet">
            {/* Box grid */}
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`v-${i}`} x1={i * 90} y1="0" x2={i * 90} y2="400" stroke="#F1F5F9" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={i * 50} x2="900" y2={i * 50} stroke="#F1F5F9" strokeWidth="0.5" />
            ))}

            {/* Flow arrows */}
            {flows.map((flow, i) => (
              <g key={i}>
                {flow.active && (
                  <line
                    x1={flow.from.x} y1={flow.from.y}
                    x2={flow.to.x} y2={flow.to.y}
                    stroke={flow.color}
                    strokeWidth="4"
                    strokeDasharray="8 6"
                    strokeOpacity="0.7"
                    className="animated-flow"
                  />
                )}
                <text x={(flow.from.x + flow.to.x) / 2 + 15} y={(flow.from.y + flow.to.y) / 2} fontSize="9" fill="#64748B" fontFamily="monospace">
                  {flow.label}
                </text>
              </g>
            ))}

            {/* Component boxes */}
            {components.map((comp) => (
              <g key={comp.name}>
                <rect
                  x={comp.x - 55} y={comp.y - 25}
                  width="110" height="50" rx="6"
                  fill={comp.active ? comp.color : '#CBD5E1'}
                  opacity="0.9"
                />
                <text x={comp.x} y={comp.y + 1} textAnchor="middle" fontSize="10" fill="white" fontWeight="600">
                  {comp.name}
                </text>
                <text x={comp.x} y={comp.y + 14} textAnchor="middle" fontSize="8" fill="white" opacity="0.9" fontFamily="monospace">
                  {comp.value}
                </text>
                {comp.active && (
                  <circle cx={comp.x + 45} cy={comp.y - 17} r="3" fill="white" className="animate-pulse" />
                )}
              </g>
            ))}

            {/* Propeller animation */}
            <g transform={`translate(810, 165)`}>
              <circle
                cx="0" cy="0" r="20" fill="none" stroke="#0EA5E9" strokeWidth="2"
              />
              <line
                x1="0" y1="-16" x2="0" y2="16"
                stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round"
                transform={`rotate(${bladeAngle})`}
              />
              <line
                x1="-16" y1="0" x2="16" y2="0"
                stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round"
                transform={`rotate(${bladeAngle})`}
              />
              <circle cx="0" cy="0" r="4" fill="#0EA5E9" />
            </g>
          </svg>
        </div>
      </div>

      {/* Live parameters */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Rotational Systems</div>
          <div className="space-y-3">
            <LinearGauge label="Engine RPM" value={engRpm} max={60000} unit="rpm" color="#EF4444" />
            <LinearGauge label="Generator RPM" value={genRpm} max={60000} unit="rpm" color="#8B5CF6" />
            <LinearGauge label="Motor RPM" value={motorRpm} max={10000} unit="rpm" color="#8B5CF6" />
            <LinearGauge label="Propeller RPM" value={propRpm} max={3000} unit="rpm" color="#0EA5E9" />
          </div>
        </div>

        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Electrical Parameters</div>
          <div className="space-y-3">
            <LinearGauge label="Bus Voltage" value={busV} max={800} unit="V" color="#0066CC" />
            <LinearGauge label="Bus Current" value={Math.abs(busI)} max={300} unit="A" color="#0066CC" />
            <LinearGauge label="Generator Power" value={pGen / 1000} max={60} unit="kW" color="#8B5CF6" />
            <LinearGauge label="Motor Power" value={pMotor / 1000} max={60} unit="kW" color="#8B5CF6" />
          </div>
        </div>

        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Thermal & Efficiency</div>
          <div className="space-y-3">
            <LinearGauge label="Engine EGT" value={engEgt - 273} max={900} unit="°C" color="#EF4444" />
            <LinearGauge label="Engine Efficiency" value={engEff * 100} max={100} unit="%" color="#F59E0B" />
            <LinearGauge label="Generator Efficiency" value={genEff * 100} max={100} unit="%" color="#8B5CF6" />
            <LinearGauge label="Motor Efficiency" value={motorEff * 100} max={100} unit="%" color="#06B6D4" />
          </div>
        </div>
      </div>

      {/* Equations */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4">
          <EquationBox
            formula="P_brake = τ × ω"
            description="Brake power — torque × angular velocity (PBS TS100)"
            inputs={[
              { name: 'Torque (τ)', value: `${torque.toFixed(1)} N·m` },
              { name: 'Angular velocity (ω)', value: `${((engRpm * 2 * Math.PI) / 60).toFixed(1)} rad/s` },
            ]}
            output={`P = ${(pEng / 1000).toFixed(1)} kW`}
            outputLabel="Engine brake power"
          />
        </div>
        <div className="col-span-4">
          <EquationBox
            formula="η_gen = P_out / P_mech × 100"
            description="Generator electrical efficiency — electrical output ÷ mechanical input"
            inputs={[
              { name: 'P_out', value: `${(pGen / 1000).toFixed(1)} kW` },
              { name: 'P_mech', value: `${(pEng / 1000).toFixed(1)} kW` },
            ]}
            output={`η = ${(genEff * 100).toFixed(1)}%`}
            outputLabel="Generator efficiency"
          />
        </div>
        <div className="col-span-4">
          <EquationBox
            formula="SFC = ṁ_fuel / P_brake"
            description="Specific fuel consumption — fuel mass flow ÷ brake power"
            inputs={[
              { name: 'ṁ_fuel', value: `${fuelFlow.toFixed(2)} kg/h` },
              { name: 'P_brake', value: `${(pEng / 1000).toFixed(1)} kW` },
            ]}
            output={`SFC = ${engBsfc.toFixed(4)} kg/kWh`}
            outputLabel="Jet-A1 consumption"
          />
        </div>
      </div>
    </div>
  )
}