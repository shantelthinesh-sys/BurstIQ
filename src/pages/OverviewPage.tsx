import { useMemo } from 'react';
import {
  Gauge,
  Activity,
  Radar,
  Signal,
  TrendingUp,
  AlertTriangle,
  FlaskConical,
  ArrowRight,
} from 'lucide-react';
import { useApp, useSummary } from '@/store';
import { StatCard, StatGrid } from '@/components/StatCard';
import { Card, SectionTitle, StatusBadge, SimulatedBadge } from '@/components/ui';
import { TrafficChart } from '@/components/charts';
import { SliderInput } from '@/components/inputs';
import { thresholdLineValue } from '@/lib/simulation';
import { poissonUpperTail } from '@/lib/poisson';
import type { PageId } from '@/types';

export function OverviewPage() {
  const { observations, config, setConfig, setPage } = useApp();
  const summary = useSummary();
  const threshold = useMemo(() => thresholdLineValue(config), [config]);
  const extremeProb = summary.latest
    ? poissonUpperTail(summary.latest.observed, config.lambda)
    : 0;

  const statusTone =
    summary.latest?.classification === 'BURST'
      ? 'red'
      : summary.latest?.classification === 'ELEVATED'
        ? 'amber'
        : 'green';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SectionTitle
          title="Network Traffic Overview"
          subtitle="Live Poisson-based burst detection dashboard"
          icon={<Gauge size={18} />}
        />
        <SimulatedBadge />
      </div>

      <StatGrid>
        <StatCard
          label="Avg Traffic Rate (λ)"
          value={`${config.lambda} p/s`}
          sub="Expected packets per second"
          icon={TrendingUp}
          tone="cyan"
        />
        <StatCard
          label="Current Packet Count"
          value={summary.latest?.observed ?? 0}
          sub={`Interval ${summary.latest?.interval ?? 0}`}
          icon={Activity}
          tone="default"
        />
        <StatCard
          label="Burst Events Detected"
          value={summary.bursts}
          sub={`${summary.flaggedPct.toFixed(1)}% flagged total`}
          icon={Radar}
          tone="red"
        />
        <StatCard
          label="Current Traffic Status"
          value={summary.latest?.classification === 'BURST' ? 'BURST' : summary.latest?.classification === 'ELEVATED' ? 'ELEVATED' : 'NORMAL'}
          sub={`α = ${config.alpha}`}
          icon={Signal}
          tone={statusTone as 'red' | 'amber' | 'green'}
        />
      </StatGrid>

      <Card
        title="Live Traffic Chart"
        subtitle="Observed packets per interval vs expected rate and burst threshold"
        action={
          <div className="flex items-center gap-2">
            {summary.latest && <StatusBadge status={summary.latest.classification} size="sm" />}
          </div>
        }
      >
        <TrafficChart
          observations={observations}
          expected={config.lambda}
          threshold={threshold}
          height={300}
        />
        <div className="mt-4 max-w-xs">
          <SliderInput
            label="Simulation Speed"
            value={config.speed}
            min={0.25}
            max={4}
            step={0.25}
            onChange={(v) => setConfig({ speed: v })}
            format={(v) => `${v}×`}
          />
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Latest Detection Event">
          {summary.latestBurst ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Interval</span>
                <span className="font-mono text-slate-100">{summary.latestBurst.interval}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Observed / Expected</span>
                <span className="font-mono text-slate-100">
                  {summary.latestBurst.observed} / {summary.latestBurst.expected}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Upper-tail P</span>
                <span className="font-mono text-accent-red">
                  {summary.latestBurst.upperTail < 1e-4
                    ? summary.latestBurst.upperTail.toExponential(3)
                    : summary.latestBurst.upperTail.toFixed(5)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Severity</span>
                <span className="font-mono text-slate-100">
                  {summary.latestBurst.severity}/100 · {summary.latestBurst.severityLabel}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              No burst detected in the current dataset. Try increasing burst frequency in the
              simulator.
            </p>
          )}
        </Card>

        <Card title="Probability of Extreme Observation">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Latest P(X ≥ k)</span>
              <span className="font-mono text-accent-red">
                {extremeProb < 1e-4 ? extremeProb.toExponential(3) : extremeProb.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Threshold α</span>
              <span className="font-mono text-slate-100">{config.alpha}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total observations</span>
              <span className="font-mono text-slate-100">{summary.n}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Flagged percentage</span>
              <span className="font-mono text-slate-100">{summary.flaggedPct.toFixed(1)}%</span>
            </div>
          </div>
        </Card>

        <Card title="Latest Mathematical Result">
          <p className="text-sm text-slate-300 leading-relaxed">
            {summary.latest ? (
              <>
                The latest interval (#{summary.latest.interval}) observed{' '}
                <span className="font-mono text-electric-400">{summary.latest.observed}</span>{' '}
                packets against an expected{' '}
                <span className="font-mono text-electric-400">{config.lambda}</span>. Under the
                Poisson model with λ = {config.lambda}, the upper-tail probability was{' '}
                <span className="font-mono text-accent-red">
                  {summary.latest.upperTail < 1e-4
                    ? summary.latest.upperTail.toExponential(3)
                    : summary.latest.upperTail.toFixed(5)}
                </span>
                , so the interval is classified as{' '}
                <span
                  className={
                    summary.latest.classification === 'BURST'
                      ? 'text-accent-red font-semibold'
                      : summary.latest.classification === 'ELEVATED'
                        ? 'text-accent-amber font-semibold'
                        : 'text-accent-green font-semibold'
                  }
                >
                  {summary.latest.classification}
                </span>
                .
              </>
            ) : (
              'No observations available.'
            )}
          </p>
        </Card>
      </div>

      <Card title="Example Scenario" subtitle="The worked example used throughout this project">
        <div className="grid md:grid-cols-2 gap-4 items-center">
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              Suppose the expected traffic rate is{' '}
              <span className="font-mono text-electric-400">20 packets/second</span>, so λ = 20. If{' '}
              <span className="font-mono text-electric-400">35 packets</span> are observed in one
              second:
            </p>
            <p className="font-mono text-xs bg-navy-900/60 p-3 rounded-lg border border-white/5">
              P(X = 35) = (e⁻²⁰ · 20³⁵) / 35!
              <br />
              P(X ≥ 35) = 1 − P(X ≤ 34)
            </p>
            <p>
              The upper-tail probability P(X ≥ 35) is roughly{' '}
              <span className="font-mono text-accent-red">
                {poissonUpperTail(35, 20).toExponential(3)}
              </span>
              , far below α = 0.01, so this observation is flagged as a burst.
            </p>
          </div>
          <button
            onClick={() => setPage('lab')}
            className="btn-ghost justify-between group"
          >
            <span className="flex items-center gap-2">
              <FlaskConical size={16} className="text-electric-400" />
              Open Poisson Lab to explore
            </span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <AlertTriangle size={14} className="text-accent-amber" />
        All data is simulated for demonstration. A flagged observation is statistically unusual, not
        necessarily malicious.
      </div>
    </div>
  );
}

// silence unused import for page nav type where needed
export type { PageId };
