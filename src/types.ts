export type Classification = 'NORMAL' | 'ELEVATED' | 'BURST';

export interface Observation {
  interval: number;
  observed: number;
  expected: number;
  pmf: number;
  upperTail: number;
  classification: Classification;
  severity: number;
  severityLabel: string;
  consecutive: number;
  isInjectedBurst: boolean;
  rollingLambda?: number | null;
  rollingClassification?: Classification;
}

export interface SimConfig {
  lambda: number;
  intervals: number;
  alpha: number;
  burstIntensity: number;
  burstFrequency: number;
  seed: number;
  speed: number;
  windowSize: number;
  baselineMode: 'fixed' | 'adaptive';
}

export interface HistoryEvent {
  id: string;
  interval: number;
  observed: number;
  expected: number;
  upperTail: number;
  classification: Classification;
  severity: number;
  severityLabel: string;
  explanation: string;
  timestamp: number;
  lambda: number;
  alpha: number;
}

export type PageId =
  | 'overview'
  | 'simulator'
  | 'detection'
  | 'lab'
  | 'analytics'
  | 'whatif'
  | 'history'
  | 'reports'
  | 'about';
