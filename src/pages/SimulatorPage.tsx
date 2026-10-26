import { useState } from 'react';
import { Play, Pause, RotateCcw, Sparkles, BarChart3, Activity, Settings2 } from 'lucide-react';
import { useApp, useSummary } from '@/store';
import { PRESETS, DEFAULT_CONFIG } from '@/lib/simulation';
import { Card, SectionTitle, StatusBadge, EmptyState, ProbabilityCell } from '@/components/ui';
import { NumberInput, SelectInput } from '@/components/inputs';
import { TrafficChart } from '@/components/charts';
import { thresholdLineValue } from '@/lib/simulation';
import type { Observation } from '@/types';

export function SimulatorPage() {
  const { config, setFullConfig, setConfig, regenerate, running, toggleRun, reset, observations } =
    useApp();
  const summary = useSummary();
  const [selectedPreset, setSelectedPreset] = useState('occasional');
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const threshold = thresholdLineValue(config);

  function applyPreset(id: string) {
    setSelectedPreset(id);
    const preset = PRESETS.find((p) => p.id === id);
    if (preset && id !== 'custom') {
      setFullConfig({ ...config, ...preset.config });
    }
  }

  const paged = observations.slice(page * pageSize, page * pageSize + pageSize);
  const totalPages = Math.max(1, Math.ceil(observations.length / pageSize));

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Live Traffic Simulator"
        subtitle="Generate Poisson-distributed network traffic and inject configurable bursts"
        icon={<Activity size={18} />}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Presets" subtitle="Quick configuration templates" className="lg:col-span-1">
          <div className="space-y-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedPreset === p.id
                    ? 'bg-electric-500/15 border-electric-500/40 text-slate-100'
                    : 'bg-navy-900/50 border-white/5 text-slate-300 hover:border-white/15'
                }`}
              >
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Configuration" subtitle="Manual parameters" className="lg:col-span-2">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <NumberInput
              label="λ (avg packets/sec)"
              value={config.lambda}
              min={0}
              max={500}
              step={1}
              onChange={(v) => setConfig({ lambda: v })}
            />
            <NumberInput
              label="Time intervals"
              value={config.intervals}
              min={10}
              max={1000}
              step={10}
              onChange={(v) => setConfig({ intervals: Math.round(v) })}
            />
            <NumberInput
              label="α (significance)"
              value={config.alpha}
              min={0.0001}
              max={0.9999}
              step={0.001}
              onChange={(v) => setConfig({ alpha: v })}
            />
            <NumberInput
              label="Burst intensity (×λ)"
              value={config.burstIntensity}
              min={0}
              max={10}
              step={0.1}
              onChange={(v) => setConfig({ burstIntensity: v })}
            />
            <NumberInput
              label="Burst frequency (0–1)"
              value={config.burstFrequency}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => setConfig({ burstFrequency: v })}
            />
            <NumberInput
              label="Random seed"
              value={config.seed}
              min={1}
              max={999999}
              step={1}
              onChange={(v) => setConfig({ seed: Math.round(v) })}
            />
            <NumberInput
              label="Window size"
              value={config.windowSize}
              min={2}
              max={100}
              step={1}
              onChange={(v) => setConfig({ windowSize: Math.round(v) })}
            />
            <NumberInput
              label="Simulation speed"
              value={config.speed}
              min={0.25}
              max={4}
              step={0.25}
              onChange={(v) => setConfig({ speed: v })}
            />
            <SelectInput
              label="Baseline mode"
              value={config.baselineMode}
              onChange={(v) => setConfig({ baselineMode: v as 'fixed' | 'adaptive' })}
              options={[
                { value: 'fixed', label: 'Fixed baseline' },
                { value: 'adaptive', label: 'Adaptive baseline' },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => regenerate({ seed: Math.floor(Math.random() * 999999) })} className="btn-primary">
              <Sparkles size={16} /> Generate New Dataset
            </button>
            <button onClick={toggleRun} className="btn-ghost">
              {running ? <Pause size={16} /> : <Play size={16} />}
              {running ? 'Pause' : 'Resume'}
            </button>
            <button onClick={() => regenerate()} className="btn-ghost">
              <BarChart3 size={16} /> Analyze Dataset
            </button>
            <button
              onClick={() => {
                reset();
                setSelectedPreset('occasional');
              }}
              className="btn-danger"
            >
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </Card>
      </div>

      <Card
        title="Generated Traffic"
        subtitle={`${observations.length} intervals · ${summary.bursts} bursts · ${summary.elevated} elevated`}
        action={<StatusBadge status={summary.latest?.classification ?? 'NORMAL'} size="sm" />}
      >
        <TrafficChart observations={observations} expected={config.lambda} threshold={threshold} height={260} />
      </Card>

      <Card title="Observations Table" subtitle="Per-interval classification">
        {observations.length === 0 ? (
          <EmptyState message="No observations yet. Generate a dataset." />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-white/5">
                  <th className="py-2 pr-4">Interval</th>
                  <th className="py-2 pr-4">Observed</th>
                  <th className="py-2 pr-4">Expected</th>
                  <th className="py-2 pr-4">P(X ≥ k)</th>
                  <th className="py-2 pr-4">Classification</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((o: Observation) => (
                  <tr key={o.interval} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 pr-4 font-mono text-slate-400">#{o.interval}</td>
                    <td className="py-2 pr-4 font-mono text-slate-100">{o.observed}</td>
                    <td className="py-2 pr-4 font-mono text-slate-300">{o.expected}</td>
                    <td className="py-2 pr-4">
                      <ProbabilityCell p={o.upperTail} />
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={o.classification} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  className="btn-ghost !py-1 !px-2 text-xs"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </button>
                <button
                  className="btn-ghost !py-1 !px-2 text-xs"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Settings2 size={14} className="text-electric-400" />
        Baseline counts are sampled from Poisson(λ). Bursts are injected at ~{config.burstFrequency * 100}% of
        intervals by sampling from Poisson(λ × {config.burstIntensity}). The same seed produces the same dataset.
      </div>
    </div>
  );
}

export { DEFAULT_CONFIG };
