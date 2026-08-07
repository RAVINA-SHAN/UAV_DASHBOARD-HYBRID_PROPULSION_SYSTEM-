import { useMemo } from 'react'
import type { TelemetryFrame } from '../../types'
import { useTelemetryHistory } from '../../hooks/useTelemetryHistory'
import { EquationBox, PageSection } from '../common/EquationBox'
import { LinearGauge } from '../common/Gauge'

interface BatterySystemPageProps {
  telemetry: TelemetryFrame | null
}

const CELLS = 96
const CELL_RANGE = 3.2 // V per cell range

/**
 * Battery System — Animated battery pack with cell balancing, SOC/SOH,
 * voltage, current, temperature, thermal map, degradation, and cycle life.
 */
export function BatterySystemPage({ telemetry }: BatterySystemPageProps) {
  const history = useTelemetryHistory(telemetry, 60)

  const soc = telemetry?.soc || 0
  const pBat = telemetry?.p_bat_W || 0
  const busV = telemetry?.bus_voltage || 540
  const busI = telemetry?.bus_current || 0
  const batTemp = telemetry?.bat_temp || 35
  const mass = telemetry?.mass_kg || 1200

  // Simulated cell voltages around nominal with small variation
  const cellVoltages = useMemo(() => {
    const nominal = (soc / 100) * CELL_RANGE + 3.0
    return Array.from({ length: CELLS }).map((_, i) =>
      nominal + Math.sin(i * 0.7) * 0.05 + Math.random() * 0.02
    )
  }, [soc, history.length])

  const avgCellV = cellVoltages.reduce((a, b) => a + b, 0) / CELLS
  const maxCellV = Math.max(...cellVoltages)
  const minCellV = Math.min(...cellVoltages)
  const delta = maxCellV - minCellV
  const soh = 100 - (1 - soc / 100) * 0.4
  const remainingCycles = Math.round(3000 * (soh / 100))
  const socEnergy = (soc / 100) * 40 // kWh
  const cRate = pBat > 0 ? Math.abs(pBat) / (40 * 1000) : 0

  // Thermal map - 8x8 grid of cell temperatures
  const thermalMap = useMemo(() => {
    return Array.from({ length: 64 }).map((_, i) => {
      const x = i % 8
      const y = Math.floor(i / 8)
      const dist = Math.sqrt(Math.pow(x - 3.5, 2) + Math.pow(y - 3.5, 2))
      return batTemp + Math.sin(dist * 1.5) * 3 + (Math.random() - 0.5) * 2
    })
  }, [batTemp, history.length])

  const chargeState = pBat > 0 ? 'Discharging' : pBat < 0 ? 'Charging' : 'Idle'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">Battery System</h1>
          <p className="text-[12px] text-steel-500">Li-ion pack — cell balancing, SOC/SOH, thermal management</p>
        </div>
        <span className={`badge ${chargeState === 'Discharging' ? 'badge-amber' : chargeState === 'Charging' ? 'badge-green' : 'badge-gray'}`}>
          {chargeState}
        </span>
      </div>

      {/* Battery pack visualization */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Battery Pack — {CELLS} Cells (3S × 32P)</div>
          <span className="badge badge-blue">Live Cell Voltages</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-8 gap-2">
            {cellVoltages.map((v, i) => {
              const pct = (v - 3.0) / CELL_RANGE
              const color = pct > 0.7 ? '#10B981' : pct > 0.4 ? '#F59E0B' : '#EF4444'
              return (
                <div
                  key={i}
                  className="h-14 rounded-md border border-steel-200 relative overflow-hidden"
                  style={{ background: `rgba(16,185,129,${0.1 + pct * 0.3})` }}
                  title={`Cell ${i + 1}: ${v.toFixed(3)} V`}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                    style={{ height: `${pct * 100}%`, background: color, opacity: 0.7 }}
                  />
                  <div className="absolute top-0.5 left-0.5 text-[8px] font-mono text-navy-800 font-semibold">
                    {i + 1}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px] text-steel-500">
            <span>Nominal: {avgCellV.toFixed(3)} V / cell</span>
            <span>Max: {maxCellV.toFixed(3)} V</span>
            <span>Min: {minCellV.toFixed(3)} V</span>
            <span>Δ: {delta.toFixed(3)} V</span>
            <span className={delta > 0.05 ? 'text-red-500 font-semibold' : 'text-emerald-600 font-semibold'}>
              {delta > 0.05 ? 'Balancing Required' : 'Cells Balanced'}
            </span>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-3 card p-4">
          <div className="card-title mb-3">State of Charge</div>
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-emerald-600">{soc.toFixed(1)}%</div>
            <div className="text-[11px] text-steel-400 mt-1">{socEnergy.toFixed(1)} kWh remaining</div>
            <div className="progress-bar mt-3">
              <div className="progress-fill bg-emerald-500" style={{ width: `${soc}%` }} />
            </div>
          </div>
        </div>

        <div className="col-span-3 card p-4">
          <div className="card-title mb-3">State of Health</div>
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-aerospace-600">{soh.toFixed(1)}%</div>
            <div className="text-[11px] text-steel-400 mt-1">~{remainingCycles} cycles remaining</div>
            <div className="progress-bar mt-3">
              <div className="progress-fill" style={{ width: `${soh}%` }} />
            </div>
          </div>
        </div>

        <div className="col-span-3 card p-4">
          <div className="card-title mb-3">Electrical</div>
          <div className="space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Voltage</span>
              <span className="font-mono font-semibold">{busV.toFixed(1)} V</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Current</span>
              <span className="font-mono font-semibold">{Math.abs(busI).toFixed(1)} A</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Power</span>
              <span className="font-mono font-semibold text-emerald-600">{(Math.abs(pBat) / 1000).toFixed(1)} kW</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">C-Rate</span>
              <span className="font-mono font-semibold">{cRate.toFixed(2)}C</span>
            </div>
          </div>
        </div>

        <div className="col-span-3 card p-4">
          <div className="card-title mb-3">Thermal</div>
          <div className="space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Pack Temp</span>
              <span className="font-mono font-semibold text-amber-600">{batTemp.toFixed(1)}°C</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Max Cell</span>
              <span className="font-mono font-semibold">{(batTemp + 3).toFixed(1)}°C</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-steel-500">Min Cell</span>
              <span className="font-mono font-semibold">{(batTemp - 3).toFixed(1)}°C</span>
            </div>
            <div className={`flex justify-between text-[12px] ${batTemp > 45 ? 'text-red-500' : 'text-emerald-600'}`}>
              <span>Status</span>
              <span className="font-semibold">{batTemp > 45 ? 'Overheat' : 'Nominal'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Thermal map + degradation */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-7 card">
          <div className="card-header">
            <div className="card-title">Thermal Map</div>
            <span className="badge badge-amber">Liquid Cooling</span>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-8 gap-1">
              {thermalMap.map((t, i) => {
                const pct = (t - 25) / 25
                const color = pct < 0.3 ? '#38BDF8' : pct < 0.6 ? '#10B981' : pct < 0.8 ? '#F59E0B' : '#EF4444'
                return (
                  <div
                    key={i}
                    className="h-12 rounded-md border border-steel-100 flex items-center justify-center"
                    style={{ background: color, opacity: 0.5 + pct * 0.3 }}
                    title={`${t.toFixed(1)}°C`}
                  >
                    <span className="text-[8px] font-mono text-white font-semibold">{t.toFixed(0)}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between mt-3 text-[10px] text-steel-400">
              <span>25°C</span>
              <span>Thermal gradient</span>
              <span>50°C</span>
            </div>
          </div>
        </div>

        <div className="col-span-5 space-y-3">
          <PageSection title="Battery Degradation" subtitle="Capacity fade over cycles">
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-steel-500">Capacity Fade</span>
                <span className="font-mono font-semibold text-amber-600">{(100 - soh).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel-500">Remaining Life</span>
                <span className="font-mono font-semibold text-emerald-600">{remainingCycles} cycles</span>
              </div>
              <div className="flex justify-between">
                <span className="text-steel-500">Retention</span>
                <span className="font-mono font-semibold">{soh.toFixed(1)}%</span>
              </div>
              <div className="divider" />
              <div className="text-[11px] text-steel-400 leading-snug">
                Degradation driven by cycle count, temperature, and discharge depth. Recommended charge
                window 20–80% SOC for extended cycle life.
              </div>
            </div>
          </PageSection>
          <EquationBox
            formula="E = V × Ah"
            description="Battery energy — pack voltage × ampere-hour capacity"
            inputs={[
              { name: 'Voltage (V)', value: `${busV.toFixed(1)} V` },
              { name: 'Capacity (Ah)', value: `${(40000 / busV).toFixed(1)} Ah` },
            ]}
            output={`E = ${socEnergy.toFixed(1)} kWh`}
            outputLabel="Available energy"
          />
        </div>
      </div>
    </div>
  )
}