import { useMemo } from 'react';
import { FileText, Printer, FileJson, FileSpreadsheet } from 'lucide-react';
import { useApp, useSummary } from '@/store';
import { Card, SectionTitle, StatusBadge } from '@/components/ui';
import { TrafficChart } from '@/components/charts';
import { thresholdLineValue } from '@/lib/simulation';
import { poissonPmf, poissonCdf, poissonUpperTail, burstThreshold } from '@/lib/poisson';

export function ReportsPage() {
  const { observations, config, history } = useApp();
  const summary = useSummary();
  const threshold = thresholdLineValue(config);
  const burstK = useMemo(() => burstThreshold(config.lambda, config.alpha), [config.lambda, config.alpha]);

  const now = new Date();
  const reportTitle = 'Traffic Burst Detection in Communication Networks Using Poisson Distribution';

  const summaryStats = [
    ['Lambda (λ)', String(config.lambda)],
    ['Alpha (α)', String(config.alpha)],
    ['Intervals analyzed', String(summary.n)],
    ['Sample mean', summary.mean.toFixed(3)],
    ['Sample variance', summary.variance.toFixed(3)],
    ['Variance-to-mean ratio', summary.vmr.toFixed(3)],
    ['Burst cutoff k*', String(burstK)],
    ['Burst intervals', String(summary.bursts)],
    ['Elevated intervals', String(summary.elevated)],
    ['Normal intervals', String(summary.normal)],
    ['Flagged percentage', `${summary.flaggedPct.toFixed(2)}%`],
    ['Max observed', String(summary.maxObserved)],
    ['History events saved', String(history.length)],
  ];

  const assumptions = [
    'Events are independent within each observation interval.',
    'The expected rate λ is constant within the observation interval.',
    'The Poisson model is appropriate for the simulated baseline traffic.',
    'Burst intervals are injected by sampling from Poisson(λ × burstIntensity).',
  ];

  const limitations = [
    'The demonstration uses simulated traffic, not real network packets.',
    'Results depend on the suitability of the Poisson model for the data.',
    'A high packet count does not automatically indicate malicious activity.',
    'The application does not inspect real network packets or traffic content.',
    'The adaptive baseline and severity score are experimental analytical features.',
    'Alpha is a statistical decision threshold, not a security policy.',
  ];

  const keyCalcs = [
    ['P(X = k) for latest', fmt(poissonPmf(summary.latest?.observed ?? 0, config.lambda))],
    ['P(X ≤ k) for latest', fmt(poissonCdf(summary.latest?.observed ?? 0, config.lambda))],
    ['P(X ≥ k) for latest', fmt(poissonUpperTail(summary.latest?.observed ?? 0, config.lambda))],
    ['P(X ≥ 35 | λ=20) example', fmt(poissonUpperTail(35, 20))],
  ];

  function buildReportText(): string {
    const lines: string[] = [];
    lines.push(reportTitle);
    lines.push('='.repeat(reportTitle.length));
    lines.push(`Generated: ${now.toLocaleString()}`);
    lines.push('');
    lines.push('SUMMARY STATISTICS');
    lines.push('-'.repeat(20));
    summaryStats.forEach(([k, v]) => lines.push(`${k}: ${v}`));
    lines.push('');
    lines.push('MATHEMATICAL ASSUMPTIONS');
    lines.push('-'.repeat(24));
    assumptions.forEach((a) => lines.push(`- ${a}`));
    lines.push('');
    lines.push('DETECTION THRESHOLD');
    lines.push('-'.repeat(19));
    lines.push(`Significance alpha: ${config.alpha}`);
    lines.push(`Burst cutoff k*: ${burstK} (P(X >= k*) <= alpha)`);
    lines.push('');
    lines.push('KEY PROBABILITY CALCULATIONS');
    lines.push('-'.repeat(28));
    keyCalcs.forEach(([k, v]) => lines.push(`${k}: ${v}`));
    lines.push('');
    lines.push('OBSERVATIONS (first 30)');
    lines.push('-'.repeat(23));
    lines.push('interval,observed,expected,upperTail,classification,severity');
    observations.slice(0, 30).forEach((o) => {
      lines.push(`${o.interval},${o.observed},${o.expected},${o.upperTail},${o.classification},${o.severity}`);
    });
    lines.push('');
    lines.push('LIMITATIONS');
    lines.push('-'.repeat(11));
    limitations.forEach((l) => lines.push(`- ${l}`));
    return lines.join('\n');
  }

  function downloadText(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCsv() {
    const headers = ['interval', 'observed', 'expected', 'pmf', 'upperTail', 'classification', 'severity', 'severityLabel'];
    const lines = [headers.join(',')];
    observations.forEach((o) => {
      lines.push([o.interval, o.observed, o.expected, o.pmf, o.upperTail, o.classification, o.severity, o.severityLabel].join(','));
    });
    downloadText(lines.join('\n'), 'traffic-observations.csv', 'text/csv');
  }

  function downloadJson() {
    const data = {
      title: reportTitle,
      generatedAt: now.toISOString(),
      config,
      summary: { ...summary, latest: summary.latest, latestBurst: summary.latestBurst },
      assumptions,
      limitations,
      keyCalculations: keyCalcs.map(([k, v]) => ({ name: k, value: v })),
      burstCutoff: burstK,
      observations,
    };
    downloadText(JSON.stringify(data, null, 2), 'traffic-report.json', 'application/json');
  }

  function downloadReport() {
    downloadText(buildReportText(), 'traffic-report.txt', 'text/plain');
  }

  return (
    <div className="space-y-5">
      <div className="no-print">
        <SectionTitle
          title="Reports & Export"
          subtitle="Generate and download analysis reports"
          icon={<FileText size={18} />}
        />
        <Card title="Export Controls" subtitle="All buttons produce real downloadable files">
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadReport} className="btn-primary">
              <FileText size={16} /> Generate Analysis Report (.txt)
            </button>
            <button onClick={downloadCsv} className="btn-ghost">
              <FileSpreadsheet size={16} /> Download CSV
            </button>
            <button onClick={downloadJson} className="btn-ghost">
              <FileJson size={16} /> Download JSON
            </button>
            <button onClick={() => window.print()} className="btn-ghost">
              <Printer size={16} /> Print-friendly View
            </button>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card title={reportTitle} subtitle={`Generated: ${now.toLocaleString()}`}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summaryStats.map(([k, v]) => (
              <div key={k} className="glass p-3">
                <div className="text-xs text-slate-500 uppercase">{k}</div>
                <div className="font-mono text-slate-100 mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Mathematical Assumptions">
            <ul className="text-sm text-slate-300 space-y-1.5 list-disc list-inside">
              {assumptions.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </Card>
          <Card title="Detection Threshold">
            <div className="text-sm text-slate-300 space-y-2">
              <p>Significance α = <span className="font-mono text-electric-400">{config.alpha}</span></p>
              <p>Burst cutoff k* = <span className="font-mono text-accent-red">{burstK}</span> (P(X ≥ k*) ≤ α)</p>
              <p className="text-xs text-slate-500">α is a statistical decision threshold. A flagged observation is statistically unusual, not necessarily malicious.</p>
            </div>
          </Card>
        </div>

        <Card title="Graphical Summary">
          <TrafficChart observations={observations} expected={config.lambda} threshold={threshold} height={260} />
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Important Probability Calculations">
            <table className="w-full text-sm">
              <tbody>
                {keyCalcs.map(([k, v]) => (
                  <tr key={k} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-slate-400">{k}</td>
                    <td className="py-2 pr-4 font-mono text-electric-400">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Latest Classification">
            {summary.latest ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Interval</span>
                  <span className="font-mono text-slate-100">#{summary.latest.interval}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Observed / Expected</span>
                  <span className="font-mono text-slate-100">{summary.latest.observed} / {summary.latest.expected}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  <StatusBadge status={summary.latest.classification} size="sm" />
                </div>
              </div>
            ) : <p className="text-sm text-slate-400">No data.</p>}
          </Card>
        </div>

        <Card title="Limitations of the Model">
          <ul className="text-sm text-slate-300 space-y-1.5 list-disc list-inside">
            {limitations.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function fmt(p: number): string {
  if (!Number.isFinite(p)) return '—';
  if (p === 0) return '0';
  if (p < 1e-4) return p.toExponential(4);
  return p.toFixed(6);
}


