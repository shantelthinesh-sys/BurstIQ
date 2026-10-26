import { useState } from 'react';
import {
  LayoutDashboard,
  Activity,
  Radar,
  FlaskConical,
  BarChart3,
  GitCompareArrows,
  History,
  FileText,
  Info,
  ChevronLeft,
  ChevronRight,
  Network,
} from 'lucide-react';
import type { PageId } from '@/types';

const NAV: { id: PageId; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'simulator', label: 'Live Traffic Simulator', icon: Activity },
  { id: 'detection', label: 'Burst Detection', icon: Radar },
  { id: 'lab', label: 'Poisson Probability Lab', icon: FlaskConical },
  { id: 'analytics', label: 'Network Analytics', icon: BarChart3 },
  { id: 'whatif', label: 'What-If Analysis', icon: GitCompareArrows },
  { id: 'history', label: 'Detection History', icon: History },
  { id: 'reports', label: 'Reports & Export', icon: FileText },
  { id: 'about', label: 'About the Project', icon: Info },
];

export function Sidebar({
  page,
  onNavigate,
  collapsed,
  onToggle,
}: {
  page: PageId;
  onNavigate: (p: PageId) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const expanded = !collapsed || hovered;
  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`fixed lg:static z-40 top-0 left-0 h-full transition-all duration-200 ${
        expanded ? 'w-60' : 'w-16'
      } bg-navy-900/95 border-r border-white/5 flex flex-col shrink-0`}
    >
      <div className="h-16 flex items-center gap-2 px-4 border-b border-white/5 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-electric-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-glow">
          <Network size={18} className="text-navy-950" />
        </div>
        {expanded && (
          <div className="overflow-hidden">
            <div className="text-sm font-semibold text-slate-100 leading-tight whitespace-nowrap">
              Traffic Burst
            </div>
            <div className="text-[10px] text-electric-400 whitespace-nowrap">Poisson Detection</div>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors group relative ${
                active ? 'text-electric-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-0 h-full w-0.5 bg-electric-500" />
              )}
              <Icon size={18} className="shrink-0" />
              {expanded && <span className="whitespace-nowrap">{item.label}</span>}
              {!expanded && !hovered && (
                <span className="absolute left-full ml-2 px-2 py-1 rounded bg-navy-800 text-xs text-slate-200 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-white/10">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <button
        onClick={onToggle}
        className="hidden lg:flex items-center justify-center gap-1 py-2 text-xs text-slate-500 hover:text-slate-300 border-t border-white/5"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        {expanded ? 'Collapse' : ''}
      </button>
    </aside>
  );
}
