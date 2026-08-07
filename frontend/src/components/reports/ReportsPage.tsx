import { useState } from 'react'
import { FileText, Download, FileSpreadsheet, FileType, ChevronRight } from 'lucide-react'
import type { TelemetryFrame } from '../../types'

interface ReportsPageProps {
  telemetry: TelemetryFrame | null
}

/** Reports - mission, battery, fuel, hydrogen, engine, optimization reports
 * with PDF/Excel/CSV download options. */
export function ReportsPage({ telemetry }: ReportsPageProps) {
  const [selectedReport, setSelectedReport] = useState('mission')

  const reports = [
    { id: 'mission', name: 'Mission Report', desc: 'Overview of mission performance, phases, timelines', icon: FileText, color: 'text-aerospace-600' },
    { id: 'battery', name: 'Battery Report', desc: 'SOC/SOH trend, cell voltages, thermal data', icon: FileText, color: 'text-emerald-600' },
    { id: 'fuel', name: 'Fuel Report', desc: 'Jet-A1 consumption, flow rates, efficiency', icon: FileText, color: 'text-amber-600' },
    { id: 'hydrogen', name: 'Hydrogen Report', desc: 'H2 usage, stack efficiency, water output', icon: FileText, color: 'text-cyan-600' },
    { id: 'engine', name: 'Engine Report', desc: 'RPM, torque, EGT, SFC, thermal data', icon: FileText, color: 'text-red-500' },
    { id: 'optimization', name: 'Optimization Report', desc: 'Design space results, trade studies, scoring', icon: FileText, color: 'text-violet-600' },
  ]

  const selected = reports.find((r) => r.id === selectedReport) || reports[0]

  const summary = {
    mission: [
      { label: 'Mission Duration', value: '640 min' },
      { label: 'Distance Covered', value: `${((telemetry?.dist_m || 0) / 1000).toFixed(1)} km` },
      { label: 'Max Altitude', value: `${(telemetry?.alt_m || 0).toFixed(0)} m` },
      { label: 'Fuel Consumed', value: `${(30 - (telemetry?.jeta_kg || 30)).toFixed(1)} kg` },
    ],
    battery: [
      { label: 'Initial SOC', value: '100%' },
      { label: 'Current SOC', value: `${(telemetry?.soc || 0).toFixed(1)}%` },
      { label: 'Min Cell', value: '3.42 V' },
      { label: 'Max Cell', value: '3.68 V' },
    ],
    fuel: [
      { label: 'Initial Fuel', value: '30.0 kg' },
      { label: 'Current Fuel', value: `${(telemetry?.jeta_kg || 30).toFixed(1)} kg` },
      { label: 'Avg Flow', value: `${(telemetry?.fuel_flow_kg_hr || 0).toFixed(2)} kg/h` },
      { label: 'Efficiency', value: `${((telemetry?.eng_eff || 0) * 100).toFixed(1)}%` },
    ],
    hydrogen: [
      { label: 'Initial H2', value: '10.0 kg' },
      { label: 'Current H2', value: `${(telemetry?.h2_kg || 10).toFixed(2)} kg` },
      { label: 'H2 Flow', value: `${((telemetry?.h2_flow_kg_s || 0) * 3600).toFixed(2)} kg/h` },
      { label: 'Stack Efficiency', value: `${((telemetry?.fc_eff || 0) * 100).toFixed(1)}%` },
    ],
    engine: [
      { label: 'Engine Type', value: 'PBS TS100' },
      { label: 'RPM', value: `${(telemetry?.eng_rpm || 0).toFixed(0)}` },
      { label: 'EGT', value: `${((telemetry?.eng_egt_K || 900) - 273).toFixed(0)} C'` },
      { label: 'SFC', value: `${(telemetry?.eng_bsfc || 0).toFixed(4)} kg/kWh` },
    ],
    optimization: [
      { label: 'Design Score', value: '214.3' },
      { label: 'Endurance', value: `${(telemetry?.endurance_remaining_min || 0).toFixed(0)} min` },
      { label: 'Efficiency', value: `${(telemetry?.overall_efficiency_pct || 0).toFixed(1)}%` },
      { label: 'Health', value: `${(telemetry?.system_health_pct || 0).toFixed(1)}%` },
    ],
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">Reports</h1>
          <p className="text-[12px] text-steel-500">Mission reports and data export</p>
        </div>
        <span className="badge badge-blue">Auto-generated</span>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-3 space-y-1">
          {reports.map((r) => {
            const Icon = r.icon
            return (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r.id)}
                className={`w-full flex items-center gap-2 p-3 rounded-md border text-left transition-colors ${
                  selectedReport === r.id
                    ? 'border-aerospace-400 bg-aerospace-50'
                    : 'border-steel-200 bg-white hover:bg-steel-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${r.color}`} />
                <div className="flex-1">
                  <div className="text-[12px] font-semibold text-navy-900">{r.name}</div>
                  <div className="text-[10px] text-steel-400">{r.desc}</div>
                </div>
                <ChevronRight className="w-3 h-3 text-steel-300" />
              </button>
            )
          })}
        </div>

        <div className="col-span-9 space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="card-title">{selected.name}</div>
                <div className="text-[11px] text-steel-400 mt-0.5">Generated for mission Grand Challenge 2026</div>
              </div>
              <div className="flex items-center gap-2">
                <a href="http://localhost:8000/api/export/pdf" download="Mission_Summary_Report.pdf" className="btn btn-sm">
                  <Download className="w-3 h-3" />
                  PDF
                </a>
                <a href="http://localhost:8000/api/export/excel" download="Mission_10h40m_Telemetry.xlsx" className="btn btn-sm">
                  <FileSpreadsheet className="w-3 h-3" />
                  Excel
                </a>
                <a href="http://localhost:8000/api/export/csv" download="Mission_10h40m_Telemetry.csv" className="btn btn-sm">
                  <FileType className="w-3 h-3" />
                  CSV
                </a>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Parameter</th>
                  <th className="table-header">Value</th>
                </tr>
              </thead>
              <tbody>
                {summary[selected.id as keyof typeof summary].map((row) => (
                  <tr key={row.label}>
                    <td className="table-cell">{row.label}</td>
                    <td className="table-cell-mono">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-4">
            <div className="card-title mb-3">Report Preview</div>
            <div className="rounded-md bg-steel-50 border border-steel-200 p-6 min-h-32">
              <div className="text-center mb-4">
                <div className="text-[12px] text-steel-400 uppercase tracking-wider">APEMS GCS</div>
                <div className="text-lg font-semibold text-navy-900 mt-1">{selected.name}</div>
                <div className="text-[11px] text-steel-400">HAL Hybrid-Electric UAV - Grand Challenge 2026</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {summary[selected.id as keyof typeof summary].map((row) => (
                  <div key={row.label} className="flex justify-between p-2 border-b border-steel-200">
                    <span className="text-[12px] text-steel-500">{row.label}</span>
                    <span className="font-mono text-[12px] font-semibold text-navy-900">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="text-center mt-6 text-[10px] text-steel-400">
                Confidential - For authorized ground control personnel only
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
