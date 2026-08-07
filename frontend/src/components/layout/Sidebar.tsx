import {
  LayoutDashboard,
  Timer,
  Zap,
  Cog,
  Gauge,
  Battery,
  Fuel,
  Flame,
  Plane,
  Compass,
  Brain,
  Cpu,
  Activity,
  FileText,
  FileSpreadsheet,
  Settings,
} from 'lucide-react'
import type { PageId } from '../../App'

interface SidebarProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
}

const NAV_ITEMS: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'mission', label: 'Mission Control', icon: Timer },
  { id: 'energy', label: 'Energy Management', icon: Zap },
  { id: 'propulsion', label: 'Propulsion System', icon: Cog },
  { id: 'power', label: 'Power Distribution', icon: Gauge },
  { id: 'battery', label: 'Battery System', icon: Battery },
  { id: 'fuel-cell', label: 'Fuel Cell', icon: Fuel },
  { id: 'engine', label: 'Engine', icon: Flame },
  { id: 'aircraft', label: 'Aircraft Performance', icon: Plane },
  { id: 'flight-dynamics', label: 'Flight Dynamics', icon: Compass },
  { id: 'optimization', label: 'Optimization', icon: Brain },
  { id: 'ai', label: 'AI Prediction', icon: Cpu },
  { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'telemetry-dataset', label: 'Telemetry Dataset', icon: FileSpreadsheet },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 bg-navy-900 text-white flex flex-col flex-shrink-0">
      <div className="flex-1 overflow-y-auto py-3 px-2">
        <div className="text-[10px] font-semibold text-navy-400 uppercase tracking-wider px-3 mb-2">
          Mission Systems
        </div>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activePage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-md transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-navy-800 text-white border-l-2 border-aerospace-400'
                    : 'text-navy-300 hover:text-white hover:bg-navy-800 border-l-2 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
      <div className="p-3 border-t border-navy-800">
        <div className="text-[10px] text-navy-400 uppercase tracking-wider mb-1">System</div>
        <div className="text-[11px] text-navy-300">APEMS v3.0</div>
        <div className="text-[11px] text-navy-300">Build 2026.08</div>
      </div>
    </aside>
  )
}