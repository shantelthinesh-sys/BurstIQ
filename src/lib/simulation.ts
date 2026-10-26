import type { Observation, SimConfig } from '@/types';
import {
  poissonPmf,
  poissonUpperTail,
  classify,
  severityScore,
  stdDev,
} from './poisson';

/** Mulberry32 — small, fast, seeded PRNG. Deterministic for a given seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sample from Poisson(lambda) using Knuth's algorithm for small lambda,
 * and a normal approximation (with continuity) for large lambda to stay
 * performant and avoid long loops for big rates.
 */
export function samplePoisson(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0;
  if (lambda < 30) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rng();
    } while (p > L);
    return k - 1;
  }
  // For large lambda, Poisson(lambda) ~ Normal(lambda, lambda).
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const val = Math.round(lambda + Math.sqrt(lambda) * z);
  return Math.max(0, val);
}

/** Default demonstration configuration. */
export const DEFAULT_CONFIG: SimConfig = {
  lambda: 20,
  intervals: 100,
  alpha: 0.01,
  burstIntensity: 2.5,
  burstFrequency: 0.06,
  seed: 12345,
  speed: 1,
  windowSize: 10,
  baselineMode: 'fixed',
};

export interface Preset {
  id: string;
  name: string;
  description: string;
  config: Partial<SimConfig>;
}

export const PRESETS: Preset[] = [
  {
    id: 'stable',
    name: 'Stable Network',
    description: 'Low variance, no injected bursts. Baseline Poisson traffic only.',
    config: { lambda: 20, burstIntensity: 0, burstFrequency: 0, alpha: 0.01 },
  },
  {
    id: 'moderate',
    name: 'Moderate Traffic Variation',
    description: 'Baseline Poisson with occasional mild spikes.',
    config: { lambda: 20, burstIntensity: 1.5, burstFrequency: 0.04, alpha: 0.01 },
  },
  {
    id: 'occasional',
    name: 'Occasional Traffic Bursts',
    description: 'A few clear bursts suitable for demonstrating detection.',
    config: { lambda: 20, burstIntensity: 2.5, burstFrequency: 0.06, alpha: 0.01 },
  },
  {
    id: 'heavy',
    name: 'Heavy Traffic Bursts',
    description: 'Frequent, intense bursts that stress the detector.',
    config: { lambda: 25, burstIntensity: 3.5, burstFrequency: 0.14, alpha: 0.01 },
  },
  {
    id: 'custom',
    name: 'Custom Configuration',
    description: 'Use the manual inputs below.',
    config: {},
  },
];

/** Rolling mean of the last `window` observed counts (adaptive baseline). */
function rollingMean(obs: number[], index: number, window: number): number {
  const start = Math.max(0, index - window + 1);
  const slice = obs.slice(start, index + 1);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * Generate a full dataset of observations for the given config.
 *
 * Baseline counts are drawn from Poisson(lambda). At roughly
 * `burstFrequency` of intervals we inject a burst by sampling from
 * Poisson(lambda * burstIntensity) instead. Each injected burst is
 * recorded so we can mark `isInjectedBurst` (useful for evaluation
 * without leaking that flag into the classifier).
 */
export function generateDataset(config: SimConfig): Observation[] {
  const rng = mulberry32(config.seed);
  const { lambda, intervals, alpha, burstIntensity, burstFrequency, windowSize, baselineMode } =
    config;
  const observed: number[] = [];
  const injected: boolean[] = [];
  for (let i = 0; i < intervals; i++) {
    const isBurst = burstIntensity > 0 && rng() < burstFrequency;
    const rate = isBurst ? lambda * burstIntensity : lambda;
    const k = samplePoisson(rate, rng);
    observed.push(k);
    injected.push(isBurst);
  }

  const observations: Observation[] = [];
  let run = 0; // consecutive flagged (ELEVATED or BURST) run length
  for (let i = 0; i < intervals; i++) {
    const k = observed[i];
    const useRolling = baselineMode === 'adaptive';
    const rolling = rollingMean(observed, i, windowSize);
    const baseForClass = useRolling ? rolling : lambda;
    const tail = poissonUpperTail(k, baseForClass);
    const cls = classify(k, baseForClass, tail, alpha);
    if (cls === 'BURST' || cls === 'ELEVATED') run++;
    else run = 0;
    const { score, label } = severityScore(k, baseForClass, tail, run);
    const pmf = poissonPmf(k, baseForClass);
    let rollingCls: Classification | undefined;
    let rollingTail: number | undefined;
    if (!useRolling) {
      rollingTail = poissonUpperTail(k, rolling);
      rollingCls = classify(k, rolling, rollingTail, alpha);
    }
    observations.push({
      interval: i + 1,
      observed: k,
      expected: lambda,
      pmf,
      upperTail: tail,
      classification: cls,
      severity: score,
      severityLabel: label,
      consecutive: run,
      isInjectedBurst: injected[i],
      rollingLambda: useRolling ? Number(rolling.toFixed(3)) : Number(rolling.toFixed(3)),
      rollingClassification: rollingCls,
    });
  }
  return observations;
}

/** Summary statistics over a dataset. */
export function summarize(observations: Observation[], config: SimConfig) {
  const n = observations.length;
  if (n === 0) {
    return {
      n: 0,
      mean: 0,
      variance: 0,
      vmr: 0,
      bursts: 0,
      elevated: 0,
      normal: 0,
      flaggedPct: 0,
      maxObserved: 0,
      latest: null as Observation | null,
      latestBurst: null as Observation | null,
      avgTail: 0,
    };
  }
  const counts = observations.map((o) => o.observed);
  const mean = counts.reduce((a, b) => a + b, 0) / n;
  const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const vmr = mean > 0 ? variance / mean : 0;
  const bursts = observations.filter((o) => o.classification === 'BURST').length;
  const elevated = observations.filter((o) => o.classification === 'ELEVATED').length;
  const normal = observations.filter((o) => o.classification === 'NORMAL').length;
  const latest = observations[n - 1];
  const latestBurst = [...observations].reverse().find((o) => o.classification === 'BURST') ?? null;
  const avgTail = observations.reduce((a, b) => a + b.upperTail, 0) / n;
  return {
    n,
    mean,
    variance,
    vmr,
    bursts,
    elevated,
    normal,
    flaggedPct: ((bursts + elevated) / n) * 100,
    maxObserved: Math.max(...counts),
    latest,
    latestBurst,
    avgTail,
  };
}

/** Threshold line value for charts (the k where bursts begin). */
export function thresholdLineValue(config: SimConfig): number {
  const base = config.baselineMode === 'adaptive' ? config.lambda : config.lambda;
  // Use a small inline approximation: mean + z_alpha * sd
  // For alpha=0.01, z≈2.326. Keeps charts fast without scanning every k.
  return Math.ceil(base + 2.326 * stdDev(base));
}
