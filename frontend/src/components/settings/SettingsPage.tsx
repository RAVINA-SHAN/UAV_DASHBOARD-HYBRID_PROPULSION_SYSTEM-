import { useState } from 'react'
import type { TelemetryFrame } from '../../types'
import { PageSection } from '../common/EquationBox'

interface SettingsPageProps {
  telemetry: TelemetryFrame | null
}

/** Settings - mission parameters, playback, theme, units, telemetry frequency,
 * simulation, export settings, and user profile. */
export function SettingsPage({ telemetry }: SettingsPageProps) {
  const [missionParams, setMissionParams] = useState({
    missionName: 'Grand Challenge 2026',
    aircraftId: 'HE-UAV-01',
    maxAltitude: 4000,
    cruiseSpeed: 45,
    startTime: '06:30',
    landingTime: '10:40',
  })

  const [playback, setPlayback] = useState({ speed: 1, loop: true, seekEnabled: true })
  const [theme, setTheme] = useState('light')
  const [units, setUnits] = useState('metric')
  const [telemetryFreq, setTelemetryFreq] = useState(10)
  const [simSettings, setSimSettings] = useState({
    enablePhysics: true,
    enableML: true,
    enableOptimizer: true,
    enableDiagnostics: true,
  })
  const [exportSettings, setExportSettings] = useState({
    pdfHeader: true,
    includeCharts: true,
    includeRawData: false,
    autoRefresh: true,
  })
  const [profile, setProfile] = useState({
    name: 'Mission Commander',
    callsign: 'GC-26-COMMAND',
    organization: 'HAL Aerospace',
    role: 'Ground Control Operator',
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-steel-600">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-steel-200'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-navy-900">Settings</h1>
          <p className="text-[12px] text-steel-500">Configuration and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="badge badge-green">Settings Saved</span>}
          <button className="btn btn-sm btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-6 space-y-3">
          <PageSection title="Mission Parameters" subtitle="Mission configuration">
            <div className="space-y-3">
              <div>
                <label className="telemetry-label">Mission Name</label>
                <input className="input w-full mt-1" value={missionParams.missionName} onChange={(e) => setMissionParams({ ...missionParams, missionName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="telemetry-label">Aircraft ID</label>
                  <input className="input w-full mt-1" value={missionParams.aircraftId} onChange={(e) => setMissionParams({ ...missionParams, aircraftId: e.target.value })} />
                </div>
                <div>
                  <label className="telemetry-label">Max Altitude (m)</label>
                  <input type="number" className="input w-full mt-1" value={missionParams.maxAltitude} onChange={(e) => setMissionParams({ ...missionParams, maxAltitude: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="telemetry-label">Cruise Speed (m/s)</label>
                  <input type="number" className="input w-full mt-1" value={missionParams.cruiseSpeed} onChange={(e) => setMissionParams({ ...missionParams, cruiseSpeed: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="telemetry-label">Start Time</label>
                  <input type="time" className="input w-full mt-1" value={missionParams.startTime} onChange={(e) => setMissionParams({ ...missionParams, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="telemetry-label">Landing Time</label>
                  <input type="time" className="input w-full mt-1" value={missionParams.landingTime} onChange={(e) => setMissionParams({ ...missionParams, landingTime: e.target.value })} />
                </div>
              </div>
            </div>
          </PageSection>

          <PageSection title="Playback" subtitle="Mission time playback">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[12px] text-steel-600">Default Speed</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 5, 10, 30].map((s) => (
                    <button
                      key={s}
                      onClick={() => setPlayback({ ...playback, speed: s })}
                      className={`px-2 py-1 text-[10px] font-mono rounded-md ${playback.speed === s ? 'bg-aerospace-500 text-white' : 'bg-steel-50 text-steel-600 border border-steel-200'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
              <Toggle label="Loop playback" value={playback.loop} onChange={(v) => setPlayback({ ...playback, loop: v })} />
              <Toggle label="Enable seek bar" value={playback.seekEnabled} onChange={(v) => setPlayback({ ...playback, seekEnabled: v })} />
            </div>
          </PageSection>
        </div>

        <div className="col-span-6 space-y-3">
          <PageSection title="Interface" subtitle="Display preferences">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[12px] text-steel-600">Theme</span>
                <select className="select" value={theme} onChange={(e) => setTheme(e.target.value)}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[12px] text-steel-600">Units</span>
                <select className="select" value={units} onChange={(e) => setUnits(e.target.value)}>
                  <option value="metric">Metric (SI)</option>
                  <option value="imperial">Imperial</option>
                  <option value="aviation">Aviation</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[12px] text-steel-600">Telemetry Frequency</span>
                <select className="select" value={telemetryFreq} onChange={(e) => setTelemetryFreq(Number(e.target.value))}>
                  <option value={1}>1 Hz</option>
                  <option value={5}>5 Hz</option>
                  <option value={10}>10 Hz</option>
                  <option value={20}>20 Hz</option>
                  <option value={50}>50 Hz</option>
                </select>
              </div>
            </div>
          </PageSection>

          <PageSection title="Simulation" subtitle="Backend simulation modules">
            <div className="space-y-2">
              <Toggle label="Physics engine" value={simSettings.enablePhysics} onChange={(v) => setSimSettings({ ...simSettings, enablePhysics: v })} />
              <Toggle label="ML prediction" value={simSettings.enableML} onChange={(v) => setSimSettings({ ...simSettings, enableML: v })} />
              <Toggle label="Optimizer" value={simSettings.enableOptimizer} onChange={(v) => setSimSettings({ ...simSettings, enableOptimizer: v })} />
              <Toggle label="Diagnostics" value={simSettings.enableDiagnostics} onChange={(v) => setSimSettings({ ...simSettings, enableDiagnostics: v })} />
            </div>
          </PageSection>

          <PageSection title="Export" subtitle="Report export options">
            <div className="space-y-2">
              <Toggle label="Include header" value={exportSettings.pdfHeader} onChange={(v) => setExportSettings({ ...exportSettings, pdfHeader: v })} />
              <Toggle label="Include charts" value={exportSettings.includeCharts} onChange={(v) => setExportSettings({ ...exportSettings, includeCharts: v })} />
              <Toggle label="Include raw data" value={exportSettings.includeRawData} onChange={(v) => setExportSettings({ ...exportSettings, includeRawData: v })} />
              <Toggle label="Auto-refresh reports" value={exportSettings.autoRefresh} onChange={(v) => setExportSettings({ ...exportSettings, autoRefresh: v })} />
            </div>
          </PageSection>

          <PageSection title="User Profile" subtitle="Operator identification">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'name', label: 'Name' },
                { key: 'callsign', label: 'Callsign' },
                { key: 'organization', label: 'Organization' },
                { key: 'role', label: 'Role' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="telemetry-label">{field.label}</label>
                  <input
                    className="input w-full mt-1"
                    value={profile[field.key as keyof typeof profile]}
                    onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </PageSection>
        </div>
      </div>
    </div>
  )
}
