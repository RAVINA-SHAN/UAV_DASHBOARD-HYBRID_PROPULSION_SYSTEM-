import type { TelemetryFrame } from '../../types'
import { useTelemetryHistory } from '../../hooks/useTelemetryHistory'
import { EquationBox } from '../common/EquationBox'

interface PowerDistributionPageProps {
  telemetry: TelemetryFrame | null
}

/**
 * Power Distribution - Animated power network showing sources converging
 * on the DC bus, feeding motor and propeller, with real-time efficiency,
 * losses, and the power balance equation.
 */
export function PowerDistributionPage({ telemetry }: PowerDistributionPageProps) {
  const history = useTelemetryHistory(telemetry, 80)

  const pBat = telemetry?.p_bat_W || 0
  const pFc = telemetry?.p_fc_W || 0
  const pEng = telemetry?.p_eng_W || 0
  const pGen = telemetry?.p_gen_W || 0
  const pMotor = telemetry?.p_motor_W || 0
  const pReq = telemetry?.p_req_W || 0
  const busV = telemetry?.bus_voltage || 540
  const busI = telemetry?.bus_current || 0
  const soc = telemetry?.soc || 0
  const h2 = telemetry?.h2_kg || 0
  const jeta = telemetry?.jeta_kg || 0

  const sources = [
    { name: 'Engine', power: pEng, color: '#F59E0B' },
    { name: 'Fuel Cell', power: pFc, color: '#06B6D4' },
    { name: 'Battery', power: Math.abs(pBat), color: '#10B981' },
  ]

  const losses = Math.max(0, pReq - pMotor)
  const efficiency = pReq > 0 ? (pMotor / pReq) * 100 : 0
  const balance = Math.abs(pReq - (Math.abs(pBat) + pFc + pEng + pGen))
  const balanceOk = balance < 100

  const powerHist = history.map((f) => f.p_req_W / 1000)
  const effHist = history.map((f) => (f.overall_efficiency_pct || 85))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">Power Distribution</h1>
          <p className="text-[12px] text-steel-500">Animated power network with real-time efficiency and balance</p>
        </div>
        <span className={`badge ${balanceOk ? 'badge-green' : 'badge-red'}`}>
          {balanceOk ? 'Power Balanced' : 'Power Imbalance'}
        </span>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Power Network</div>
          <span className="badge badge-blue">Live 10 Hz</span>
        </div>
        <div className="card-body">
          <svg className="w-full h-72" viewBox="0 0 900 280" preserveAspectRatio="xMidYMid meet">
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`v-${i}`} x1={i * 90} y1="0" x2={i * 90} y2="280" stroke="#F1F5F9" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 7 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={i * 40} x2="900" y2={i * 40} stroke="#F1F5F9" strokeWidth="0.5" />
            ))}

            {sources.map((src, i) => {
              const y = 50 + i * 75
              const flowWidth = Math.max(3, (src.power / Math.max(1, pReq)) * 20)
              return (
                <g key={src.name}>
                  <rect x="30" y={y - 22} width="110" height="44" rx="6" fill={src.color} opacity="0.9" />
                  <text x="85" y={y + 2} textAnchor="middle" fontSize="11" fill="white" fontWeight="600">{src.name}</text>
                  <text x="85" y={y + 16} textAnchor="middle" fontSize="9" fill="white" opacity="0.9" fontFamily="monospace">
                    {(src.power / 1000).toFixed(1)} kW
                  </text>
                  <line x1="140" y1={y} x2="300" y2="140" stroke={src.color} strokeWidth={flowWidth} strokeOpacity="0.5" strokeDasharray="8 6" className="animated-flow" />
                </g>
              )
            })}

            <g>
              <rect x="300" y="118" width="120" height="44" rx="6" fill="#0066CC" />
              <text x="360" y="138" textAnchor="middle" fontSize="11" fill="white" fontWeight="600">DC Bus</text>
              <text x="360" y="152" textAnchor="middle" fontSize="9" fill="white" opacity="0.9" fontFamily="monospace">
                {busV.toFixed(0)} V - {Math.abs(busI).toFixed(0)} A
              </text>
              <line x1="420" y1="140" x2="560" y2="140" stroke="#0066CC" strokeWidth="12" strokeOpacity="0.5" strokeDasharray="8 6" className="animated-flow" />
            </g>

            <g>
              <rect x="560" y="118" width="110" height="44" rx="6" fill="#8B5CF6" />
              <text x="615" y="138" textAnchor="middle" fontSize="11" fill="white" fontWeight="600">Motor</text>
              <text x="615" y="152" textAnchor="middle" fontSize="9" fill="white" opacity="0.9" fontFamily="monospace">
                {(pMotor / 1000).toFixed(1)} kW
              </text>
              <line x1="670" y1="140" x2="780" y2="140" stroke="#8B5CF6" strokeWidth="12" strokeOpacity="0.5" strokeDasharray="8 6" className="animated-flow" />
            </g>

            <g>
              <rect x="780" y="118" width="100" height="44" rx="6" fill="#0EA5E9" />
              <text x="830" y="138" textAnchor="middle" fontSize="11" fill="white" fontWeight="600">Propeller</text>
              <text x="830" y="152" textAnchor="middle" fontSize="9" fill="white" opacity="0.9" fontFamily="monospace">
                {(pMotor * 0.92 / 1000).toFixed(1)} kW
              </text>
            </g>

            <text x="450" y="250" textAnchor="middle" fontSize="11" fill="#EF4444" fontFamily="monospace">
              Total Loss: {(losses / 1000).toFixed(1)} kW
            </text>
            <text x="450" y="265" textAnchor="middle" fontSize="11" fill="#10B981" fontFamily="monospace">
              System Efficiency: {efficiency.toFixed(1)}%
            </text>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Power Sources</div>
          <div className="space-y-3">
            {sources.map((src) => (
              <div key={src.name}>
                <div className="flex justify-between mb-1 text-[11px]">
                  <span className="text-steel-500">{src.name}</span>
                  <span className="font-mono font-semibold" style={{ color: src.color }}>
                    {(src.power / 1000).toFixed(1)} kW
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(src.power / Math.max(1, pReq)) * 100}%`, background: src.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Efficiency & Losses</div>
          <div className="space-y-3">
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Motor Efficiency</span>
              <span className="font-mono font-semibold text-violet-600">{((telemetry?.motor_eff || 0.88) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Generator Efficiency</span>
              <span className="font-mono font-semibold text-indigo-600">{((telemetry?.gen_eff || 0.92) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Fuel Cell Efficiency</span>
              <span className="font-mono font-semibold text-cyan-600">{((telemetry?.fc_eff || 0.55) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Engine Efficiency</span>
              <span className="font-mono font-semibold text-amber-600">{((telemetry?.eng_eff || 0.38) * 100).toFixed(1)}%</span>
            </div>
            <div className="divider" />
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Total System Loss</span>
              <span className="font-mono font-semibold text-red-500">{(losses / 1000).toFixed(1)} kW</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Overall Efficiency</span>
              <span className="font-mono font-semibold text-emerald-600">{efficiency.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Performance Traces</div>
          <svg className="w-full h-36" viewBox="0 0 200 100" preserveAspectRatio="none">
            {powerHist.slice(-60).map((v, i) => (
              <circle key={i} cx={(i / 59) * 200} cy={95 - (v / 120) * 90} r="1.5" fill="#0066CC" opacity="0.6" />
            ))}
            {effHist.slice(-60).map((v, i) => (
              <circle key={`e-${i}`} cx={(i / 59) * 200} cy={95 - (v / 100) * 90} r="1.5" fill="#10B981" opacity="0.6" />
            ))}
          </svg>
          <div className="flex items-center justify-between text-[10px] text-steel-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Power kW</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Efficiency %</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-6">
          <EquationBox
            formula="P_req = P_bat + P_fc + P_gen - P_loss"
            description="Power balance equation - required power equals sum of all sources minus system losses"
            inputs={[
              { name: 'P_bat', value: `${(Math.abs(pBat) / 1000).toFixed(1)} kW` },
              { name: 'P_fc', value: `${(pFc / 1000).toFixed(1)} kW` },
              { name: 'P_eng + P_gen', value: `${((pEng + pGen) / 1000).toFixed(1)} kW` },
              { name: 'P_loss', value: `${(losses / 1000).toFixed(1)} kW` },
            ]}
            output={`P_req = ${(pReq / 1000).toFixed(1)} kW`}
            outputLabel="Computed required power"
          />
        </div>
        <div className="col-span-6">
          <div className="card p-4">
            <div className="card-title mb-3">Resource Status</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-md bg-emerald-50 border border-emerald-100">
                <div className="telemetry-label">Battery</div>
                <div className="text-lg font-mono font-bold text-emerald-600">{soc.toFixed(1)}%</div>
                <div className="text-[10px] text-steel-400">SOC</div>
              </div>
              <div className="text-center p-3 rounded-md bg-cyan-50 border border-cyan-100">
                <div className="telemetry-label">Hydrogen</div>
                <div className="text-lg font-mono font-bold text-cyan-600">{h2.toFixed(2)} kg</div>
                <div className="text-[10px] text-steel-400">Remaining</div>
              </div>
              <div className="text-center p-3 rounded-md bg-amber-50 border border-amber-100">
                <div className="telemetry-label">Jet-A1</div>
                <div className="text-lg font-mono font-bold text-amber-600">{jeta.toFixed(1)} kg</div>
                <div className="text-[10px] text-steel-400">Remaining</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
