import type { Classification } from '@/types';

/**
 * Numerically stable Poisson distribution utilities.
 *
 * All probabilities are computed using log-gamma to avoid overflow from
 * large factorials. We rely on the Lanczos approximation of logGamma,
 * which is accurate enough for the demonstration range used here
 * (lambda, k up to a few thousand).
 */

const LOG_2PI = Math.log(2 * Math.PI);
const LANCZOS_G = 7;
const LANCZOS_C = [
  0.9999999999998094,
  676.5203681218851,
  -1259.1392167224028,
  771.323428777653,
  -176.6150291621406,
  12.507343278686905,
  -0.13857109526572012,
  9.984369578019572e-6,
  1.5056327351493116e-7,
];

/** Natural log of gamma(x) via the Lanczos approximation. */
export function logGamma(x: number): number {
  if (x < 0.5) {
    // Reflection formula: Gamma(x)Gamma(1-x) = pi / sin(pi x)
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x);
  }
  const z = x - 1;
  let a = LANCZOS_C[0];
  for (let i = 1; i < LANCZOS_G + 2; i++) a += LANCZOS_C[i] / (z + i);
  return 0.5 * (LOG_2PI + Math.log(LANCZOS_G + 0.5 + z)) + (z + 0.5) * Math.log(LANCZOS_G + 0.5 + z) - (LANCZOS_G + 0.5 + z) + Math.log(a);
}

/** Gamma(x) — may overflow for large x; prefer logGamma-based paths. */
export function gamma(x: number): number {
  return Math.exp(logGamma(x));
}

/**
 * log( P(X = k) ) for X ~ Poisson(lambda).
 * Uses: log P = k*log(lambda) - lambda - logGamma(k+1).
 */
export function logPmf(k: number, lambda: number): number {
  if (lambda < 0 || k < 0 || !Number.isFinite(k)) return -Infinity;
  if (lambda === 0) return k === 0 ? 0 : -Infinity;
  return k * Math.log(lambda) - lambda - logGamma(k + 1);
}

/** Exact probability P(X = k) for X ~ Poisson(lambda). */
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  return Math.exp(logPmf(k, lambda));
}

/**
 * Cumulative probability P(X <= k) for X ~ Poisson(lambda).
 *
 * Uses the numerically stable recursive summation:
 *   P(X=0) = e^-lambda
 *   P(X=i) = P(X=i-1) * lambda / i
 * Summing from 0 upward avoids catastrophic cancellation between large
 * nearly-equal terms (which 1 - upperTail would otherwise cause).
 */
export function poissonCdf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (lambda <= 0) return k >= 0 ? 1 : 0;
  if (k === 0) return Math.exp(-lambda);
  // Sum from 0 up to k. If lambda is very large, start near the mode for stability.
  if (lambda > 30 && k > lambda) {
    // Sum the upper tail instead and subtract from 1 — better conditioned here
    // because k is above the mean and the tail is the smaller quantity.
    return 1 - poissonUpperTail(k + 1, lambda);
  }
  let p = Math.exp(-lambda); // P(X=0)
  let cdf = p;
  for (let i = 1; i <= k; i++) {
    p *= lambda / i;
    cdf += p;
    if (p < 1e-20 && i > lambda) break; // negligible remainder
  }
  return Math.min(1, Math.max(0, cdf));
}

/**
 * Upper-tail probability P(X >= k) for X ~ Poisson(lambda).
 *
 * Computed directly by summing from k upward using the recursion
 * P(X=i+1) = P(X=i) * lambda / (i+1), starting from P(X=k) via logPmf.
 * This avoids subtracting two nearly-equal large CDF values and is
 * accurate even when P(X <= k-1) and 1 are within floating-point error.
 */
export function poissonUpperTail(k: number, lambda: number): number {
  if (k <= 0) return 1;
  if (lambda < 0) return NaN;
  if (lambda === 0) return k <= 0 ? 1 : 0;
  if (!Number.isInteger(k)) return NaN;
  // Start exactly at P(X=k).
  let p = Math.exp(logPmf(k, lambda));
  let tail = p;
  // Tail decays after the mode; cap iterations to avoid infinite loops.
  const maxIter = k + 100000;
  for (let i = k + 1; i <= maxIter; i++) {
    p *= lambda / i;
    if (p < 1e-20) break;
    tail += p;
    if (tail >= 1) return 1;
  }
  return Math.min(1, Math.max(0, tail));
}

/** Expected value E[X] = lambda. */
export function expectedValue(lambda: number): number {
  return lambda;
}

/** Variance Var(X) = lambda. */
export function variance(lambda: number): number {
  return lambda;
}

/** Standard deviation = sqrt(lambda). */
export function stdDev(lambda: number): number {
  return Math.sqrt(lambda);
}

