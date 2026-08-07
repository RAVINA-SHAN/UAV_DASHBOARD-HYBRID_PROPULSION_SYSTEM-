import { Wifi, WifiOff, Play, Pause, Type, Minus, Plus } from 'lucide-react'
import type { TelemetryFrame } from '../../types'

interface HeaderProps {
  wsConnected: boolean
  telemetry: TelemetryFrame | null
  missionTime: number
  playSpeed: number
  isPlaying: boolean
  onPlayToggle: () => void
  onSpeedChange: (speed: number) => void
  fontScale: number
  onFontScaleChange: (scale: number) => void
}

const SPEEDS = [1, 2, 3, 5, 10, 25, 50, 75, 100, 150, 200, 250]

function formatTime(min: number): string {
  const totalSec = Math.max(0, Math.min(38400, Math.floor(min * 60)))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function Header({
  wsConnected,
  telemetry,
  missionTime,
  playSpeed,
  isPlaying,
  onPlayToggle,
  onSpeedChange,
  fontScale,
  onFontScaleChange,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between bg-navy-900 text-white px-4 py-2.5 shadow-header z-20">
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-aerospace-500">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-bold tracking-wide">APEMS GCS</div>
          <div className="text-[10px] text-navy-300 tracking-wider uppercase">
            HAL Hybrid-Electric UAV · APEMS GCS
          </div>
        </div>
      </div>

      {/* Center: Mission Info */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-[10px] text-navy-300 uppercase tracking-wider">Mission</div>
          <div className="text-[13px] font-semibold">Grand Challenge 2026</div>
        </div>
        <div className="w-px h-8 bg-navy-700" />
        <div className="text-center">
          <div className="text-[10px] text-navy-300 uppercase tracking-wider">Aircraft</div>
          <div className="text-[13px] font-semibold">HE-UAV-01</div>
        </div>
        <div className="w-px h-8 bg-navy-700" />
        <div className="text-center">
          <div className="text-[10px] text-navy-300 uppercase tracking-wider">Status</div>
          <div className="flex items-center gap-1.5 text-[13px] font-semibold">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {wsConnected ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Font size control */}
        <div className="flex items-center gap-1 bg-navy-800 rounded-md px-2 py-1" title="Text size">
          <Type className="w-3 h-3 text-navy-300" />
          <button
            onClick={() => onFontScaleChange(Math.max(0.8, fontScale - 0.1))}
            className="p-0.5 rounded hover:bg-navy-700"
            title="Decrease text size"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="font-mono text-[10px] text-navy-300 w-8 text-center">
            {Math.round(fontScale * 100)}%
          </span>
          <button
            onClick={() => onFontScaleChange(Math.min(1.6, fontScale + 0.1))}
            className="p-0.5 rounded hover:bg-navy-700"
            title="Increase text size"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Mission clock */}
        <div className="flex items-center gap-2 bg-navy-800 rounded-md px-3 py-1.5" title="Mission Time">
          <span className="font-mono text-[13px] font-semibold text-aerospace-300">
            {formatTime(missionTime)}
          </span>
          <span className="text-[10px] text-navy-300">/ 10:40:00</span>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-1 bg-navy-800 rounded-md px-2 py-1 overflow-x-auto max-w-[280px]">
          <button
            onClick={onPlayToggle}
            className="p-1 rounded hover:bg-navy-700 transition-colors flex-shrink-0"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <div className="w-px h-4 bg-navy-700 mx-1 flex-shrink-0" />
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors flex-shrink-0 ${
                playSpeed === s
                  ? 'bg-aerospace-500 text-white font-bold'
                  : 'text-navy-300 hover:text-white hover:bg-navy-700'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-1.5 text-[11px] text-navy-300">
          {wsConnected ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
          <span>{wsConnected ? 'Telemetry' : 'No Signal'}</span>
        </div>
      </div>
    </header>
  )
}
