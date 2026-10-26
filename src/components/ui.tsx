import type { Classification } from '@/types';

export function StatusBadge({ status, size = 'md' }: { status: Classification; size?: 'sm' | 'md' }) {
  const map: Record<Classification, { label: string; cls: string; dot: string }> = {
    NORMAL: {
      label: 'NORMAL',
      cls: 'bg-accent-green/15 text-accent-green border-accent-green/30',
      dot: 'bg-accent-green',
    },
    ELEVATED: {
      label: 'ELEVATED',
      cls: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
      dot: 'bg-accent-amber',
    },
    BURST: {
      label: 'BURST DETECTED',
      cls: 'bg-accent-red/15 text-accent-red border-accent-red/30',
      dot: 'bg-accent-red',
    },
  };
  const s = map[status];
  const sz = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`chip border ${s.cls} ${sz}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === 'BURST' ? 'animate-pulseSoft' : ''}`} />
      {s.label}
    </span>
  );
}

export function SeverityPill({ score, label }: { score: number; label: string }) {
  const color =
    score >= 75
      ? 'text-accent-red bg-accent-red/15 border-accent-red/30'
      : score >= 50
        ? 'text-accent-amber bg-accent-amber/15 border-accent-amber/30'
        : score >= 25
          ? 'text-electric-400 bg-electric-500/15 border-electric-500/30'
          : 'text-accent-green bg-accent-green/15 border-accent-green/30';
  return (
    <span className={`chip border ${color}`}>
      {score}/100 · {label}
    </span>
  );
}

export function SimulatedBadge() {
  return (
    <span className="chip border border-cyan-400/30 bg-cyan-400/10 text-cyan-400">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulseSoft" />
      SIMULATED DATA
    </span>
  );
}

export function SectionTitle({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <div className="mt-0.5 w-9 h-9 rounded-lg bg-electric-500/15 text-electric-400 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`glass p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3 gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-200">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
        <span className="text-xl">∅</span>
      </div>
      {message}
    </div>
  );
}

export function ProbabilityCell({ p }: { p: number }) {
  const str = p < 1e-4 ? p.toExponential(2) : p.toFixed(5);
  const color = p <= 0.01 ? 'text-accent-red' : p <= 0.05 ? 'text-accent-amber' : 'text-slate-300';
  return <span className={`font-mono ${color}`}>{str}</span>;
}