/** Threshold count above which P(X >= k) <= alpha (burst cutoff). */
export function burstThreshold(lambda: number, alpha: number): number {
  if (lambda <= 0) return 1;
  // Walk upward from the mean until the upper tail crosses alpha.
  let k = Math.max(0, Math.floor(lambda));
  // safety bound: Poisson upper tail crosses alpha well within lambda + 12*sqrt(lambda)+1
  const upper = Math.ceil(lambda + 12 * Math.sqrt(lambda) + 1);
  while (k <= upper) {
    if (poissonUpperTail(k, lambda) <= alpha) return k;
    k++;
  }
  return upper;
}

/** Classify an observation given its upper-tail probability and config. */
export function classify(
  observed: number,
  lambda: number,
  upperTail: number,
  alpha: number,
): Classification {
  if (upperTail <= alpha) return 'BURST';
  if (observed > lambda) return 'ELEVATED';
  return 'NORMAL';
}

/**
 * Heuristic burst severity score (0–100). Deterministic for a given
 * observation + config. NOT a calibrated probability of attack.
 *
 * Factors:
 *   - upper-tail probability (statistical rarity)
 *   - excess packets above the expected rate
 *   - consecutive flagged intervals
 *
 * Score = w1 * rarityComponent + w2 * excessComponent + w3 * consecutiveComponent
 *   rarityComponent    = clamp( -log10(max(p,1e-12)) / 6 , 0, 1 )   // 1e-6 ~ 1
 *   excessComponent    = clamp( (k - lambda) / (3*sqrt(lambda)+1), 0, 1 )
 *   consecutiveComponent = clamp( consecutive / 5, 0, 1 )
 * Weights: 0.55, 0.30, 0.15.
 */
export function severityScore(
  observed: number,
  lambda: number,
  upperTail: number,
  consecutive: number,
): { score: number; label: string } {
  if (lambda < 0 || observed < 0) return { score: 0, label: 'None' };
  const p = Math.max(upperTail, 1e-12);
  const rarity = Math.min(1, Math.max(0, -Math.log10(p) / 6));
  const denom = 3 * Math.sqrt(Math.max(lambda, 1)) + 1;
  const excess = Math.min(1, Math.max(0, (observed - lambda) / denom));
  const consec = Math.min(1, Math.max(0, consecutive / 5));
  const raw = 0.55 * rarity + 0.3 * excess + 0.15 * consec;
  const score = Math.round(Math.min(100, Math.max(0, raw * 100)));
  let label = 'Low';
  if (score >= 75) label = 'Critical';
  else if (score >= 50) label = 'High';
  else if (score >= 25) label = 'Moderate';
  return { score, label };
}

/** Human-readable explanation for a flagged observation. */
export function explainDetection(
  observed: number,
  lambda: number,
  upperTail: number,
  alpha: number,
  classification: Classification,
): string {
  const pStr = upperTail < 1e-4 ? upperTail.toExponential(3) : upperTail.toFixed(5);
  if (classification === 'BURST') {
    return `The interval contained ${observed} packets, while the expected count was ${lambda}. The probability of observing ${observed} or more packets under the selected Poisson model was ${pStr}, which is at or below the configured threshold of ${alpha}. Therefore, this observation was flagged as a potential traffic burst.`;
  }
  if (classification === 'ELEVATED') {
    return `The interval contained ${observed} packets versus an expected ${lambda}. The upper-tail probability ${pStr} did not cross the threshold ${alpha}, so the observation is elevated but not statistically flagged as a burst.`;
  }
  return `The interval contained ${observed} packets versus an expected ${lambda}. The upper-tail probability ${pStr} is comfortably above the threshold ${alpha}, so traffic is classified as normal.`;
}

/** Validate numeric inputs. Returns null if valid, else an error message. */
export function validateInputs(lambda: number, k: number, alpha: number): string | null {
  if (!Number.isFinite(lambda) || lambda < 0) return 'Lambda must be a nonnegative number.';
  if (!Number.isFinite(k) || k < 0 || !Number.isInteger(k))
    return 'Observed packet count must be a nonnegative integer.';
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1)
    return 'Alpha must be greater than 0 and less than 1.';
  return null;
}

/** PMF array over a range of k values, for charting. */
export function pmfRange(lambda: number, fromK: number, toK: number): { k: number; p: number }[] {
  const out: { k: number; p: number }[] = [];
  for (let k = Math.max(0, fromK); k <= toK; k++) out.push({ k, p: poissonPmf(k, lambda) });
  return out;
}

/** Reasonable chart x-range around the mean for a given lambda. */
export function chartRange(lambda: number, extra = 4): { from: number; to: number } {
  const sd = stdDev(lambda);
  const from = Math.max(0, Math.floor(lambda - extra * sd));
  const to = Math.ceil(lambda + extra * sd);
  return { from, to };
}
