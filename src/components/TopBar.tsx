import { Menu, Pause, Play, RotateCcw, Clock, Activity } from 'lucide-react';
import { SimulatedBadge } from './ui';

export function TopBar({
  running,
  onToggleRun,
  onReset,
  simTime,
  mobileMenu,
  onMobileMenu,
}: {
  running: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  simTime: number;
  mobileMenu: boolean;
  onMobileMenu: () => void;
}) {
  return (
    <header className="h-16 shrink-0 border-b border-white/5 bg-navy-900/80 backdrop-blur-md flex items-center justify-between px-3 sm:px-5 gap-3 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenu}
          className="lg:hidden btn-ghost !px-2 !py-2"
          aria-label="Menu"
        >
          <Menu size={18} />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <Activity size={14} className="text-accent-green" />
          <span className="text-slate-300">Network:</span>
          <span className="chip border border-accent-green/30 bg-accent-green/10 text-accent-green">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulseSoft" />
            ONLINE
          </span>
        </div>
        <SimulatedBadge />
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Clock size={14} className="text-electric-400" />
          <span>Sim T+{simTime.toFixed(0)}s</span>
        </div>
        <button
          onClick={onToggleRun}
          className={running ? 'btn-ghost' : 'btn-primary'}
          aria-label={running ? 'Pause' : 'Resume'}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
          <span className="hidden sm:inline">{running ? 'Pause' : 'Resume'}</span>
        </button>
        <button onClick={onReset} className="btn-ghost" aria-label="Reset">
          <RotateCcw size={16} />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
}
