import { useState, useEffect, useRef } from 'react'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { StatusBar } from './components/layout/StatusBar'
import { OverviewPage } from './components/overview/OverviewPage'
import { MissionControlPage } from './components/mission/MissionControlPage'
import { EnergyManagementPage } from './components/energy/EnergyManagementPage'
import { PropulsionSystemPage } from './components/propulsion/PropulsionSystemPage'
import { PowerDistributionPage } from './components/power/PowerDistributionPage'
import { BatterySystemPage } from './components/battery/BatterySystemPage'
import { FuelCellPage } from './components/fuel-cell/FuelCellPage'
import { EnginePage } from './components/engine/EnginePage'
import { AircraftPerformancePage } from './components/aircraft/AircraftPerformancePage'
import { FlightDynamicsPage } from './components/flight-dynamics/FlightDynamicsPage'
import { OptimizationPage } from './components/optimization/OptimizationPage'
import { AIPredictionPage } from './components/ai/AIPredictionPage'
import { DiagnosticsPage } from './components/diagnostics/DiagnosticsPage'
import { ReportsPage } from './components/reports/ReportsPage'
import { TelemetryDatasetPage } from './components/dataset/TelemetryDatasetPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { connectWebSocket } from './lib/api'
import type { TelemetryFrame } from './types'

export type PageId =
  | 'overview'
  | 'mission'
  | 'energy'
  | 'propulsion'
  | 'power'
  | 'battery'
  | 'fuel-cell'
  | 'engine'
  | 'aircraft'
  | 'flight-dynamics'
  | 'optimization'
  | 'ai'
  | 'diagnostics'
  | 'reports'
  | 'telemetry-dataset'
  | 'settings'

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('overview')
  const [telemetry, setTelemetry] = useState<TelemetryFrame | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [missionTime, setMissionTime] = useState(0)
  const [playSpeed, setPlaySpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(true)
  const [fontScale, setFontScale] = useState(1)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = connectWebSocket((data) => {
      if (data.type === 'telemetry') {
        setTelemetry(data.frame)
        // Use the actual mission time from the backend frame
        setMissionTime(data.frame.t_min ?? data.time_min ?? 0)
      } else if (data.type === 'status') {
        setWsConnected(data.connected)
      } else if (data.type === 'time') {
        setMissionTime(data.time_min)
      }
    })
    wsRef.current = ws
    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    return () => ws.close()
  }, [])

  // Send playback control to backend when play state or speed changes
  useEffect(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({
      type: 'playback',
      is_playing: isPlaying,
      speed: playSpeed,
    }))
  }, [isPlaying, playSpeed])

  // Apply global font size scaling
  useEffect(() => {
    document.documentElement.style.fontSize = `${14 * fontScale}px`
  }, [fontScale])

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage telemetry={telemetry} />
      case 'mission':
        return (
          <MissionControlPage
            telemetry={telemetry}
            missionTime={missionTime}
            playSpeed={playSpeed}
            isPlaying={isPlaying}
            onPlayToggle={() => setIsPlaying(!isPlaying)}
            onSpeedChange={setPlaySpeed}
          />
        )
      case 'energy':
        return <EnergyManagementPage telemetry={telemetry} />
      case 'propulsion':
        return <PropulsionSystemPage telemetry={telemetry} />
      case 'power':
        return <PowerDistributionPage telemetry={telemetry} />
      case 'battery':
        return <BatterySystemPage telemetry={telemetry} />
      case 'fuel-cell':
        return <FuelCellPage telemetry={telemetry} />
      case 'engine':
        return <EnginePage telemetry={telemetry} />
      case 'aircraft':
        return <AircraftPerformancePage telemetry={telemetry} />
      case 'flight-dynamics':
        return <FlightDynamicsPage telemetry={telemetry} />
      case 'optimization':
        return <OptimizationPage telemetry={telemetry} />
      case 'ai':
        return <AIPredictionPage telemetry={telemetry} />
      case 'diagnostics':
        return <DiagnosticsPage telemetry={telemetry} />
      case 'reports':
        return <ReportsPage telemetry={telemetry} />
      case 'telemetry-dataset':
        return (
          <TelemetryDatasetPage
            telemetry={telemetry}
            missionTime={missionTime}
            playSpeed={playSpeed}
            isPlaying={isPlaying}
            onPlayToggle={() => setIsPlaying(!isPlaying)}
            onSpeedChange={setPlaySpeed}
          />
        )
      case 'settings':
        return <SettingsPage telemetry={telemetry} />
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-navy-950">
      <Header
        wsConnected={wsConnected}
        telemetry={telemetry}
        missionTime={missionTime}
        playSpeed={playSpeed}
        isPlaying={isPlaying}
        onPlayToggle={() => setIsPlaying(!isPlaying)}
        onSpeedChange={setPlaySpeed}
        fontScale={fontScale}
        onFontScaleChange={setFontScale}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <main className="flex-1 overflow-y-auto bg-steel-50 dark:bg-navy-950">
          <div className="p-4">{renderPage()}</div>
        </main>
      </div>
      <StatusBar telemetry={telemetry} missionTime={missionTime} />
    </div>
  )
}