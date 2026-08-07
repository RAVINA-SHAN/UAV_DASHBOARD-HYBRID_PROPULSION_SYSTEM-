import { useMemo } from 'react'
import type { TelemetryFrame } from '../../types'
import { useTelemetryHistory } from '../../hooks/useTelemetryHistory'
import { PageSection } from '../common/EquationBox'

interface DiagnosticsPageProps {
  telemetry: TelemetryFrame | null
}

/** Diagnostics - fault codes, warnings, health monitoring, maintenance prediction,
 * component and sensor status. */
export function DiagnosticsPage({ telemetry }: DiagnosticsPageProps) {
  const history = useTelemetryHistory(telemetry, 60)

  const soc = telemetry?.soc || 100
  const batTemp = telemetry?.bat_temp || 35
  const fcTemp = telemetry?.fc_temp || 65
  const engEgt = telemetry?.eng_egt_K || 900
  const busV = telemetry?.bus_voltage || 540
  const busI = telemetry?.bus_current || 0
  const jeta = telemetry?.jeta_kg || 30
  const h2 = telemetry?.h2_kg || 10
  const health = telemetry?.system_health_pct || 100
  const phase = telemetry?.phase_name || 'Cruise'

  const faultCodes = useMemo(() => {
    const codes = []
    if (soc < 20) codes.push({ code: 'BATT-001', severity: 'critical', message: 'Battery SOC critically low', system: 'Battery', time: 'T+' + Math.floor(history.length * 0.1) + 's' })
    if (batTemp > 45) codes.push({ code: 'THRM-104', severity: 'warning', message: 'Battery pack overheating', system: 'Thermal', time: 'T+' + Math.floor(history.length * 0.1) + 's' })
    if (fcTemp > 85) codes.push({ code: 'FC-220', severity: 'warning', message: 'Fuel cell stack temperature high', system: 'Fuel Cell', time: 'T+' + Math.floor(history.length * 0.1) + 's' })
    if (busV < 450) codes.push({ code: 'BUS-330', severity: 'critical', message: 'DC bus undervoltage', system: 'Power', time: 'T+' + Math.floor(history.length * 0.1) + 's' })
    if (jeta < 5) codes.push({ code: 'FUEL-110', severity: 'warning', message: 'Jet-A1 fuel low', system: 'Fuel', time: 'T+' + Math.floor(history.length * 0.1) + 's' })
    if (h2 < 1) codes.push({ code: 'H2-101', severity: 'warning', message: 'Hydrogen low', system: 'Fuel Cell', time: 'T+' + Math.floor(history.length * 0.1) + 's' })
    if (codes.length === 0) codes.push({ code: 'NOM-000', severity: 'info', message: 'All systems nominal', system: 'GCS', time: 'T+' + Math.floor(history.length * 0.1) + 's' })
    return codes
  }, [soc, batTemp, fcTemp, busV, jeta, h2, history.length])

  const componentStatus = [
    { name: 'Battery Pack', status: 'Operational', health: 97.2, color: '#10B981' },
    { name: 'Fuel Cell Stack', status: 'Operational', health: 95.8, color: '#10B981' },
    { name: 'PBS TS100 Engine', status: 'Operational', health: 98.1, color: '#10B981' },
    { name: 'PMSM Motor', status: 'Operational', health: 99.4, color: '#10B981' },
    { name: 'Generator', status: 'Operational', health: 96.5, color: '#10B981' },
    { name: 'DC Bus', status: 'Operational', health: 99.0, color: '#10B981' },
    { name: 'Inverter', status: 'Operational', health: 97.8, color: '#10B981' },
    { name: 'Propeller', status: 'Operational', health: 98.7, color: '#10B981' },
  ]

  const sensorStatus = [
    { name: 'IMU / AHRS', status: 'OK', latency: '2 ms' },
    { name: 'GPS / GNSS', status: 'OK', latency: '5 ms' },
    { name: 'Pitot / Static', status: 'OK', latency: '3 ms' },
    { name: 'Temperature Sensors', status: '8/8 OK', latency: '4 ms' },
    { name: 'Voltage Sensors', status: '12/12 OK', latency: '2 ms' },
    { name: 'Current Sensors', status: '6/6 OK', latency: '2 ms' },
  ]

  const maintenance = [
    { item: 'Battery cell balancing', due: 'Next 50 hr', priority: 'Scheduled' },
    { item: 'FC membrane check', due: 'Next 200 hr', priority: 'Scheduled' },
    { item: 'Engine oil change', due: 'Next 300 hr', priority: 'Scheduled' },
    { item: 'Propeller inspection', due: 'Next 100 hr', priority: 'Scheduled' },
    { item: 'Thermal system flush', due: 'Next 400 hr', priority: 'Routine' },
  ]

  const severityBadge = (sev: string) => {
    if (sev === 'critical') return 'badge-red'
    if (sev === 'warning') return 'badge-amber'
    return 'badge-green'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">Diagnostics</h1>
          <p className="text-[12px] text-steel-500">Fault codes, health monitoring, maintenance prediction</p>
        </div>
        <span className={`badge ${health > 90 ? 'badge-green' : health > 70 ? 'badge-amber' : 'badge-red'}`}>
          System Health: {health.toFixed(0)}%
        </span>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-6 card">
          <div className="card-header">
            <div className="card-title">Fault Codes</div>
            <span className="badge badge-blue">{faultCodes.length} Active</span>
          </div>
          <div className="card-body">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Code</th>
                  <th className="table-header">Severity</th>
                  <th className="table-header">Message</th>
                  <th className="table-header">System</th>
                  <th className="table-header">Time</th>
                </tr>
              </thead>
              <tbody>
                {faultCodes.map((f) => (
                  <tr key={f.code}>
                    <td className="table-cell-mono font-semibold">{f.code}</td>
                    <td className="table-cell">
                      <span className={`badge ${severityBadge(f.severity)}`}>{f.severity.toUpperCase()}</span>
                    </td>
                    <td className="table-cell">{f.message}</td>
                    <td className="table-cell">{f.system}</td>
                    <td className="table-cell-mono text-steel-400">{f.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-6 card p-4">
          <div className="card-title mb-3">Health Monitoring</div>
          <div className="space-y-3">
            {componentStatus.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between mb-1 text-[11px]">
                  <span className="text-steel-500">{c.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-semibold" style={{ color: c.color }}>{c.health.toFixed(1)}%</span>
                    <span className="text-[10px] text-steel-400">{c.status}</span>
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${c.health}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-6 card">
          <div className="card-header">
            <div className="card-title">Sensor Status</div>
            <span className="badge badge-green">All Nominal</span>
          </div>
          <div className="card-body">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Sensor</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Sample Rate</th>
                  <th className="table-header">Latency</th>
                </tr>
              </thead>
              <tbody>
                {sensorStatus.map((s) => (
                  <tr key={s.name}>
                    <td className="table-cell">{s.name}</td>
                    <td className="table-cell">
                      <span className="badge badge-green"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{s.status}</span>
                    </td>
                    <td className="table-cell-mono">10 Hz</td>
                    <td className="table-cell-mono text-steel-400">{s.latency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-6 space-y-3">
          <PageSection title="Maintenance Prediction" subtitle="Predictive maintenance using health trends">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Item</th>
                  <th className="table-header">Due</th>
                  <th className="table-header">Priority</th>
                </tr>
              </thead>
              <tbody>
                {maintenance.map((m) => (
                  <tr key={m.item}>
                    <td className="table-cell">{m.item}</td>
                    <td className="table-cell-mono">{m.due}</td>
                    <td className="table-cell">
                      <span className={`badge ${m.priority === 'Scheduled' ? 'badge-amber' : 'badge-gray'}`}>{m.priority}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PageSection>

          <div className="card p-4">
            <div className="card-title mb-2">System Alerts</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[12px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>All flight-critical systems within limits for {phase} phase</span>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Battery temp trending +1.2 C/10min - monitor</span>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Fuel cell output stable at {((telemetry?.p_fc_W || 0) / 1000).toFixed(1)} kW</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
