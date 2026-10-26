import { useState } from 'react';
import { GitCompareArrows, Plus, X, BookOpen } from 'lucide-react';
import { Card, SectionTitle, StatusBadge, SeverityPill, ProbabilityCell } from '@/components/ui';
import { NumberInput, SliderInput } from '@/components/inputs';
import { PmfChart } from '@/components/charts';
import {
  poissonPmf,
  poissonUpperTail,
  classify,
  severityScore,
  explainDetection,
  validateInputs,
} from '@/lib/poisson';

interface Scenario {
  name: string;
  lambda: number;
  observed: number;
  alpha: number;
  consecutive: number;
}

const EXAMPLES: Scenario[] = [
  { name: 'A. Normal traffic', lambda: 20, observed: 22, alpha: 0.01, consecutive: 1 },
  { name: 'B. One sudden spike', lambda: 20, observed: 38, alpha: 0.01, consecutive: 1 },
  { name: 'C. Repeated bursts', lambda: 20, observed: 34, alpha: 0.01, consecutive: 4 },
  { name: 'D. Higher average rate', lambda: 40, observed: 38, alpha: 0.01, consecutive: 1 },
  { name: 'E. Same count, two baselines', lambda: 20, observed: 35, alpha: 0.01, consecutive: 1 },
];

function analyze(s: Scenario) {
  const err = validateInputs(s.lambda, s.observed, s.alpha);
  if (err) return { error: err };
  const pmf = poissonPmf(s.observed, s.lambda);
  const upper = poissonUpperTail(s.observed, s.lambda);
  const cls = classify(s.observed, s.lambda, upper, s.alpha);
  const sev = severityScore(s.observed, s.lambda, upper, s.consecutive);
  const explanation = explainDetection(s.observed, s.lambda, upper, s.alpha, cls);
  return { pmf, upper, cls, sev, explanation, err: null as string | null };
}

function ScenarioCard({
  scenario,
  onChange,
  onRemove,
  removable,
}: {
  scenario: Scenario;
  onChange: (s: Scenario) => void;
  onRemove?: () => void;
  removable?: boolean;
}) {
  const r = analyze(scenario);
  return (
    <Card
      title={scenario.name}
      action={
        removable && (
          <button onClick={onRemove} className="text-slate-500 hover:text-accent-red">
            <X size={16} />
          </button>
        )
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="λ" value={scenario.lambda} min={0} max={500} onChange={(v) => onChange({ ...scenario, lambda: v })} />
          <NumberInput label="Observed k" value={scenario.observed} min={0} max={1000} onChange={(v) => onChange({ ...scenario, observed: Math.round(v) })} />
          <NumberInput label="α" value={scenario.alpha} min={0.0001} max={0.5} step={0.001} onChange={(v) => onChange({ ...scenario, alpha: v })} />
          <NumberInput label="Consecutive" value={scenario.consecutive} min={0} max={20} onChange={(v) => onChange({ ...scenario, consecutive: Math.round(v) })} />
        </div>
        {r.error ? (
          <div className="text-sm text-accent-red">{r.error}</div>
        ) : (
          <>
            <PmfChart lambda={scenario.lambda} highlightK={scenario.observed} height={200} />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="glass p-2">
                <div className="text-xs text-slate-500">P(X = k)</div>
                <ProbabilityCell p={r.pmf!} />
              </div>
              <div className="glass p-2">
                <div className="text-xs text-slate-500">P(X ≥ k)</div>
                <ProbabilityCell p={r.upper!} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <StatusBadge status={r.cls!} size="sm" />
              <SeverityPill score={r.sev!.score} label={r.sev!.label} />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{r.explanation}</p>
          </>
        )}
      </div>
    </Card>
  );
}

export function WhatIfPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { name: 'Scenario 1', lambda: 20, observed: 35, alpha: 0.01, consecutive: 1 },
    { name: 'Scenario 2', lambda: 40, observed: 35, alpha: 0.01, consecutive: 1 },
  ]);
  const [compareMode, setCompareMode] = useState(true);

  const update = (i: number, s: Scenario) =>
    setScenarios((prev) => prev.map((p, idx) => (idx === i ? s : p)));

  return (
    <div className="space-y-5">
      <SectionTitle
        title="What-If Analysis"
        subtitle="Compare scenarios under different baselines and parameters"
        icon={<GitCompareArrows size={18} />}
      />

      <Card title="Example Scenarios" subtitle="Load a preset to see how detection changes">
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e, i) => (
            <button
              key={i}
              onClick={() => setScenarios((prev) => [...prev, { ...e, name: `${e.name}` }])}
              className="btn-ghost text-xs"
            >
              <Plus size={14} /> {e.name}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Comparison Mode" subtitle="Two scenarios side by side">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={compareMode}
            onChange={(e) => setCompareMode(e.target.checked)}
            className="accent-electric-500"
          />
          Show scenarios side by side for direct comparison
        </label>
      </Card>

      <div className={`grid gap-4 ${compareMode ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {scenarios.map((s, i) => (
          <ScenarioCard
            key={i}
            scenario={s}
            onChange={(ns) => update(i, ns)}
            onRemove={() => setScenarios((prev) => prev.filter((_, idx) => idx !== i))}
            removable={scenarios.length > 1}
          />
        ))}
      </div>

      <button
        onClick={() => setScenarios((prev) => [...prev, { name: `Scenario ${prev.length + 1}`, lambda: 20, observed: 30, alpha: 0.01, consecutive: 1 }])}
        className="btn-primary"
      >
        <Plus size={16} /> Add Scenario
      </button>

      <Card title="Why the Same Count Can Be Normal or Unusual">
        <div className="text-sm text-slate-300 space-y-2">
          <p className="flex items-start gap-2">
            <BookOpen size={16} className="text-electric-400 mt-0.5 shrink-0" />
            The same observed packet count can be flagged under one baseline but ordinary under
            another, because the upper-tail probability depends on λ.
          </p>
          <p>
            Example: 35 packets when λ = 20 gives P(X ≥ 35) ≈{' '}
            <span className="font-mono text-accent-red">{poissonUpperTail(35, 20).toExponential(3)}</span>{' '}
            (burst). The same 35 packets when λ = 40 gives P(X ≥ 35) ≈{' '}
            <span className="font-mono text-accent-green">{poissonUpperTail(35, 40).toFixed(4)}</span>{' '}
            (normal — 35 is actually below the mean).
          </p>
          <p className="text-xs text-slate-500">
            This is why choosing the right baseline matters: a count that is alarming for a quiet
            network can be routine for a busy one.
          </p>
        </div>
      </Card>
    </div>
  );
}


