import { useMemo, useState } from 'react';
import { FlaskConical, Calculator, Sigma, BookOpen, AlertCircle } from 'lucide-react';

import { Card, SectionTitle, ProbabilityCell } from '@/components/ui';
import { NumberInput, SliderInput } from '@/components/inputs';
import { PmfChart } from '@/components/charts';
import {
  poissonPmf,
  poissonCdf,
  poissonUpperTail,
  expectedValue,
  variance,
  stdDev,
  validateInputs,
  logPmf,
  logGamma,
} from '@/lib/poisson';

export function LabPage() {
  const [lambda, setLambda] = useState(20);
  const [k, setK] = useState(35);
  const [alpha, setAlpha] = useState(0.01);
  const [showSteps, setShowSteps] = useState(false);

  const error = validateInputs(lambda, k, alpha);

  const pmf = useMemo(() => (error ? NaN : poissonPmf(k, lambda)), [k, lambda, error]);
  const cdf = useMemo(() => (error ? NaN : poissonCdf(k, lambda)), [k, lambda, error]);
  const upper = useMemo(() => (error ? NaN : poissonUpperTail(k, lambda)), [k, lambda, error]);
  const ev = expectedValue(lambda);
  const varX = variance(lambda);
  const sd = stdDev(lambda);

  const table = useMemo(() => {
    if (error) return [];
    const from = Math.max(0, k - 5);
    const to = k + 5;
    const rows: { k: number; pmf: number; cdf: number; upper: number }[] = [];
    for (let kk = from; kk <= to; kk++) {
      rows.push({
        k: kk,
        pmf: poissonPmf(kk, lambda),
        cdf: poissonCdf(kk, lambda),
        upper: poissonUpperTail(kk, lambda),
      });
    }
    return rows;
  }, [k, lambda, error]);

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Poisson Probability Lab"
        subtitle="Explore the distribution that powers the burst detector"
        icon={<FlaskConical size={18} />}
      />

      <Card title="The Poisson Distribution">
        <div className="grid md:grid-cols-2 gap-4 items-center">
          <div className="font-mono text-base text-electric-400 bg-navy-900/60 p-4 rounded-lg border border-white/5 text-center">
            P(X = k) = (e<sup>−λ</sup> · λ<sup>k</sup>) / k!
          </div>
          <div className="text-sm text-slate-300 space-y-1.5">
            <p><span className="text-electric-400 font-mono">λ</span> — expected number of events in a fixed interval</p>
            <p><span className="text-electric-400 font-mono">k</span> — observed number of events</p>
            <p><span className="text-electric-400 font-mono">e</span> — Euler's number ≈ 2.71828</p>
            <p><span className="text-electric-400 font-mono">k!</span> — factorial of k</p>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Inputs" className="lg:col-span-1">
          <div className="space-y-4">
            <NumberInput label="λ (expected rate)" value={lambda} min={0} max={500} step={1} onChange={setLambda} />
            <SliderInput label="λ slider" value={lambda} min={0} max={60} step={1} onChange={(v) => setLambda(Math.round(v))} />
            <NumberInput label="k (observed count)" value={k} min={0} max={1000} step={1} onChange={(v) => setK(Math.round(v))} />
            <SliderInput label="k slider" value={k} min={0} max={Math.max(80, lambda * 3)} step={1} onChange={(v) => setK(Math.round(v))} />
            <NumberInput label="α (threshold)" value={alpha} min={0.0001} max={0.5} step={0.001} onChange={setAlpha} />
          </div>
        </Card>

        <Card title="Probability Mass Function" className="lg:col-span-2" subtitle="Yellow bar = k, red region = upper tail">
          {!error ? (
            <PmfChart lambda={lambda} highlightK={k} height={300} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-accent-red text-sm">
              <AlertCircle size={20} className="mr-2" /> {error}
            </div>
          )}
        </Card>
      </div>

      {!error && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ResultCard label="P(X = k) exact" value={fmt(pmf)} tone="default" icon={Sigma} />
            <ResultCard label="P(X ≤ k) cumulative" value={fmt(cdf)} tone="cyan" icon={Sigma} />
            <ResultCard label="P(X ≥ k) upper-tail" value={fmt(upper)} tone="red" icon={Sigma} />
            <ResultCard label="E[X] = λ" value={ev.toFixed(2)} tone="default" icon={Calculator} />
            <ResultCard label="Var(X) = λ" value={varX.toFixed(2)} tone="default" icon={Calculator} />
            <ResultCard label="Std dev = √λ" value={sd.toFixed(3)} tone="cyan" icon={Calculator} />
          </div>

          <Card title="Step-by-Step Calculation">
            <button onClick={() => setShowSteps((s) => !s)} className="btn-ghost">
              <BookOpen size={16} /> {showSteps ? 'Hide' : 'Show'} Step-by-Step Calculation
            </button>
            {showSteps && (
              <div className="mt-4 space-y-3 text-sm font-mono text-slate-300 bg-navy-900/60 p-4 rounded-lg border border-white/5">
                <div>Given: λ = {lambda}, k = {k}</div>
                <div>1. ln P(X=k) = k·ln(λ) − λ − lnΓ(k+1)</div>
                <div>
                  &nbsp;&nbsp;= {k}·ln({lambda}) − {lambda} − lnΓ({k + 1})
                </div>
                <div>
                  &nbsp;&nbsp;= {k}·{Math.log(lambda).toFixed(5)} − {lambda} − {logGamma(k + 1).toFixed(5)}
                </div>
                <div>
                  &nbsp;&nbsp;= {(k * Math.log(lambda) - lambda - logGamma(k + 1)).toFixed(5)}
                </div>
                <div>
                  2. P(X=k) = e<sup>{(logPmf(k, lambda)).toFixed(5)}</sup> ={' '}
                  <span className="text-electric-400">{pmf.toExponential(6)}</span>
                </div>
                <div>3. Upper-tail: P(X ≥ k) = Σ<sub>i=k..∞</sub> P(X=i)</div>
                <div>
                  &nbsp;&nbsp;Computed via stable forward recursion from P(X=k):{' '}
                  <span className="text-accent-red">{upper.toExponential(6)}</span>
                </div>
                <div>
                  4. Cumulative: P(X ≤ k) = 1 − P(X ≥ k+1) ={' '}
                  <span className="text-cyan-400">{cdf.toFixed(8)}</span>
                </div>
                <div className="text-xs text-slate-500 pt-2 border-t border-white/5">
                  Note: we compute the upper tail by direct summation from k upward rather than
                  1 − P(X ≤ k−1), to avoid subtracting nearly-equal floating-point values.
                </div>
              </div>
            )}
          </Card>

          <Card title="Worked Example" subtitle="The example referenced throughout the project">
            <div className="text-sm text-slate-300 space-y-2">
              <p>
                Expected rate = 20 packets/s → λ = 20. Observed = 35 packets in one second.
              </p>
              <p className="font-mono text-xs bg-navy-900/60 p-3 rounded-lg border border-white/5">
                P(X = 35) = (e⁻²⁰ · 20³⁵) / 35! = {poissonPmf(35, 20).toExponential(4)}
                <br />
                P(X ≥ 35) = 1 − P(X ≤ 34) = {poissonUpperTail(35, 20).toExponential(4)}
              </p>
              <p>
                The exact probability P(X = 35) and the upper-tail P(X ≥ 35) are{' '}
                <span className="text-electric-400">different</span>: the exact probability is the
                chance of seeing exactly 35, while the upper-tail is the chance of seeing 35 or more.
                Burst detection uses the upper-tail because we care about counts that are at least
                this high.
              </p>
            </div>
          </Card>

          <Card title="Probability Distribution Table (k ± 5)">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-white/5">
                    <th className="py-2 pr-4">k</th>
                    <th className="py-2 pr-4">P(X = k)</th>
                    <th className="py-2 pr-4">P(X ≤ k)</th>
                    <th className="py-2 pr-4">P(X ≥ k)</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((r) => (
                    <tr
                      key={r.k}
                      className={`border-b border-white/5 ${r.k === k ? 'bg-electric-500/10' : ''}`}
                    >
                      <td className="py-2 pr-4 font-mono text-slate-100">{r.k}{r.k === k && <span className="text-electric-400 ml-1">◆</span>}</td>
                      <td className="py-2 pr-4"><ProbabilityCell p={r.pmf} /></td>
                      <td className="py-2 pr-4 font-mono text-slate-300">{fmt(r.cdf)}</td>
                      <td className="py-2 pr-4"><ProbabilityCell p={r.upper} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Numerical Stability Notes">
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Probabilities use log-gamma to avoid factorial overflow for large k.</li>
              <li>Cumulative and upper-tail use forward recursion, not 1 − (near 1).</li>
              <li>λ = 0 → P(X = 0) = 1, all other k → 0. Handled correctly.</li>
              <li>All probabilities stay within [0, 1]; Σ P(X = k) over k = 0..∞ ≈ 1.</li>
              <li>Same inputs always yield identical outputs (deterministic).</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function fmt(p: number): string {
  if (!Number.isFinite(p)) return '—';
  if (p === 0) return '0';
  if (p < 1e-4) return p.toExponential(4);
  return p.toFixed(6);
}

function ResultCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: 'default' | 'cyan' | 'red';
  icon: React.ComponentType<{ size?: number }>;
}) {
  const toneCls =
    tone === 'red' ? 'text-accent-red' : tone === 'cyan' ? 'text-cyan-400' : 'text-electric-400';
  return (
    <div className="glass p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500 uppercase">
        <Icon size={14} /> {label}
      </div>
      <div className={`text-lg font-mono mt-1 ${toneCls}`}>{value}</div>
    </div>
  );
}


