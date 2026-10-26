import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { explainDetection } from '@/lib/poisson';
import type { Classification } from '@/types';

export function ExplanationPanel({
  observed,
  expected,
  upperTail,
  alpha,
  classification,
}: {
  observed: number;
  expected: number;
  upperTail: number;
  alpha: number;
  classification: Classification;
}) {
  const [open, setOpen] = useState(false);
  const text = explainDetection(observed, expected, upperTail, alpha, classification);
  return (
    <div className="glass p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <HelpCircle size={16} className="text-electric-400" />
          Why was this flagged?
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <p className="text-sm text-slate-300 mt-3 leading-relaxed">{text}</p>
      {open && (
        <div className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-400 leading-relaxed space-y-2">
          <p>
            <span className="text-slate-300 font-medium">Beginner explanation:</span> The Poisson
            distribution tells us how often we should expect to see a given number of packets in a
            second, assuming traffic arrives randomly at a steady average rate.
          </p>
          <p>
            The <span className="text-electric-400">upper-tail probability</span> P(X ≥ k) is the
            chance of seeing <span className="font-mono">{observed}</span> or more packets when the
            average is <span className="font-mono">{expected}</span>. When that chance is very small
            (below α = <span className="font-mono">{alpha}</span>), the observation is statistically
            surprising, so we flag it as a potential burst.
          </p>
          <p className="text-slate-500">
            Note: a flagged observation is statistically unusual, not necessarily malicious. The
            model only compares counts to an expected rate.
          </p>
        </div>
      )}
    </div>
  );
}
