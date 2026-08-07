import { useMemo } from 'react'
import type { TelemetryFrame } from '../../types'
import { useTelemetryHistory } from '../../hooks/useTelemetryHistory'
import { EquationBox, PageSection } from '../common/EquationBox'
import { LinearGauge } from '../common/Gauge'

interface FuelCellPageProps {
  telemetry: TelemetryFrame | null
}

/**
 * Fuel Cell — PEM stack system with hydrogen tank, H2 flow, pressure,
 * temperature, voltage, current, efficiency, water output, and remaining hydrogen.
 */
export function FuelCellPage({ telemetry }: FuelCellPageProps) {
  const history = useTelemetryHistory(telemetry, 60)

  const h2 = telemetry?.h2_kg || 0
  const h2Flow = telemetry?.h2_flow_kg_s || 0
  const pFc = telemetry?.p_fc_W || 0
  const fcEff = telemetry?.fc_eff || 0.55
  const fcTemp = telemetry?.fc_temp || 65
  const busV = telemetry?.bus_voltage || 540

  const stackV = 0.68
  const cells = 300
  const stackVoltage = stackV * cells
  const stackCurrent = busV > 0 ? pFc / busV : 0
  const waterOut = h2Flow * 9
  const h2ToBar = (h2 / 10) * 700
  const o2Consumed = h2Flow * 8
  const remainingMins = h2Flow > 0 ? (h2 / h2Flow) / 60 : 0
  const hydration = Math.max(50, Math.min(100, 70 + Math.sin(fcTemp / 5) * 10))

  const sensors = [
    { name: 'H2 Tank Pressure', value: `${h2ToBar.toFixed(0)} bar`, range: '0-700 bar', ok: true },
    { name: 'Stack Temp Inlet', value: `${(fcTemp - 5).toFixed(1)} C`, range: '20-80 C', ok: fcTemp < 85 },
    { name: 'Stack Temp Outlet', value: `${(fcTemp + 8).toFixed(1)} C`, range: '20-90 C', ok: fcTemp < 85 },
    { name: 'Membrane Humidity', value: `${hydration.toFixed(0)}% RH`, range: '30-90%', ok: hydration > 50 },
    { name: 'H2 Purity', value: '99.99%', range: '>99.0%', ok: true },
    { name: 'Coolant Flow', value: '12.5 L/min', range: '8-15 L/min', ok: true },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">Fuel Cell</h1>
          <p className="text-[12px] text-steel-500">PEM stack - hydrogen flow, electrochemical performance</p>
        </div>
        <span className="badge badge-blue">PEM Type - {cells} Cells</span>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Hydrogen System - H2 Tank to PEM Stack</div>
          <span className="badge badge-blue">Animated Flow</span>
        </div>
        <div className="card-body">
          <svg className="w-full h-64" viewBox="0 0 900 240" preserveAspectRatio="xMidYMid meet">
            <ellipse cx="130" cy="120" rx="70" ry="100" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2" />
            <text x="130" y="115" textAnchor="middle" fontSize="12" fill="#0369A1" fontWeight="600">H2 Tank</text>
            <text x="130" y="130" textAnchor="middle" fontSize="10" fill="#0369A1" fontFamily="monospace">{h2.toFixed(2)} kg</text>
            <text x="130" y="145" textAnchor="middle" fontSize="9" fill="#0284C7" fontFamily="monospace">{h2ToBar.toFixed(0)} bar</text>

            <line x1="190" y1="120" x2="360" y2="120" stroke="#06B6D4" strokeWidth="4" strokeDasharray="8 6" className="animated-flow" />
            <text x="275" y="105" textAnchor="middle" fontSize="9" fill="#64748B" fontFamily="monospace">H2 Flow: {(h2Flow * 3600).toFixed(2)} kg/h</text>

            <rect x="360" y="60" width="150" height="120" rx="8" fill="#F0FDFA" stroke="#0D9488" strokeWidth="1.5" />
            {Array.from({ length: 10 }).map((_, i) => (
              <rect key={i} x={365 + i * 13} y="70" width="8" height="100" rx="2" fill={i % 2 === 0 ? '#14B8A6' : '#99F6E4'} opacity="0.8" />
            ))}
            <text x="435" y="118" textAnchor="middle" fontSize="11" fill="#0D9488" fontWeight="600">PEM Stack</text>
            <text x="435" y="132" textAnchor="middle" fontSize="9" fill="#0D9488" fontFamily="monospace">{pFc / 1000 > 0 ? `${(pFc / 1000).toFixed(1)} kW` : 'Standby'}</text>
            <text x="435" y="45" textAnchor="middle" fontSize="9" fill="#64748B">O2 Consumption: {(o2Consumed * 3600).toFixed(2)} kg/h</text>

            <line x1="510" y1="120" x2="680" y2="120" stroke="#F59E0B" strokeWidth="4" strokeDasharray="8 6" className="animated-flow" />
            <text x="595" y="105" textAnchor="middle" fontSize="9" fill="#64748B" fontFamily="monospace">DC Output: {stackVoltage.toFixed(0)} V - {stackCurrent.toFixed(1)} A</text>

            <rect x="680" y="90" width="100" height="60" rx="8" fill="#FBBF24" />
            <text x="730" y="115" textAnchor="middle" fontSize="11" fill="white" fontWeight="600">DC Bus</text>
            <text x="730" y="130" textAnchor="middle" fontSize="9" fill="white" opacity="0.9" fontFamily="monospace">{(pFc / 1000).toFixed(1)} kW</text>

            <path d="M 360 180 Q 320 200 280 190" fill="none" stroke="#0284C7" strokeWidth="2" strokeDasharray="4 4" />
            <text x="285" y="205" textAnchor="middle" fontSize="8" fill="#0284C7">Water: {(waterOut * 3600).toFixed(2)} kg/h</text>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Electrochemical</div>
          <div className="space-y-3">
            <LinearGauge label="Stack Voltage" value={stackVoltage} max={350} unit="V" color="#0D9488" />
            <LinearGauge label="Stack Current" value={Math.abs(stackCurrent)} max={200} unit="A" color="#0D9488" />
            <LinearGauge label="Output Power" value={pFc / 1000} max={40} unit="kW" color="#F59E0B" />
            <LinearGauge label="Efficiency" value={fcEff * 100} max={100} unit="%" color="#10B981" />
          </div>
        </div>

        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Hydrogen</div>
          <div className="space-y-3">
            <LinearGauge label="H2 Remaining" value={h2} max={10} unit="kg" color="#06B6D4" />
            <LinearGauge label="H2 Flow Rate" value={h2Flow * 3600} max={1.5} unit="kg/h" color="#06B6D4" />
            <LinearGauge label="Tank Pressure" value={h2ToBar} max={700} unit="bar" color="#0284C7" />
            <div className="divider" />
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Endurance (H2)</span>
              <span className="font-mono font-semibold text-cyan-600">{remainingMins > 0 ? `${(remainingMins / 60).toFixed(1)} hr` : '--'}</span>
            </div>
          </div>
        </div>

        <div className="col-span-4 card p-4">
          <div className="card-title mb-3">Thermal & Balance of Plant</div>
          <div className="space-y-3">
            <LinearGauge label="Stack Temp" value={fcTemp} max={120} unit="C" color={fcTemp > 85 ? '#EF4444' : '#F59E0B'} />
            <LinearGauge label="Membrane Hydration" value={hydration} max={100} unit="%" color="#06B6D4" />
            <LinearGauge label="Water Output" value={waterOut * 3600} max={1} unit="kg/h" color="#0284C7" />
            <div className="divider" />
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">O2 Consumed</span>
              <span className="font-mono font-semibold">{(o2Consumed * 3600).toFixed(2)} kg/h</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Stack Status</span>
              <span className={`font-mono font-semibold ${fcTemp > 85 ? 'text-red-500' : 'text-emerald-600'}`}>
                {fcTemp > 85 ? 'Thermal Limit' : 'Operational'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4">
          <EquationBox
            formula="n_FC = V_cell / 1.23"
            description="Fuel cell efficiency - cell voltage / theoretical Nernst voltage (1.23 V)"
            inputs={[
              { name: 'Cell voltage (V)', value: `${stackV.toFixed(2)} V` },
              { name: 'Nernst voltage', value: '1.23 V' },
            ]}
            output={`n = ${((stackV / 1.23) * 100).toFixed(1)}%`}
            outputLabel="Stack efficiency"
          />
        </div>
        <div className="col-span-4">
          <EquationBox
            formula="m_H2 = P_FC / (LHV x n_FC)"
            description="Hydrogen consumption rate - power / (lower heating value x efficiency)"
            inputs={[
              { name: 'P_FC', value: `${(pFc / 1000).toFixed(1)} kW` },
              { name: 'LHV', value: '120 MJ/kg' },
            ]}
            output={`m_H2 = ${(h2Flow * 3600).toFixed(2)} kg/h`}
            outputLabel="H2 consumption"
          />
        </div>
        <div className="col-span-4">
          <EquationBox
            formula="2H2 + O2 -> 2H2O"
            description="Electrochemical reaction - hydrogen + oxygen - water + electrical energy"
            inputs={[
              { name: 'H2 consumed', value: `${(h2Flow * 3600).toFixed(2)} kg/h` },
              { name: 'O2 consumed', value: `${(o2Consumed * 3600).toFixed(2)} kg/h` },
            ]}
            output={`H2O = ${(waterOut * 3600).toFixed(2)} kg/h`}
            outputLabel="Water produced"
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-6 card p-4">
          <div className="card-title mb-3">Virtual Sensor Matrix</div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Sensor</th>
                <th className="table-header">Value</th>
                <th className="table-header">Range</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((s) => (
                <tr key={s.name}>
                  <td className="table-cell">{s.name}</td>
                  <td className="table-cell-mono">{s.value}</td>
                  <td className="table-cell text-steel-400">{s.range}</td>
                  <td className="table-cell">
                    <span className={`badge ${s.ok ? 'badge-green' : 'badge-red'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {s.ok ? 'OK' : 'ALERT'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="col-span-6 space-y-3">
          <PageSection title="Stack Health" subtitle="PEM degradation assessment">
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-steel-500">Voltage Decay</span>
                <span className="font-mono font-semibold text-amber-600">4.2 uV/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel-500">Membrane Degradation</span>
                <span className="font-mono font-semibold text-amber-600">2.8% / 1000h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel-500">Estimated Life</span>
                <span className="font-mono font-semibold text-emerald-600">~8,000 hr</span>
              </div>
              <div className="divider" />
              <div className="text-[11px] text-steel-400 leading-snug">
                Voltage decay monitored per cell. Membrane hydration maintained between 70-85%
                for optimal proton conductivity and durability.
              </div>
            </div>
          </PageSection>
        </div>
      </div>
    </div>
  )
}
