import { useMemo, useState } from 'react';
import { Radar, Sliders, GitBranch, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useApp } from '@/store';
import { Card, SectionTitle, StatusBadge, SeverityPill, ProbabilityCell, EmptyState } from '@/components/ui';
import { NumberInput, SelectInput } from '@/components/inputs';
import { TrafficChart, BaselineCompareChart, ClassificationChart } from '@/components/charts';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { StatCard, StatGrid } from '@/components/StatCard';
import { thresholdLineValue } from '@/lib/simulation';
import { classify, poissonUpperTail, severityScore, burstThreshold } from '@/lib/poisson';
import type { Observation } from '@/types';

export function DetectionPage() {
  const { observations, config, setConfig, addHistoryFromObservation } = useApp();
  const [selected, setSelected] = useState<number | null>(null);

  const threshold = useMemo(() => thresholdLineValue(config), [config]);
  const selectedObs: Observation | null =
    selected != null ? observations.find((o) => o.interval === selected) ?? null : observations.find((o) => o.classification === 'BURST') ?? observations[observations.length - 1] ?? null;

  const burstK = useMemo(() => burstThreshold(config.lambda, config.alpha), [config.lambda, config.alpha]);

  const fixedBursts = observations.filter((o) => o.classification === 'BURST').length;
  const rollingBursts = observations.filter(
    (o) => o.rollingClassification === 'BURST',
  ).length;

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Intelligent Burst Detection Engine"
        subtitle="Poisson upper-tail probability test with configurable significance"
        icon={<Radar size={18} />}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Detection Parameters" className="lg:col-span-1">
          <div className="space-y-3">
            <NumberInput
              label="λ (expected rate)"
              value={config.lambda}
              min={0}
              max={500}
              onChange={(v) => setConfig({ lambda: v })}
            />
            <NumberInput
              label="α (significance threshold)"
              value={config.alpha}
              min={0.0001}
              max={0.5}
              step={0.001}
              onChange={(v) => setConfig({ alpha: v })}
              hint="Default 0.01. Smaller = stricter detection."
            />
            <SelectInput
              label="Baseline mode"
              value={config.baselineMode}
              onChange={(v) => setConfig({ baselineMode: v as 'fixed' | 'adaptive' })}
              options={[
                { value: 'fixed', label: 'Fixed baseline (λ)' },
                { value: 'adaptive', label: 'Adaptive (rolling mean)' },
              ]}
            />
            {config.baselineMode === 'adaptive' && (
              <NumberInput
                label="Rolling window size"
                value={config.windowSize}
                min={2}
                max={100}
                onChange={(v) => setConfig({ windowSize: Math.round(v) })}
              />
            )}
            <div className="text-xs text-slate-400 bg-navy-900/60 p-3 rounded-lg border border-white/5 space-y-1">
              <div>Burst cutoff k* = <span className="font-mono text-accent-red">{burstK}</span></div>
              <div>Any observation ≥ {burstK} flags as BURST under fixed λ.</div>
            </div>
          </div>
        </Card>

        <Card
          title="Traffic with Detection"
          className="lg:col-span-2"
          subtitle="Highlighted columns mark burst intervals"
        >
          <TrafficChart observations={observations} expected={config.lambda} threshold={threshold} height={280} />
        </Card>
      </div>

      <StatGrid>
        <StatCard label="Fixed Baseline Bursts" value={fixedBursts} icon={Radar} tone="red" sub={`k ≥ ${burstK}`} />
        <StatCard label="Adaptive Baseline Bursts" value={rollingBursts} icon={GitBranch} tone="amber" sub={`window ${config.windowSize}`} />
        <StatCard label="Burst Cutoff k*" value={burstK} icon={Sliders} tone="cyan" sub={`P(X ≥ k*) ≤ ${config.alpha}`} />
        <StatCard label="Consecutive Feature" value={config.windowSize > 0 ? 'ON' : 'OFF'} icon={AlertTriangle} tone="default" sub="Repeated high-traffic runs" />
      </StatGrid>

      {config.baselineMode === 'adaptive' && (
        <Card title="Fixed vs Adaptive Baseline Comparison" subtitle="Rolling mean may hide persistent bursts — experimental feature">
          <BaselineCompareChart observations={observations} fixedLambda={config.lambda} height={260} />
          <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
            <div className="glass p-3">
              <div className="text-xs text-slate-500 uppercase">Fixed λ</div>
              <div className="font-mono text-cyan-400 text-lg">{config.lambda}</div>
            </div>
            <div className="glass p-3">
              <div className="text-xs text-slate-500 uppercase">Latest Rolling λ</div>
              <div className="font-mono text-accent-amber text-lg">
                {observations[observations.length - 1]?.rollingLambda ?? '—'}
              </div>
            </div>
            <div className="glass p-3">
              <div className="text-xs text-slate-500 uppercase">Difference</div>
              <div className="font-mono text-slate-100 text-lg">
                {((observations[observations.length - 1]?.rollingLambda ?? config.lambda) - config.lambda).toFixed(2)}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Experimental: updating the baseline from recent history adapts to drift, but can hide
            sustained bursts by normalising them. Switch modes in the parameters panel.
          </p>
        </Card>
      )}

      <Card title="Select an Observation" subtitle="Click a row to inspect detection explainability and severity">
        {observations.length === 0 ? (
          <EmptyState message="No observations available." />
        ) : (
          <div className="overflow-x-auto scrollbar-thin max-h-72">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-navy-850/95">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="py-2 pr-4">Interval</th>
                  <th className="py-2 pr-4">Observed</th>
                  <th className="py-2 pr-4">Expected</th>
                  <th className="py-2 pr-4">P(X ≥ k)</th>
                  <th className="py-2 pr-4">Class</th>
                  <th className="py-2 pr-4">Severity</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {observations.slice().reverse().slice(0, 50).map((o) => (
                  <tr
                    key={o.interval}
                    onClick={() => setSelected(o.interval)}
                    className={`cursor-pointer border-b border-white/5 hover:bg-white/5 ${
                      selectedObs?.interval === o.interval ? 'bg-electric-500/10' : ''
                    }`}
                  >
                    <td className="py-2 pr-4 font-mono text-slate-400">#{o.interval}</td>
                    <td className="py-2 pr-4 font-mono text-slate-100">{o.observed}</td>
                    <td className="py-2 pr-4 font-mono text-slate-300">{o.expected}</td>
                    <td className="py-2 pr-4"><ProbabilityCell p={o.upperTail} /></td>
                    <td className="py-2 pr-4"><StatusBadge status={o.classification} size="sm" /></td>
                    <td className="py-2 pr-4"><SeverityPill score={o.severity} label={o.severityLabel} /></td>
                    <td className="py-2 pr-4 text-xs text-electric-400">{selectedObs?.interval === o.interval ? 'Selected' : 'Inspect'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedObs && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Detection Result" subtitle={`Interval #${selectedObs.interval}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Classification</span>
                <StatusBadge status={selectedObs.classification} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Observed" value={`${selectedObs.observed}`} />
                <Field label="Expected" value={`${selectedObs.expected}`} />
                <Field label="Upper-tail P" value={selectedObs.upperTail < 1e-4 ? selectedObs.upperTail.toExponential(3) : selectedObs.upperTail.toFixed(6)} accent />
                <Field label="α threshold" value={`${config.alpha}`} />
                <Field label="Excess packets" value={`${selectedObs.observed - selectedObs.expected}`} />
                <Field label="Consecutive run" value={`${selectedObs.consecutive}`} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-sm text-slate-400">Severity</span>
                <SeverityPill score={selectedObs.severity} label={selectedObs.severityLabel} />
              </div>
              <button
                onClick={() => addHistoryFromObservation(selectedObs, config)}
                className="btn-ghost w-full mt-2"
              >
                <ShieldAlert size={16} /> Save to Detection History
              </button>
            </div>
          </Card>

          <div className="space-y-4">
            <ExplanationPanel
              observed={selectedObs.observed}
              expected={selectedObs.expected}
              upperTail={selectedObs.upperTail}
              alpha={config.alpha}
              classification={selectedObs.classification}
            />
            <Card title="Severity Score Formula" subtitle="Heuristic 0–100, not a calibrated risk score">
              <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
                <p>
                  Score = 0.55 × rarity + 0.30 × excess + 0.15 × consecutive
                </p>
                <p>
                  <span className="text-slate-300">rarity</span> = clamp(−log₁₀(P) / 6, 0, 1) →{' '}
                  {Math.min(1, Math.max(0, -Math.log10(Math.max(selectedObs.upperTail, 1e-12)) / 6)).toFixed(3)}
                </p>
                <p>
                  <span className="text-slate-300">excess</span> = clamp((k − λ) / (3√λ + 1), 0, 1) →{' '}
                  {Math.min(1, Math.max(0, (selectedObs.observed - selectedObs.expected) / (3 * Math.sqrt(Math.max(selectedObs.expected, 1)) + 1))).toFixed(3)}
                </p>
                <p>
                  <span className="text-slate-300">consecutive</span> = clamp(run / 5, 0, 1) →{' '}
                  {Math.min(1, selectedObs.consecutive / 5).toFixed(3)}
                </p>
                <p className="text-slate-500 pt-1">
                  Limitations: deterministic but heuristic. A high score indicates statistical
                  anomaly + magnitude + persistence, not attacker intent.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Card title="Assumptions & Consecutive-Interval Warning">
        <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-300">
          <div className="space-y-2">
            <h4 className="text-slate-200 font-medium">Poisson model assumptions</h4>
            <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
              <li>Events are independent within an interval.</li>
              <li>The expected rate λ is constant within the interval.</li>
              <li>The model fits the simulated baseline traffic.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-slate-200 font-medium">Consecutive-interval warning</h4>
            <p className="text-xs text-slate-400">
              An individual statistical anomaly flags a single surprising interval. A{' '}
              <span className="text-accent-amber">consecutive run</span> of elevated/burst
              intervals suggests repeated traffic anomalies rather than a one-off spike. The run
              length feeds the severity score.
            </p>
            <p className="text-xs text-slate-500">
              This system does not detect real cyberattacks or identify their cause.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ClassificationChart
            normal={observations.filter((o) => o.classification === 'NORMAL').length}
            elevated={observations.filter((o) => o.classification === 'ELEVATED').length}
            burst={observations.filter((o) => o.classification === 'BURST').length}
            height={200}
          />
        </div>
      </Card>
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass p-3">
      <div className="text-xs text-slate-500 uppercase">{label}</div>
      <div className={`font-mono text-base ${accent ? 'text-accent-red' : 'text-slate-100'}`}>{value}</div>
    </div>
  );
}

// keep classify import referenced for tree-shaking clarity
export const _classify = classify;
export const _tail = poissonUpperTail;
export const _sev = severityScore;
