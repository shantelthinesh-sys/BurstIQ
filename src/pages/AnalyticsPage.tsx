import { BarChart3, Activity, GitCompare, TrendingDown, Stethoscope } from 'lucide-react';
import { useApp, useSummary } from '@/store';
import { Card, SectionTitle } from '@/components/ui';
import {
  TrafficChart,
  PmfChart,
  ClassificationChart,
  BurstFrequencyChart,
  ObservedVsExpectedChart,
  DeviationChart,
} from '@/components/charts';
import { thresholdLineValue } from '@/lib/simulation';

export function AnalyticsPage() {
  const { observations, config } = useApp();
  const summary = useSummary();
  const threshold = thresholdLineValue(config);

  const diagnostics = [
    { label: 'Sample mean', value: summary.mean.toFixed(3) },
    { label: 'Sample variance', value: summary.variance.toFixed(3) },
    { label: 'Variance-to-mean ratio', value: summary.vmr.toFixed(3) },
    { label: 'Expected λ', value: config.lambda.toFixed(3) },
  ];

  const vmrNote =
    summary.vmr > 1.3
      ? 'VMR notably above 1 — data is overdispersed relative to a Poisson model (injected bursts contribute extra variance).'
      : summary.vmr < 0.7
        ? 'VMR notably below 1 — data is underdispersed; Poisson may not fit well.'
        : 'VMR near 1 — data is roughly consistent with a Poisson model.';

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Network Analytics"
        subtitle="Multi-view analysis of the simulated traffic dataset"
        icon={<BarChart3 size={18} />}
      />

      <Card title="A. Traffic Over Time" subtitle="Observations, expected rate, burst threshold">
        <TrafficChart observations={observations} expected={config.lambda} threshold={threshold} height={260} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="B. Poisson Distribution PMF" subtitle="Theoretical PMF at the current λ">
          <PmfChart lambda={config.lambda} highlightK={Math.round(config.lambda)} showUpperTail={false} height={240} />
        </Card>
        <Card title="C. Traffic Classification" subtitle="Normal / Elevated / Burst counts">
          <ClassificationChart normal={summary.normal} elevated={summary.elevated} burst={summary.bursts} height={240} />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="D. Burst Frequency" subtitle="Bursts per time window">
          <BurstFrequencyChart observations={observations} windowSize={10} height={240} />
        </Card>
        <Card title="E. Observed vs Expected" subtitle="Side-by-side comparison">
          <ObservedVsExpectedChart observations={observations} height={240} />
        </Card>
      </div>

      <Card title="F. Traffic Deviation" subtitle="Observed − expected per interval" >
        <DeviationChart observations={observations} height={240} />
      </Card>

      <Card title="G. Distribution Diagnostics" subtitle="Does the data look Poisson?">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {diagnostics.map((d) => (
            <div key={d.label} className="glass p-3">
              <div className="text-xs text-slate-500 uppercase">{d.label}</div>
              <div className="font-mono text-lg text-electric-400 mt-0.5">{d.value}</div>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 text-sm text-slate-300">
          <Stethoscope size={18} className="text-electric-400 mt-0.5 shrink-0" />
          <p>{vmrNote}</p>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          A variance-to-mean ratio substantially different from 1 may indicate that the Poisson
          assumptions do not fit well. This diagnostic alone does not prove or disprove that the
          data follows a Poisson distribution.
        </p>
      </Card>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Activity size={14} className="text-electric-400" />
        All charts update when the dataset or configuration changes.
        <GitCompare size={14} className="text-cyan-400 ml-2" />
        <TrendingDown size={14} className="text-accent-amber ml-1" />
      </div>
    </div>
  );
}


