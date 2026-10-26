import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { HistoryEvent, Observation, PageId, SimConfig } from '@/types';
import { DEFAULT_CONFIG, generateDataset, summarize } from '@/lib/simulation';
import { explainDetection } from '@/lib/poisson';

interface AppState {
  config: SimConfig;
  observations: Observation[];
  running: boolean;
  simTime: number;
  page: PageId;
  history: HistoryEvent[];
  setConfig: (c: Partial<SimConfig>) => void;
  setFullConfig: (c: SimConfig) => void;
  regenerate: (c?: Partial<SimConfig>) => void;
  toggleRun: () => void;
  reset: () => void;
  setPage: (p: PageId) => void;
  clearHistory: () => void;
  addHistoryFromObservation: (o: Observation, config: SimConfig) => void;
  exportHistory: () => HistoryEvent[];
}

const Ctx = createContext<AppState | null>(null);

const LS_KEY = 'poisson-traffic-app-v1';

interface Persisted {
  config: SimConfig;
  history: HistoryEvent[];
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Persisted;
    if (!p.config || typeof p.config.lambda !== 'number') return null;
    return p;
  } catch {
    return null;
  }
}

function savePersisted(p: Persisted) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    // ignore quota errors
  }
}

let eventCounter = 0;
function nextId() {
  eventCounter++;
  return `EVT-${Date.now().toString(36)}-${eventCounter}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const persisted = useRef<Persisted | null>(null);
  if (persisted.current === null) {
    persisted.current = loadPersisted();
  }
  const [config, setConfigState] = useState<SimConfig>(
    persisted.current?.config ?? DEFAULT_CONFIG,
  );
  const [observations, setObservations] = useState<Observation[]>(() =>
    generateDataset(persisted.current?.config ?? DEFAULT_CONFIG),
  );
  const [running, setRunning] = useState(true);
  const [simTime, setSimTime] = useState(0);
  const [page, setPage] = useState<PageId>('overview');
  const [history, setHistory] = useState<HistoryEvent[]>(
    persisted.current?.history ?? [],
  );

  // Persist config + history (not the live observations, those regenerate).
  useEffect(() => {
    savePersisted({ config, history });
  }, [config, history]);

  const setConfig = useCallback((c: Partial<SimConfig>) => {
    setConfigState((prev) => ({ ...prev, ...c }));
  }, []);

  const regenerate = useCallback((c?: Partial<SimConfig>) => {
    setConfigState((prev) => {
      const next = c ? { ...prev, ...c } : prev;
      setObservations(generateDataset(next));
      return next;
    });
  }, []);

  const setFullConfig = useCallback((c: SimConfig) => {
    setConfigState(c);
    setObservations(generateDataset(c));
  }, []);

  const toggleRun = useCallback(() => setRunning((r) => !r), []);

  const reset = useCallback(() => {
    setConfigState(DEFAULT_CONFIG);
    setObservations(generateDataset(DEFAULT_CONFIG));
    setRunning(true);
    setSimTime(0);
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const addHistoryFromObservation = useCallback(
    (o: Observation, cfg: SimConfig) => {
      const evt: HistoryEvent = {
        id: nextId(),
        interval: o.interval,
        observed: o.observed,
        expected: o.expected,
        upperTail: o.upperTail,
        classification: o.classification,
        severity: o.severity,
        severityLabel: o.severityLabel,
        explanation: explainDetection(o.observed, o.expected, o.upperTail, cfg.alpha, o.classification),
        timestamp: Date.now(),
        lambda: cfg.lambda,
        alpha: cfg.alpha,
      };
      setHistory((h) => [evt, ...h].slice(0, 500));
    },
    [],
  );

  const exportHistory = useCallback(() => history, [history]);

  // Simulated clock — advances while running. Drives the "live" feel.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSimTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const value = useMemo<AppState>(
    () => ({
      config,
      observations,
      running,
      simTime,
      page,
      history,
      setConfig,
      setFullConfig,
      regenerate,
      toggleRun,
      reset,
      setPage,
      clearHistory,
      addHistoryFromObservation,
      exportHistory,
    }),
    [config, observations, running, simTime, page, history, setConfig, setFullConfig, regenerate, toggleRun, reset, clearHistory, addHistoryFromObservation, exportHistory],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}

export function useSummary() {
  const { observations, config } = useApp();
  return useMemo(() => summarize(observations, config), [observations, config]);
}
