import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ComposedChart,
} from 'recharts';
import type { Observation } from '@/types';
import { poissonPmf } from '@/lib/poisson';

const axisStyle = { fontSize: 11, fill: '#94a3b8' };
const gridStroke = 'rgba(148,163,184,0.12)';

function TrafficTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const obs = payload.find((p: any) => p.dataKey === 'observed');
  const cls = obs?.payload?.classification;
  const clsLabel = cls === 'BURST' ? 'BURST' : cls === 'ELEVATED' ? 'ELEVATED' : 'NORMAL';
  const clsColor = cls === 'BURST' ? '#f87171' : cls === 'ELEVATED' ? '#fbbf24' : '#34d399';
  return (
    <div className="rounded-lg border border-electric-500/30 bg-navy-900/95 px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-slate-100 mb-1">Interval {label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-mono text-slate-100">{Number(p.value).toFixed(2)}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <span className="w-2 h-2 rounded-full" style={{ background: clsColor }} />
        <span className="text-slate-400">Status:</span>
        <span style={{ color: clsColor }} className="font-semibold">
          {clsLabel}
        </span>
      </div>
    </div>
  );
}

export function TrafficChart({
  observations,
  expected,
  threshold,
  height = 280,
  showBurstHighlight = true,
}: {
  observations: Observation[];
  expected: number;
  threshold: number;
  height?: number;
  showBurstHighlight?: boolean;
}) {
  const data = observations.map((o) => ({
    interval: o.interval,
    observed: o.observed,
    expected,
    threshold,
    classification: o.classification,
    upperTail: o.upperTail,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="obsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="burstGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#f87171" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="interval" tick={axisStyle} stroke={gridStroke} />
        <YAxis tick={axisStyle} stroke={gridStroke} />
        <Tooltip content={<TrafficTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {showBurstHighlight &&
          data.map((d) =>
            d.classification === 'BURST' ? (
              <ReferenceLine
                key={`b-${d.interval}`}
                x={d.interval}
                stroke="#f87171"
                strokeOpacity={0.15}
                strokeWidth={6}
              />
            ) : null,
          )}
        <Area
          type="monotone"
          dataKey="observed"
          name="Observed"
          stroke="#0ea5e9"
          strokeWidth={2}
          fill="url(#obsGrad)"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="expected"
          name="Expected λ"
          stroke="#22d3ee"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="threshold"
          name="Burst threshold"
          stroke="#fbbf24"
          strokeWidth={1.5}
          strokeDasharray="2 2"
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function PmfChart({
  lambda,
  highlightK,
  showUpperTail = true,
  height = 280,
}: {
  lambda: number;
  highlightK: number;
  showUpperTail?: boolean;
  height?: number;
}) {
  if (lambda < 0) return null;
  const from = Math.max(0, Math.floor(lambda - 4 * Math.sqrt(Math.max(lambda, 1))));
  const to = Math.ceil(lambda + 5 * Math.sqrt(Math.max(lambda, 1)) + Math.max(highlightK - lambda, 0) + 4);
  const data: { k: number; p: number; fill: string }[] = [];
  for (let k = from; k <= to; k++) {
    const p = poissonPmf(k, lambda);
    let fill = '#0ea5e9';
    if (showUpperTail && k >= highlightK) fill = '#f87171';
    if (k === highlightK) fill = '#fbbf24';
    data.push({ k, p, fill });
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="k" tick={axisStyle} stroke={gridStroke} />
        <YAxis tick={axisStyle} stroke={gridStroke} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(10,17,36,0.95)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: any) => [Number(v).toExponential(4), 'P(X=k)']}
          labelFormatter={(l: any) => `k = ${l}`}
        />
        <Bar dataKey="p" name="P(X=k)" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
        <ReferenceLine x={lambda} stroke="#22d3ee" strokeDasharray="4 4" label={{ value: 'E[X]=λ', fill: '#22d3ee', fontSize: 10, position: 'top' }} />
        {highlightK !== lambda && (
          <ReferenceLine x={highlightK} stroke="#fbbf24" strokeDasharray="2 2" label={{ value: 'k', fill: '#fbbf24', fontSize: 10, position: 'top' }} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ClassificationChart({
  normal,
  elevated,
  burst,
  height = 240,
}: {
  normal: number;
  elevated: number;
  burst: number;
  height?: number;
}) {
  const data = [
    { name: 'Normal', value: normal, fill: '#34d399' },
    { name: 'Elevated', value: elevated, fill: '#fbbf24' },
    { name: 'Burst', value: burst, fill: '#f87171' },
  ];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="name" tick={axisStyle} stroke={gridStroke} />
        <YAxis tick={axisStyle} stroke={gridStroke} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(10,17,36,0.95)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" name="Intervals" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DeviationChart({
  observations,
  height = 240,
}: {
  observations: Observation[];
  height?: number;
}) {
  const data = observations.map((o) => ({
    interval: o.interval,
    deviation: o.observed - o.expected,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="interval" tick={axisStyle} stroke={gridStroke} />
        <YAxis tick={axisStyle} stroke={gridStroke} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(10,17,36,0.95)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: any) => [Number(v).toFixed(2), 'Deviation']}
          labelFormatter={(l: any) => `Interval ${l}`}
        />
        <ReferenceLine y={0} stroke="#64748b" />
        <Bar dataKey="deviation" name="Observed − Expected" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.deviation >= 0 ? '#0ea5e9' : '#64748b'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ObservedVsExpectedChart({
  observations,
  height = 240,
}: {
  observations: Observation[];
  height?: number;
}) {
  const data = observations.map((o) => ({
    interval: o.interval,
    observed: o.observed,
    expected: o.expected,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="interval" tick={axisStyle} stroke={gridStroke} />
        <YAxis tick={axisStyle} stroke={gridStroke} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(10,17,36,0.95)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(l: any) => `Interval ${l}`}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="observed" name="Observed" stroke="#0ea5e9" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="expected" name="Expected" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BurstFrequencyChart({
  observations,
  windowSize = 10,
  height = 240,
}: {
  observations: Observation[];
  windowSize?: number;
  height?: number;
}) {
  if (observations.length === 0) return null;
  const windows: { window: string; bursts: number }[] = [];
  for (let i = 0; i < observations.length; i += windowSize) {
    const slice = observations.slice(i, i + windowSize);
    const bursts = slice.filter((o) => o.classification === 'BURST').length;
    windows.push({
      window: `${slice[0].interval}-${slice[slice.length - 1].interval}`,
      bursts,
    });
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={windows} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="window" tick={axisStyle} stroke={gridStroke} />
        <YAxis tick={axisStyle} stroke={gridStroke} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(10,17,36,0.95)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: any) => [v, 'Bursts']}
          labelFormatter={(l: any) => `Intervals ${l}`}
        />
        <Bar dataKey="bursts" name="Bursts" fill="#f87171" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BaselineCompareChart({
  observations,
  fixedLambda,
  height = 260,
}: {
  observations: Observation[];
  fixedLambda: number;
  height?: number;
}) {
  const data = observations.map((o) => ({
    interval: o.interval,
    fixed: fixedLambda,
    rolling: o.rollingLambda ?? fixedLambda,
    observed: o.observed,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="interval" tick={axisStyle} stroke={gridStroke} />
        <YAxis tick={axisStyle} stroke={gridStroke} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(10,17,36,0.95)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(l: any) => `Interval ${l}`}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="observed" name="Observed" stroke="#0ea5e9" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="fixed" name="Fixed λ" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="rolling" name="Rolling λ" stroke="#fbbf24" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
