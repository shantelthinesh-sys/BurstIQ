import { useMemo, useState } from 'react';
import { History, Search, ArrowUpDown, Trash2, Download, Eye, X } from 'lucide-react';
import { useApp } from '@/store';
import { Card, SectionTitle, StatusBadge, SeverityPill, ProbabilityCell, EmptyState } from '@/components/ui';
import type { Classification, HistoryEvent } from '@/types';

type SortKey = 'interval' | 'observed' | 'upperTail' | 'severity' | 'timestamp';

export function HistoryPage() {
  const { history, clearHistory } = useApp();
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<'ALL' | Classification>('ALL');
  const [probMax, setProbMax] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortAsc, setSortAsc] = useState(false);
  const [detail, setDetail] = useState<HistoryEvent | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    let rows = history.slice();
    if (classFilter !== 'ALL') rows = rows.filter((r) => r.classification === classFilter);
    if (probMax < 1) rows = rows.filter((r) => r.upperTail <= probMax);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          String(r.interval).includes(q) ||
          String(r.observed).includes(q) ||
          r.explanation.toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
    return rows;
  }, [history, classFilter, probMax, query, sortKey, sortAsc]);

  function exportCsv() {
    const headers = [
      'id','timestamp','interval','observed','expected','upperTail','classification','severity','severityLabel','lambda','alpha','explanation',
    ];
    const lines = [headers.join(',')];
    for (const r of filtered) {
      const row = [
        r.id,
        new Date(r.timestamp).toISOString(),
        r.interval,
        r.observed,
        r.expected,
        r.upperTail,
        r.classification,
        r.severity,
        r.severityLabel,
        r.lambda,
        r.alpha,
        `"${r.explanation.replace(/"/g, '""')}"`,
      ];
      lines.push(row.join(','));
    }
    download(lines.join('\n'), 'detection-history.csv', 'text/csv');
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Detection History"
        subtitle="Saved flagged observations with search, sort, and filter"
        icon={<History size={18} />}
      />

      <Card title="Filters & Search">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="label">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="input pl-9"
                placeholder="ID, interval, count…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Classification</label>
            <select
              className="input"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value as 'ALL' | Classification)}
            >
              <option value="ALL">All</option>
              <option value="NORMAL">Normal</option>
              <option value="ELEVATED">Elevated</option>
              <option value="BURST">Burst</option>
            </select>
          </div>
          <div>
            <label className="label">Max P(X ≥ k): {probMax < 1 ? probMax.toFixed(2) : 'all'}</label>
            <input
              type="range"
              className="w-full accent-electric-500"
              min={0.0001}
              max={1}
              step={0.01}
              value={probMax}
              onChange={(e) => setProbMax(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={exportCsv} className="btn-ghost flex-1">
              <Download size={16} /> Export CSV
            </button>
            {confirmClear ? (
              <button
                onClick={() => { clearHistory(); setConfirmClear(false); }}
                className="btn-danger"
              >
                Confirm
              </button>
            ) : (
              <button onClick={() => setConfirmClear(true)} className="btn-danger">
                <Trash2 size={16} /> Clear
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card title={`History (${filtered.length})`}>
        {filtered.length === 0 ? (
          <EmptyState message="No history events. Save events from the Burst Detection page." />
        ) : (
          <div className="overflow-x-auto scrollbar-thin max-h-[28rem]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-navy-850/95">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                  <Th label="Event ID" k="timestamp" sortKey={sortKey} sortAsc={sortAsc} onSort={(k) => { setSortKey(k); setSortAsc(sortKey === k ? !sortAsc : false); }} />
                  <Th label="Interval" k="interval" sortKey={sortKey} sortAsc={sortAsc} onSort={(k) => { setSortKey(k); setSortAsc(sortKey === k ? !sortAsc : false); }} />
                  <Th label="Observed" k="observed" sortKey={sortKey} sortAsc={sortAsc} onSort={(k) => { setSortKey(k); setSortAsc(sortKey === k ? !sortAsc : false); }} />
                  <th className="py-2 pr-4">Expected</th>
                  <Th label="P(X ≥ k)" k="upperTail" sortKey={sortKey} sortAsc={sortAsc} onSort={(k) => { setSortKey(k); setSortAsc(sortKey === k ? !sortAsc : false); }} />
                  <th className="py-2 pr-4">Class</th>
                  <Th label="Severity" k="severity" sortKey={sortKey} sortAsc={sortAsc} onSort={(k) => { setSortKey(k); setSortAsc(sortKey === k ? !sortAsc : false); }} />
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 pr-4 font-mono text-xs text-slate-500">{r.id}</td>
                    <td className="py-2 pr-4 font-mono text-slate-300">#{r.interval}</td>
                    <td className="py-2 pr-4 font-mono text-slate-100">{r.observed}</td>
                    <td className="py-2 pr-4 font-mono text-slate-300">{r.expected}</td>
                    <td className="py-2 pr-4"><ProbabilityCell p={r.upperTail} /></td>
                    <td className="py-2 pr-4"><StatusBadge status={r.classification} size="sm" /></td>
                    <td className="py-2 pr-4"><SeverityPill score={r.severity} label={r.severityLabel} /></td>
                    <td className="py-2 pr-4">
                      <button onClick={() => setDetail(r)} className="text-electric-400 hover:text-electric-300">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetail(null)}>
          <div className="glass-strong p-5 max-w-lg w-full max-h-[80vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200">Event Detail</h3>
              <button onClick={() => setDetail(null)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Event ID" value={detail.id} />
              <Row label="Time" value={new Date(detail.timestamp).toLocaleString()} />
              <Row label="Interval" value={`#${detail.interval}`} />
              <Row label="Observed / Expected" value={`${detail.observed} / ${detail.expected}`} />
              <Row label="λ / α" value={`${detail.lambda} / ${detail.alpha}`} />
              <Row label="P(X ≥ k)" value={detail.upperTail < 1e-4 ? detail.upperTail.toExponential(3) : detail.upperTail.toFixed(6)} />
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Classification</span>
                <StatusBadge status={detail.classification} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Severity</span>
                <SeverityPill score={detail.severity} label={detail.severityLabel} />
              </div>
              <div className="pt-2 border-t border-white/5">
                <div className="text-xs text-slate-500 uppercase mb-1">Explanation</div>
                <p className="text-slate-300 leading-relaxed">{detail.explanation}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  label,
  k,
  sortKey,
  sortAsc,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
}) {
  return (
    <th className="py-2 pr-4 cursor-pointer select-none" onClick={() => onSort(k)}>
      <span className="inline-flex items-center gap-1 hover:text-slate-300">
        {label}
        <ArrowUpDown size={11} className={sortKey === k ? 'text-electric-400' : 'text-slate-600'} />
        {sortKey === k && <span className="text-[10px]">{sortAsc ? '▲' : '▼'}</span>}
      </span>
    </th>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-100">{value}</span>
    </div>
  );
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
