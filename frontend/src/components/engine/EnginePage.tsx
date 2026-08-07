import type { TelemetryFrame } from '../../types'
import { useTelemetryHistory } from '../../hooks/useTelemetryHistory'
import { EquationBox } from '../common/EquationBox'
import { LinearGauge } from '../common/Gauge'

interface EnginePageProps {
  telemetry: TelemetryFrame | null
}

/**
 * Engine — PBS TS100 turbojet/turboshaft parameters.
 * RPM, torque, fuel flow, fuel remaining, brake power, SFC,
 * exhaust temperature, thermal efficiency.
 */
export function EnginePage({ telemetry }: EnginePageProps) {
  const history = useTelemetryHistory(telemetry, 60)

  const engRpm = telemetry?.eng_rpm || 0
  const torque = telemetry?.torque_Nm || 0
  const fuelFlow = telemetry?.fuel_flow_kg_hr || 0
  const jeta = telemetry?.jeta_kg || 0
  const pEng = telemetry?.p_eng_W || 0
  const engBsfc = telemetry?.eng_bsfc || 0
  const engEgt = telemetry?.eng_egt_K || 900
  const engEff = telemetry?.eng_eff || 0
  const genRpm = telemetry?.gen_rpm || 0

  const egtC = engEgt - 273.15
  const genRatio = engRpm > 0 ? genRpm / engRpm : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">Engine — PBS TS100</h1>
          <p className="text-[12px] text-steel-500">Turbojet/turboshaft — thermodynamic performance</p>
        </div>
        <span className="badge badge-amber">Jet-A1 Powered</span>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Engine Performance View</div>
          <span className="badge badge-blue">Live Data</span>
        </div>
        <div className="card-body">
          <svg className="w-full h-48" viewBox="0 0 900 180" preserveAspectRatio="xMidYMid meet">
            <rect x="50" y="40" width="800" height="100" rx="30" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
            <text x="450" y="70" textAnchor="middle" fontSize="14" fill="#92400E" fontWeight="700">PBS TS100 Turboshaft</text>
            <text x="450" y="88" textAnchor="middle" fontSize="10" fill="#92400E" fontFamily="monospace">
              RPM: {engRpm.toFixed(0)} - Power: {(pEng / 1000).toFixed(1)} kW - EGT: {egtC.toFixed(0)} C
            </text>
            <text x="450" y="105" textAnchor="middle" fontSize="9" fill="#92400E" fontFamily="monospace">
              Fuel Flow: {fuelFlow.toFixed(2)} kg/h - SFC: {engBsfc.toFixed(4)} kg/kWh
            </text>
            <path d="M 850 70 Q 880 90 850 110" fill="none" stroke="#EF4444" strokeWidth="3" />
            <path d="M 50 70 Q 20 90 50 110" fill="none" stroke="#3B82F6" strokeWidth="3" />
            <text x="880" y="60" fontSize="9" fill="#EF4444">Exhaust</text>
            <text x="25" y="60" fontSize="9" fill="#3B82F6">Intake</text>
            <text x="450" y="130" textAnchor="middle" fontSize="9" fill="#92400E" fontFamily="monospace">
              Generator coupling: {genRatio.toFixed(2)}:1
            </text>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Rotating</div>
          <div className="space-y-3">
            <LinearGauge label="Engine RPM" value={engRpm} max={60000} unit="rpm" color="#EF4444" />
            <LinearGauge label="Generator RPM" value={genRpm} max={60000} unit="rpm" color="#8B5CF6" />
            <LinearGauge label="Shaft Torque" value={torque} max={200} unit="Nm" color="#F59E0B" />
            <div className="divider" />
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Gear Ratio</span>
              <span className="font-mono font-semibold">{genRatio.toFixed(2)}:1</span>
            </div>
          </div>
        </div>

        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Fuel</div>
          <div className="space-y-3">
            <LinearGauge label="Fuel Remaining" value={jeta} max={30} unit="kg" color="#F59E0B" />
            <LinearGauge label="Fuel Flow" value={fuelFlow} max={12} unit="kg/h" color="#F59E0B" />
            <div className="divider" />
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Endurance (Fuel)</span>
              <span className="font-mono font-semibold text-amber-600">
                {fuelFlow > 0 ? `${(jeta / fuelFlow).toFixed(1)} hr` : '--'}
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Thermodynamic</div>
          <div className="space-y-3">
            <LinearGauge label="EGT" value={egtC} max={900} unit="C" color="#EF4444" />
            <LinearGauge label="Thermal Efficiency" value={engEff * 100} max={100} unit="%" color="#10B981" />
            <LinearGauge label="Brake Power" value={pEng / 1000} max={60} unit="kW" color="#F59E0B" />
            <div className="divider" />
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">SFC</span>
              <span className="font-mono font-semibold text-amber-600">{engBsfc.toFixed(4)} kg/kWh</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4">
          <EquationBox
            formula="P_b = Torque x omega"
            description="Brake power - shaft torque x angular velocity"
            inputs={[
              { name: 'Torque', value: `${torque.toFixed(1)} Nm` },
              { name: 'Angular velocity', value: `${((engRpm * 2 * Math.PI) / 60).toFixed(1)} rad/s` },
            ]}
            output={`P_b = ${(pEng / 1000).toFixed(1)} kW`}
            outputLabel="Brake power"
          />
        </div>
        <div className="col-span-4">
          <EquationBox
            formula="SFC = m_fuel / P_b"
            description="Specific fuel consumption - fuel flow / brake power"
            inputs={[
              { name: 'm_fuel', value: `${fuelFlow.toFixed(2)} kg/h` },
              { name: 'P_b', value: `${(pEng / 1000).toFixed(1)} kW` },
            ]}
            output={`SFC = ${engBsfc.toFixed(4)} kg/kWh`}
            outputLabel="Specific fuel consumption"
          />
        </div>
        <div className="col-span-4">
          <EquationBox
            formula="n_th = P_b / (m_fuel x LHV)"
            description="Thermal efficiency - brake power / (fuel flow x lower heating value)"
            inputs={[
              { name: 'P_b', value: `${(pEng / 1000).toFixed(1)} kW` },
              { name: 'm_fuel', value: `${(fuelFlow / 3600).toFixed(5)} kg/s` },
              { name: 'LHV (Jet-A1)', value: '43.15 MJ/kg' },
            ]}
            output={`n_th = ${(engEff * 100).toFixed(1)}%`}
            outputLabel="Thermal efficiency"
          />
        </div>
      </div>
    </div>
  )
}
