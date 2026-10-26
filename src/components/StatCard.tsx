import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  tone?: 'default' | 'green' | 'amber' | 'red' | 'cyan';
}) {
  const toneMap = {
    default: 'text-electric-400 bg-electric-500/10',
    green: 'text-accent-green bg-accent-green/10',
    amber: 'text-accent-amber bg-accent-amber/10',
    red: 'text-accent-red bg-accent-red/10',
    cyan: 'text-cyan-400 bg-cyan-400/10',
  } as const;
  return (
    <div className="glass p-4 flex items-start gap-3 hover:border-white/15 transition-colors">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${toneMap[tone]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">{label}</div>
        <div className="text-xl font-semibold text-slate-100 mt-0.5 font-mono truncate">{value}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{children}</div>;
}
