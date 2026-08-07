import type { TelemetryFrame } from '../../types'
import { useTelemetryHistory } from '../../hooks/useTelemetryHistory'
import { EquationBox } from '../common/EquationBox'
import { Gauge } from '../common/Gauge'

interface FlightDynamicsPageProps {
  telemetry: TelemetryFrame | null
}

/** Flight Dynamics - artificial horizon, heading, compass, VS, attitude, pitch/roll/yaw, flight path. */
export function FlightDynamicsPage({ telemetry }: FlightDynamicsPageProps) {
  const history = useTelemetryHistory(telemetry, 60)

  const heading = telemetry?.heading_deg || 0
  const pitch = telemetry?.pitch_deg_att || 0
  const roll = telemetry?.roll_deg || 0
  const vs = telemetry?.vertical_speed_mps || 0
  const alt = telemetry?.alt_m || 0
  const vel = telemetry?.vel_mps || 0

  const climbRateFpm = vs * 196.85 // m/s to ft/min

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">Flight Dynamics</h1>
          <p className="text-[12px] text-steel-500">Attitude, heading, and vertical speed instruments</p>
        </div>
        <span className="badge badge-green">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Instruments Live
        </span>
      </div>

      {/* Primary flight instruments */}
      <div className="grid grid-cols-12 gap-3">
        {/* Artificial horizon */}
        <div className="col-span-4 card p-4 flex flex-col items-center">
          <div className="card-title mb-3 self-start">Artificial Horizon</div>
          <svg className="w-56 h-56" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" fill="#1E293B" />
            <g clipPath="url(#horizon-clip)">
              <rect x="0" y="0" width="200" height={100 + pitch * 2} fill="#38BDF8" />
              <rect x="0" y={100 + pitch * 2} width="200" height={100 - pitch * 2} fill="#8B5CF6" />
              <line
                x1="0" y1={100 + pitch * 2}
                x2="200" y2={100 + pitch * 2}
                stroke="#FFFFFF" strokeWidth="2"
                transform={`rotate(${roll}, 100, ${100 + pitch * 2})`}
              />
              {Array.from({ length: 5 }).map((_, i) => (
                <line
                  key={i}
                  x1={60 + i * 20} y1={100 + pitch * 2 + 15}
                  x2={60 + i * 20} y2={100 + pitch * 2 + 35}
                  stroke="rgba(255,255,255,0.5)" strokeWidth="2"
                  transform={`rotate(${roll}, 100, ${100 + pitch * 2})`}
                />
              ))}
            </g>
            <defs>
              <clipPath id="horizon-clip">
                <circle cx="100" cy="100" r="92" />
              </clipPath>
            </defs>
            <circle cx="100" cy="100" r="92" fill="none" stroke="#0A1F3D" strokeWidth="4" />
            {/* Aircraft reference */}
            <polygon points="100,92 92,100 100,98 108,100" fill="#EF4444" />
            {/* Roll scale */}
            {[-60, -30, 0, 30, 60].map((deg) => {
              const rad = (deg * Math.PI) / 180
              const x = 100 + 78 * Math.sin(rad)
              const y = 100 - 78 * Math.cos(rad)
              return (
                <circle key={deg} cx={x} cy={y} r="3" fill="#94A3B8" />
              )
            })}
            <text x="100" y="34" textAnchor="middle" fontSize="10" fill="#FFFFFF">-30</text>
            <text x="143" y="48" textAnchor="middle" fontSize="10" fill="#FFFFFF">-60</text>
            <text x="57" y="48" textAnchor="middle" fontSize="10" fill="#FFFFFF">60</text>
            <text x="100" y="18" textAnchor="middle" fontSize="14" fill="#EF4444" fontWeight="700" fontFamily="monospace">
              {roll >= 0 ? '+' : ''}{roll.toFixed(0)}
            </text>
          </svg>
          <div className="text-[11px] text-steel-500 mt-2">
            Pitch: {pitch.toFixed(1)}&deg; - Roll: {roll.toFixed(1)}&deg;
          </div>
        </div>

        {/* Heading indicator */}
        <div className="col-span-4 card p-4 flex flex-col items-center">
          <div className="card-title mb-3 self-start">Heading Indicator / Compass</div>
          <svg className="w-56 h-56" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" fill="#F8FAFC" stroke="#0A1F3D" strokeWidth="2" />
            {Array.from({ length: 36 }).map((_, i) => {
              const deg = i * 10
              const rad = ((deg - heading) * Math.PI) / 180
              const major = deg % 30 === 0
              const x1 = 100 + 82 * Math.sin(rad)
              const y1 = 100 - 82 * Math.cos(rad)
              const x2 = 100 + (major ? 92 : 87) * Math.sin(rad)
              const y2 = 100 - (major ? 92 : 87) * Math.cos(rad)
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth={major ? 2 : 1} />
            })}
            {['N', 'E', 'S', 'W'].map((label, i) => {
              const deg = i * 90
              const rad = ((deg - heading) * Math.PI) / 180
              const x = 100 + 68 * Math.sin(rad)
              const y = 100 - 68 * Math.cos(rad) + 4
              return (
                <text key={label} x={x} y={y} textAnchor="middle" fontSize="16" fill={i === 0 ? '#EF4444' : '#334155'} fontWeight="700">
                  {label}
                </text>
              )
            })}
            <line x1="100" y1="100" x2={100 + 55 * Math.sin(0)} y2={100 - 55 * Math.cos(0)} stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="100" r="8" fill="#0A1F3D" />
            <text x="100" y="18" textAnchor="middle" fontSize="11" fill="#0A1F3D" fontWeight="700" fontFamily="monospace">
              {heading.toFixed(0)}&deg;
            </text>
          </svg>
          <div className="text-[11px] text-steel-500 mt-2">
            True heading - Magnetic variation already applied
          </div>
        </div>

        {/* Vertical speed + attitude gauges */}
        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Vertical Speed & Attitude</div>
          <div className="flex items-center justify-around">
            <Gauge value={climbRateFpm} min={-2000} max={2000} label="V/S" unit="ft/min" color={vs >= 0 ? '#10B981' : '#EF4444'} size={150} />
            <Gauge value={Math.abs(pitch)} min={0} max={30} label="Pitch" unit="deg" color="#3B82F6" size={150} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="p-2 rounded-md bg-steel-50 text-center">
              <div className="telemetry-label">Roll</div>
              <div className="font-mono text-[14px] font-bold">{roll.toFixed(1)}&deg;</div>
            </div>
            <div className="p-2 rounded-md bg-steel-50 text-center">
              <div className="telemetry-label">Altitude</div>
              <div className="font-mono text-[14px] font-bold">{alt.toFixed(0)} m</div>
            </div>
            <div className="p-2 rounded-md bg-steel-50 text-center">
              <div className="telemetry-label">Speed</div>
              <div className="font-mono text-[14px] font-bold">{vel.toFixed(1)} m/s</div>
            </div>
          </div>
        </div>
      </div>

      {/* Flight path + equations */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 card">
          <div className="card-header">
            <div className="card-title">Flight Path Trace</div>
            <span className="badge badge-blue">3D Path</span>
          </div>
          <div className="card-body">
            <svg className="w-full h-48" viewBox="0 0 800 180" preserveAspectRatio="none">
              {[0, 1, 2, 3].map((i) => (
                <line key={i} x1="0" y1={i * 45} x2="800" y2={i * 45} stroke="#F1F5F9" strokeWidth="0.5" />
              ))}
              <path
                d={`M 0 ${120 + Math.sin(0) * 30} ` + history.slice(1, 60).map((f, i) =>
                  `L ${(i / 59) * 800} ${120 - (f.vertical_speed_mps > 0 ? 1 : -1) * Math.min(50, Math.abs(f.vertical_speed_mps || 0) * 10) + Math.sin(i / 4) * 20}`
                ).join(' ')}
                fill="none" stroke="#0066CC" strokeWidth="2"
              />
              {history.map((f, i) => (
                <circle key={i} cx={(i / 59) * 800} cy={120 - Math.min(50, Math.abs(f.vertical_speed_mps || 0) * 10) + Math.sin(i / 4) * 20} r="2" fill="#0066CC" opacity="0.4" />
              ))}
            </svg>
          </div>
        </div>

        <div className="col-span-4 space-y-3">
          <EquationBox
            formula="V/S = d(altitude) / dt"
            description="Vertical speed - rate of change of altitude over time"
            inputs={[
              { name: 'd(altitude)', value: `${(vs > 0 ? '+ ' : '- ')}${Math.abs(vs).toFixed(2)} m/s` },
            ]}
            output={`${climbRateFpm >= 0 ? '+' : ''}${climbRateFpm.toFixed(0)} ft/min`}
            outputLabel="Vertical speed"
          />
          <EquationBox
            formula="Turn rate = g x tan(roll) / V"
            description="Standard rate turn calculation"
            inputs={[
              { name: 'Bank angle', value: `${roll.toFixed(1)} deg` },
              { name: 'Velocity', value: `${vel.toFixed(1)} m/s` },
            ]}
            output={`${(Math.tan((roll * Math.PI) / 180) * 9.81 / Math.max(1, vel)).toFixed(2)} rad/s`}
            outputLabel="Turn rate"
          />
        </div>
      </div>
    </div>
  )
}
