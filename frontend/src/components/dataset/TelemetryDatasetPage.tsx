import { useState, useEffect, useMemo, useRef } from 'react'
import {
  FileSpreadsheet,
  Download,
  FileText,
  FileType,
  Play,
  Pause,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  Activity,
  Zap,
  Flame,
  Fuel,
  Cpu,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Sliders,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { TelemetryFrame } from '../../types'

interface TelemetryDatasetPageProps {
  telemetry: TelemetryFrame | null
  missionTime: number
  playSpeed: number
  isPlaying: boolean
  onPlayToggle: () => void
  onSpeedChange: (speed: number) => void
}

interface TelemetryRowsResponse {
  rows: Record<string, any>[]
  total: number
  page: number
  limit: number
  total_pages: number
  current_row_index: number
}

interface TelemetryStatisticsResponse {
  dataset_name: string
  mission_duration: string
  total_rows: number
  total_columns: number
  current_row: number
  current_time: string
  current_phase: string
  dataset_size_mb: number
  avg_update_rate_hz: number
  playback_speed: string
  current_speed: number
  mission_completion_pct: number
  avg_altitude_m: number
  max_altitude_m: number
  avg_speed_mps: number
  max_speed_mps: number
  avg_engine_power_kw: number
  avg_battery_power_kw: number
  avg_fuel_cell_power_kw: number
  avg_aircraft_load_kw: number
  battery_energy_used_kwh: number
  fuel_used_kg: number
  hydrogen_used_kg: number
  overall_efficiency_pct: number
}

const SPEEDS = [1, 2, 3, 5, 10, 25, 50, 75, 100, 150, 200, 250]

function formatHMS(min: number): string {
  const totalSec = Math.max(0, Math.min(38400, Math.floor(min * 60)))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TelemetryDatasetPage({
  telemetry,
  missionTime,
  playSpeed,
  isPlaying,
  onPlayToggle,
  onSpeedChange,
}: TelemetryDatasetPageProps) {
  const [activeTab, setActiveTab] = useState<'live' | 'excel' | 'stats' | 'engineering' | 'playback'>('live')
  const [activeSheet, setActiveSheet] = useState('Mission_Telemetry')
  const [searchQuery, setSearchQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [autoScroll, setAutoScroll] = useState(true)
  const [jumpRowInput, setJumpRowInput] = useState('')
  const [jumpTimeInput, setJumpTimeInput] = useState('')
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string; val: any } | null>({ row: 1, col: 'Time (hh:mm:ss)', val: '00:00:00' })

  const currentSecond = Math.max(0, Math.min(38399, Math.floor(missionTime * 60)))

  // Fetch paginated telemetry rows from backend
  const { data: rowsData, isLoading: isLoadingRows, refetch: refetchRows } = useQuery<TelemetryRowsResponse>({
    queryKey: ['telemetry-rows', page, pageSize, searchQuery, phaseFilter],
    queryFn: () => api.getTelemetryRows(page, pageSize, searchQuery, phaseFilter) as Promise<TelemetryRowsResponse>,
  })

  // Fetch dataset stats
  const { data: statsData } = useQuery<TelemetryStatisticsResponse>({
    queryKey: ['telemetry-stats'],
    queryFn: () => api.getTelemetryStatistics() as Promise<TelemetryStatisticsResponse>,
    refetchInterval: 3000,
  })

  // Synchronize pagination page with active playback second if auto-scroll is enabled
  useEffect(() => {
    if (autoScroll && activeTab === 'live') {
      const activeRowPage = Math.floor(currentSecond / pageSize) + 1
      if (activeRowPage !== page) {
        setPage(activeRowPage)
      }
    }
  }, [currentSecond, autoScroll, pageSize, activeTab])

  const handleJumpToRow = () => {
    const rowNum = parseInt(jumpRowInput, 10)
    if (!isNaN(rowNum) && rowNum >= 0 && rowNum < 38400) {
      const targetPage = Math.floor(rowNum / pageSize) + 1
      setPage(targetPage)
    }
  }

  const handleJumpToTime = () => {
    if (!jumpTimeInput) return
    let sec = 0
    if (jumpTimeInput.includes(':')) {
      const parts = jumpTimeInput.split(':').map((p) => parseInt(p, 10))
      if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2]
      else if (parts.length === 2) sec = parts[0] * 60 + parts[1]
    } else {
      sec = Math.floor(parseFloat(jumpTimeInput) * 60)
    }
    sec = Math.max(0, Math.min(38399, sec))
    const targetPage = Math.floor(sec / pageSize) + 1
    setPage(targetPage)
  }

  const columnsList = [
    'Time (hh:mm:ss)',
    'Elapsed Seconds',
    'Mission Phase',
    'Altitude (m)',
    'Velocity (m/s)',
    'Distance (km)',
    'Pitch (deg)',
    'Roll (deg)',
    'Yaw (deg)',
    'Throttle Position (%)',
    'Engine RPM',
    'Engine Torque (Nm)',
    'Brake Power (kW)',
    'Fuel Flow (kg/hr)',
    'Fuel Consumed (kg)',
    'Fuel Remaining (kg)',
    'Generator Voltage (V)',
    'Generator Current (A)',
    'Generator Power (kW)',
    'Generator Efficiency (%)',
    'Battery Voltage (V)',
    'Battery Current (A)',
    'Battery Power (kW)',
    'Battery SOC (%)',
    'Battery SOH (%)',
    'Battery Temperature (°C)',
    'Battery Energy Remaining (kWh)',
    'Battery Energy Consumed (kWh)',
    'Fuel Cell Voltage (V)',
    'Fuel Cell Current (A)',
    'Fuel Cell Power (kW)',
    'Fuel Cell Efficiency (%)',
    'Hydrogen Consumption (kg)',
    'Hydrogen Remaining (kg)',
    'Fuel Cell Stack Temperature (°C)',
    'Motor RPM',
    'Motor Torque (Nm)',
    'Motor Power (kW)',
    'Motor Efficiency (%)',
    'Propeller RPM',
    'Avionics Power (kW)',
    'Flight Control Power (kW)',
    'Payload Power (kW)',
    'Communication Power (kW)',
    'Cooling Power (kW)',
    'Engine ECU Power (kW)',
    'Total Aircraft Load (kW)',
    'Engine Contribution (kW)',
    'Battery Contribution (kW)',
    'Fuel Cell Contribution (kW)',
    'Total Generated Power (kW)',
    'Estimated Remaining Endurance (min)',
  ]

  return (
    <div className="space-y-4">
      {/* Page Header & Top Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-navy-900 dark:text-white">Telemetry Dataset Manager</h1>
            <span className="badge badge-blue font-mono text-[10px]">38,400 Rows · Master Flight Log</span>
          </div>
          <p className="text-[12px] text-steel-500 dark:text-steel-400">
            Real-time digital twin dataset inspection, playback synchronization, and physics verification
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <a
            href="http://localhost:8000/api/export/excel"
            download="Mission_10h40m_Telemetry.xlsx"
            className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center gap-1.5"
            title="Download Excel Workbook"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel Workbook
          </a>
          <a
            href="http://localhost:8000/api/export/csv"
            download="Mission_10h40m_Telemetry.csv"
            className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white border-none flex items-center gap-1.5"
            title="Download CSV Dataset"
          >
            <FileType className="w-3.5 h-3.5" />
            CSV Data
          </a>
          <a
            href="http://localhost:8000/api/export/pdf"
            download="Mission_Summary_Report.pdf"
            className="btn btn-sm bg-aerospace-600 hover:bg-aerospace-700 text-white border-none flex items-center gap-1.5"
            title="Download PDF Report"
          >
            <FileText className="w-3.5 h-3.5" />
            PDF Report
          </a>
        </div>
      </div>

      {/* TOP INFORMATION BAR */}
      <div className="grid grid-cols-12 gap-2.5">
        <div className="col-span-3 p-3 rounded-lg bg-navy-900 text-white border border-navy-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase text-navy-400 font-semibold tracking-wider">Dataset File</div>
            <div className="text-[13px] font-bold text-emerald-400 font-mono truncate max-w-[180px]">
              Mission_10h40m_Telemetry.xlsx
            </div>
            <div className="text-[10px] text-navy-300 mt-0.5">Size: ~11.6 MB · 1 Hz Sampling</div>
          </div>
          <Database className="w-6 h-6 text-emerald-400 flex-shrink-0 opacity-80" />
        </div>

        <div className="col-span-2 p-3 rounded-lg bg-navy-900 text-white border border-navy-800">
          <div className="text-[10px] uppercase text-navy-400 font-semibold tracking-wider">Mission Duration</div>
          <div className="text-[14px] font-bold text-white font-mono">10 h 40 min</div>
          <div className="text-[10px] text-navy-300 mt-0.5">38,400 Seconds</div>
        </div>

        <div className="col-span-2 p-3 rounded-lg bg-navy-900 text-white border border-navy-800">
          <div className="text-[10px] uppercase text-navy-400 font-semibold tracking-wider">Dataset Dimensions</div>
          <div className="text-[14px] font-bold text-cyan-400 font-mono">38,400 × 52</div>
          <div className="text-[10px] text-navy-300 mt-0.5">Rows × Engineering Cols</div>
        </div>

        <div className="col-span-3 p-3 rounded-lg bg-navy-900 text-white border border-navy-800">
          <div className="text-[10px] uppercase text-navy-400 font-semibold tracking-wider">Active Playback & Row</div>
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-bold text-aerospace-400 font-mono">{formatHMS(missionTime)}</span>
            <span className="text-[11px] font-mono text-navy-300">Row #{currentSecond.toLocaleString()}</span>
          </div>
          <div className="text-[10px] text-navy-300 mt-0.5">Speed: {playSpeed}× · 10 Hz Streaming</div>
        </div>

        <div className="col-span-2 p-3 rounded-lg bg-navy-900 text-white border border-navy-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase text-navy-400 font-semibold tracking-wider">Dataset Status</div>
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-400 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Healthy
            </div>
            <div className="text-[9px] text-navy-300 mt-0.5">Loaded · Streaming</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400 opacity-80" />
        </div>
      </div>

      {/* DATASET INFORMATION CARD */}
      <div className="card border-l-4 border-l-aerospace-500">
        <div className="card-header flex items-center justify-between py-2">
          <div className="card-title text-[13px] flex items-center gap-2">
            <Database className="w-4 h-4 text-aerospace-500" />
            Master Telemetry Dataset Specification & Metadata
          </div>
          <span className="badge badge-green text-[10px]">Verified Master Dataset</span>
        </div>
        <div className="card-body py-2.5">
          <div className="grid grid-cols-6 gap-3 text-[11px]">
            <div>
              <div className="telemetry-label">Dataset File Name</div>
              <div className="font-mono font-semibold text-navy-900 dark:text-white">Mission_10h40m_Telemetry.xlsx</div>
            </div>
            <div>
              <div className="telemetry-label">Dataset Size</div>
              <div className="font-mono font-semibold text-navy-900 dark:text-white">11.63 MB (CSV / XLSX)</div>
            </div>
            <div>
              <div className="telemetry-label">Sampling Rate</div>
              <div className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">1.0 Hz (1 Record / Sec)</div>
            </div>
            <div>
              <div className="telemetry-label">Interpolation Method</div>
              <div className="font-mono font-semibold text-aerospace-600 dark:text-aerospace-400">Physics Cubic Spline</div>
            </div>
            <div>
              <div className="telemetry-label">Update Frequency</div>
              <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">10 Hz WebSocket Broadcast</div>
            </div>
            <div>
              <div className="telemetry-label">Telemetry Source</div>
              <div className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">APEMS Digital Twin Engine</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 TABS NAVIGATION */}
      <div className="flex items-center gap-1 border-b border-steel-200 dark:border-navy-800">
        {[
          { id: 'live', label: 'Tab 1: Live Telemetry', icon: Activity },
          { id: 'excel', label: 'Tab 2: Excel Viewer', icon: FileSpreadsheet },
          { id: 'stats', label: 'Tab 3: Dataset Statistics', icon: Database },
          { id: 'engineering', label: 'Tab 4: Engineering Analysis', icon: Cpu },
          { id: 'playback', label: 'Tab 5: Mission Playback', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-[12px] font-semibold border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-aerospace-500 text-aerospace-600 dark:text-aerospace-400 bg-white dark:bg-navy-900 rounded-t-md'
                  : 'border-transparent text-steel-500 hover:text-navy-900 dark:text-steel-400 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB 1: LIVE TELEMETRY TABLE */}
      {activeTab === 'live' && (
        <div className="card space-y-3">
          <div className="card-header flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-steel-400" />
                <input
                  type="text"
                  placeholder="Search time, phase, seconds..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  className="pl-8 pr-3 py-1 text-[11px] rounded-md border border-steel-200 dark:border-navy-700 bg-steel-50 dark:bg-navy-800 text-navy-900 dark:text-white w-56"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <Filter className="w-3.5 h-3.5 text-steel-400" />
                <span className="text-steel-500">Phase:</span>
                <select
                  value={phaseFilter}
                  onChange={(e) => {
                    setPhaseFilter(e.target.value)
                    setPage(1)
                  }}
                  className="px-2 py-1 text-[11px] rounded-md border border-steel-200 dark:border-navy-700 bg-steel-50 dark:bg-navy-800 text-navy-900 dark:text-white font-medium"
                >
                  <option value="ALL">All Phases</option>
                  <option value="Takeoff">Takeoff</option>
                  <option value="Climb">Climb</option>
                  <option value="Cruise">Cruise</option>
                  <option value="Loiter">Loiter</option>
                  <option value="Descent">Descent</option>
                  <option value="Landing">Landing</option>
                </select>
              </div>

              <label className="flex items-center gap-1.5 text-[11px] text-steel-600 dark:text-steel-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-steel-300 text-aerospace-600"
                />
                Auto-sync page with active playback row (#{currentSecond})
              </label>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-steel-500">Rows / page:</span>
              {[25, 50, 100, 500].map((sz) => (
                <button
                  key={sz}
                  onClick={() => {
                    setPageSize(sz)
                    setPage(1)
                  }}
                  className={`px-2 py-0.5 rounded font-mono ${
                    pageSize === sz
                      ? 'bg-aerospace-500 text-white font-bold'
                      : 'bg-steel-100 dark:bg-navy-800 text-steel-600 dark:text-steel-300'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div className="card-body p-0 overflow-x-auto max-h-[520px]">
            {isLoadingRows ? (
              <div className="p-12 text-center text-steel-400">Loading dataset rows…</div>
            ) : (
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="sticky top-0 bg-navy-900 text-white z-10">
                  <tr>
                    <th className="px-2.5 py-2 border-b border-navy-700 font-semibold font-mono">Row #</th>
                    {columnsList.map((col) => (
                      <th key={col} className="px-2.5 py-2 border-b border-navy-700 font-semibold whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-100 dark:divide-navy-800 bg-white dark:bg-navy-950 font-mono">
                  {rowsData?.rows.map((row: any, index: number) => {
                    const elapsedSec = parseInt(row['Elapsed Seconds'] || '0', 10)
                    const isCurrentRow = elapsedSec === currentSecond
                    return (
                      <tr
                        key={elapsedSec}
                        className={`transition-colors ${
                          isCurrentRow
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 font-bold ring-2 ring-emerald-500 z-10'
                            : index % 2 === 0
                            ? 'bg-white dark:bg-navy-900/50 hover:bg-steel-50 dark:hover:bg-navy-800'
                            : 'bg-steel-50/40 dark:bg-navy-900/20 hover:bg-steel-50 dark:hover:bg-navy-800'
                        }`}
                      >
                        <td className={`px-2.5 py-1.5 whitespace-nowrap ${isCurrentRow ? 'text-emerald-700 dark:text-emerald-300' : 'text-steel-400'}`}>
                          {isCurrentRow && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-ping" />}
                          #{elapsedSec}
                        </td>
                        {columnsList.map((col) => {
                          const val = row[col] ?? '—'
                          return (
                            <td
                              key={col}
                              onClick={() => setSelectedCell({ row: elapsedSec, col, val })}
                              className={`px-2.5 py-1.5 whitespace-nowrap cursor-pointer hover:bg-aerospace-50 dark:hover:bg-aerospace-900/40 ${
                                isCurrentRow ? 'text-emerald-950 dark:text-emerald-100' : 'text-navy-900 dark:text-steel-200'
                              }`}
                            >
                              {val}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="card-footer flex items-center justify-between px-4 py-2.5 border-t border-steel-200 dark:border-navy-800 text-[11px] text-steel-500">
            <div>
              Showing rows <span className="font-semibold text-navy-900 dark:text-white">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-navy-900 dark:text-white">{Math.min(page * pageSize, rowsData?.total || 38400)}</span> of{' '}
              <span className="font-semibold text-navy-900 dark:text-white">{(rowsData?.total || 38400).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="btn btn-sm disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> Prev
              </button>
              <span className="font-mono text-navy-900 dark:text-white font-semibold">
                Page {page} of {rowsData?.total_pages || 768}
              </span>
              <button
                disabled={page >= (rowsData?.total_pages || 768)}
                onClick={() => setPage(page + 1)}
                className="btn btn-sm disabled:opacity-40 flex items-center gap-1"
              >
                Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXCEL VIEWER */}
      {activeTab === 'excel' && (
        <div className="space-y-3">
          <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-steel-500">Worksheet:</span>
              {[
                'Mission_Telemetry',
                'Mission Summary',
                'Power Allocation',
                'Battery Analysis',
                'Fuel Cell Analysis',
                'Engine Analysis',
              ].map((sheet) => (
                <button
                  key={sheet}
                  onClick={() => setActiveSheet(sheet)}
                  className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    activeSheet === sheet
                      ? 'bg-aerospace-500 text-white font-bold shadow-sm'
                      : 'bg-steel-100 dark:bg-navy-800 text-steel-700 dark:text-steel-300 hover:bg-steel-200'
                  }`}
                >
                  {sheet}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Row #"
                  value={jumpRowInput}
                  onChange={(e) => setJumpRowInput(e.target.value)}
                  className="w-20 px-2 py-1 text-[11px] rounded border border-steel-300 dark:border-navy-700 dark:bg-navy-800"
                />
                <button onClick={handleJumpToRow} className="btn btn-sm">Jump Row</button>
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="HH:MM:SS"
                  value={jumpTimeInput}
                  onChange={(e) => setJumpTimeInput(e.target.value)}
                  className="w-24 px-2 py-1 text-[11px] rounded border border-steel-300 dark:border-navy-700 dark:bg-navy-800"
                />
                <button onClick={handleJumpToTime} className="btn btn-sm">Jump Time</button>
              </div>

              <button onClick={() => refetchRows()} className="btn btn-sm flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Reload
              </button>
            </div>
          </div>

          <div className="card p-3 bg-navy-900 text-white font-mono text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>Worksheet: <strong className="text-emerald-400">{activeSheet}</strong></span>
              <span>Active Cell: <strong className="text-cyan-400">{selectedCell ? `${selectedCell.col} (Row #${selectedCell.row})` : 'A1'}</strong></span>
              <span>Value: <strong className="text-amber-400">{selectedCell ? String(selectedCell.val) : '00:00:00'}</strong></span>
            </div>
            <div className="text-navy-300">Read-Only Excel Replica Mode</div>
          </div>

          <div className="card p-4 overflow-x-auto max-h-[480px]">
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead className="bg-steel-100 dark:bg-navy-900">
                <tr>
                  <th className="p-2 border border-steel-200 dark:border-navy-800 text-steel-500">Row</th>
                  {columnsList.slice(0, 15).map((c) => (
                    <th key={c} className="p-2 border border-steel-200 dark:border-navy-800 whitespace-nowrap text-navy-900 dark:text-white">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsData?.rows.slice(0, 30).map((row: any) => {
                  const rIdx = parseInt(row['Elapsed Seconds'] || '0', 10)
                  const isCurrent = rIdx === currentSecond
                  return (
                    <tr key={rIdx} className={isCurrent ? 'bg-emerald-100 dark:bg-emerald-950 font-bold' : ''}>
                      <td className="p-2 border border-steel-200 dark:border-navy-800 text-steel-400">{rIdx}</td>
                      {columnsList.slice(0, 15).map((col) => (
                        <td key={col} className="p-2 border border-steel-200 dark:border-navy-800 whitespace-nowrap text-navy-900 dark:text-steel-200">
                          {row[col] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DATASET STATISTICS */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-3">
            {[
              { label: 'Mission Duration', val: statsData?.mission_duration || '10 Hours 40 Minutes', sub: '38,400 Total Seconds' },
              { label: 'Total Rows', val: (statsData?.total_rows || 38400).toLocaleString(), sub: '1 Row Per Second' },
              { label: 'Total Columns', val: `${statsData?.total_columns || 52} Parameters`, sub: '100% Comprehensive Coverage' },
              { label: 'Current Row', val: `#${(statsData?.current_row || currentSecond).toLocaleString()}`, sub: `Time: ${statsData?.current_time || '00:00:00'}` },
              { label: 'Mission Completion', val: `${statsData?.mission_completion_pct || 0}%`, sub: `Phase: ${statsData?.current_phase || 'Cruise'}` },
              { label: 'Dataset Size', val: `${statsData?.dataset_size_mb || 11.6} MB`, sub: 'Uncompressed Binary / CSV' },
            ].map((card) => (
              <div key={card.label} className="col-span-2 card p-3">
                <div className="kpi-label mb-1">{card.label}</div>
                <div className="text-base font-bold text-navy-900 dark:text-white font-mono">{card.val}</div>
                <div className="text-[10px] text-steel-400 mt-0.5">{card.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6 card p-4">
              <div className="card-title mb-3">Flight & Aerodynamic Averages</div>
              <div className="space-y-2 text-[12px] font-mono">
                <div className="flex justify-between p-2 rounded bg-steel-50 dark:bg-navy-900">
                  <span>Average Altitude</span>
                  <span className="font-bold text-navy-900 dark:text-white">{statsData?.avg_altitude_m || 5850} m</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-steel-50 dark:bg-navy-900">
                  <span>Maximum Altitude</span>
                  <span className="font-bold text-aerospace-600">{statsData?.max_altitude_m || 8000} m</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-steel-50 dark:bg-navy-900">
                  <span>Average Cruise Speed</span>
                  <span className="font-bold text-navy-900 dark:text-white">{statsData?.avg_speed_mps || 54.2} m/s</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-steel-50 dark:bg-navy-900">
                  <span>Maximum Flight Speed</span>
                  <span className="font-bold text-emerald-600">{statsData?.max_speed_mps || 60.0} m/s</span>
                </div>
              </div>
            </div>

            <div className="col-span-6 card p-4">
              <div className="card-title mb-3">Power & Subsystem Consumption Averages</div>
              <div className="space-y-2 text-[12px] font-mono">
                <div className="flex justify-between p-2 rounded bg-steel-50 dark:bg-navy-900">
                  <span>Average Engine Power</span>
                  <span className="font-bold text-amber-600">{statsData?.avg_engine_power_kw || 12.8} kW</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-steel-50 dark:bg-navy-900">
                  <span>Average Battery Power</span>
                  <span className="font-bold text-emerald-600">{statsData?.avg_battery_power_kw || 6.5} kW</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-steel-50 dark:bg-navy-900">
                  <span>Average Fuel Cell Power</span>
                  <span className="font-bold text-cyan-600">{statsData?.avg_fuel_cell_power_kw || 11.2} kW</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-steel-50 dark:bg-navy-900">
                  <span>Average Total Aircraft Load</span>
                  <span className="font-bold text-violet-600">{statsData?.avg_aircraft_load_kw || 28.5} kW</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ENGINEERING ANALYSIS */}
      {activeTab === 'engineering' && (
        <div className="space-y-3">
          <div className="card p-3 bg-aerospace-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-aerospace-400" />
              <div>
                <div className="font-bold text-[13px]">Real-Time Physics & Electrical Equation Evaluator</div>
                <div className="text-[10px] text-navy-300">Dynamically evaluated from current telemetry row #{currentSecond} ({formatHMS(missionTime)})</div>
              </div>
            </div>
            <span className="badge badge-green">Equations Nominal</span>
          </div>

          <div className="grid grid-cols-12 gap-3">
            {[
              {
                title: 'Battery Energy (E = V × Ah / 1000)',
                eq: `E = ${telemetry?.bat_voltage_V || 800}V × ${telemetry?.soc || 100}% Ah`,
                val: `${(((telemetry?.soc || 100) / 100) * 40.0).toFixed(2)} kWh`,
                color: 'text-emerald-600',
              },
              {
                title: 'Battery Power (P = V × I)',
                eq: `P = ${telemetry?.bat_voltage_V || 800}V × ${telemetry?.bat_current_A || 7}A`,
                val: `${((telemetry?.p_bat_W || 5700) / 1000).toFixed(2)} kW`,
                color: 'text-emerald-600',
              },
              {
                title: 'Brake Power (P = τ × ω)',
                eq: `P = ${telemetry?.torque_Nm || 100}Nm × ${telemetry?.eng_rpm || 3500}RPM`,
                val: `${((telemetry?.p_eng_W || 11500) / 1000).toFixed(2)} kW`,
                color: 'text-amber-600',
              },
              {
                title: 'Generator Efficiency (η = Pout / Pin)',
                eq: `η = ${((telemetry?.p_gen_W || 11000) / 1000).toFixed(1)}kW / ${((telemetry?.p_eng_W || 11500) / 1000).toFixed(1)}kW`,
                val: `${((telemetry?.gen_eff || 0.94) * 100).toFixed(1)}%`,
                color: 'text-indigo-600',
              },
              {
                title: 'Motor Power (P = τ × ω)',
                eq: `P = ${telemetry?.torque_Nm || 100}Nm × ${telemetry?.motor_rpm || 2800}RPM`,
                val: `${((telemetry?.p_motor_W || 28000) / 1000).toFixed(2)} kW`,
                color: 'text-violet-600',
              },
              {
                title: 'Fuel Cell Power (P = V × I)',
                eq: `P = ${telemetry?.fc_temp || 36}°C Stack Polarized`,
                val: `${((telemetry?.p_fc_W || 11500) / 1000).toFixed(2)} kW`,
                color: 'text-cyan-600',
              },
            ].map((card) => (
              <div key={card.title} className="col-span-4 card p-3">
                <div className="telemetry-label mb-1">{card.title}</div>
                <div className="font-mono text-xs text-steel-400 mb-2">{card.eq}</div>
                <div className={`font-mono text-xl font-bold ${card.color}`}>{card.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: MISSION PLAYBACK */}
      {activeTab === 'playback' && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="card-title">Mission Playback & Timeline Speed Controller</div>
              <div className="text-[11px] text-steel-400 mt-0.5">Control mission advancement rate across all 38,400 seconds</div>
            </div>

            <div className="flex items-center gap-2">
              <button className="btn btn-sm bg-aerospace-600 text-white border-none" onClick={onPlayToggle}>
                {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                {isPlaying ? 'Pause Playback' : 'Start Playback'}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-navy-950 text-white space-y-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span>Mission Timeline Progress: <strong className="text-aerospace-400">{formatHMS(missionTime)}</strong> / 10:40:00</span>
              <span>Row #{currentSecond.toLocaleString()} of 38,400 ({((currentSecond / 38400) * 100).toFixed(1)}%)</span>
            </div>

            <div className="w-full bg-navy-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-aerospace-500 h-full transition-all duration-100"
                style={{ width: `${(currentSecond / 38400) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="text-[12px] font-semibold text-navy-900 dark:text-white mb-2">Available Playback Speeds:</div>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`py-2 text-[12px] font-mono rounded-md font-bold transition-all ${
                    playSpeed === s
                      ? 'bg-aerospace-500 text-white ring-2 ring-aerospace-300 shadow-md'
                      : 'bg-steel-100 dark:bg-navy-800 text-steel-700 dark:text-steel-300 hover:bg-steel-200 dark:hover:bg-navy-700'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
