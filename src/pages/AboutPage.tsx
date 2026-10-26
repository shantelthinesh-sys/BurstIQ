import { useState } from 'react';
import {
  Info,
  BookOpen,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Target,
  Lightbulb,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { Card, SectionTitle } from '@/components/ui';
import { NumberInput } from '@/components/inputs';
import { poissonPmf, poissonCdf, poissonUpperTail } from '@/lib/poisson';

const CONCEPTS: { q: string; a: string }[] = [
  {
    q: '1. What is a Poisson distribution?',
    a: 'A discrete probability distribution that gives the probability of observing a given number of events in a fixed interval, when events occur independently at a constant average rate.',
  },
  {
    q: '2. Why can packet arrivals be modeled using a probability distribution?',
    a: 'Because many independent hosts send packets whose aggregate arrival appears random. A probability distribution describes the variation we expect around the average rate.',
  },
  {
    q: '3. What does lambda represent?',
    a: 'Lambda (λ) is the expected number of events in the interval. For traffic, it is the average packet count per second.',
  },
  {
    q: '4. What is a probability mass function?',
    a: 'A function P(X = k) giving the probability of exactly k events. For Poisson: P(X=k) = (e^-λ · λ^k) / k!.',
  },
  {
    q: '5. What is cumulative probability?',
    a: 'P(X ≤ k) — the probability of observing k or fewer events, found by summing the PMF from 0 to k.',
  },
  {
    q: '6. What is an upper-tail probability?',
    a: 'P(X ≥ k) — the probability of observing k or more events. This is what the detector compares against α.',
  },
  {
    q: '7. What is statistical significance?',
    a: 'A threshold α (e.g. 0.01) below which an observation is considered statistically surprising. Smaller α means fewer but more confident flags.',
  },
  {
    q: '8. What are the assumptions of the Poisson model?',
    a: 'Events are independent, the rate is constant within the interval, and two events cannot occur at the exact same instant.',
  },
  {
    q: '9. Why can unusually high packet counts indicate a traffic burst?',
    a: 'If the upper-tail probability of seeing k or more packets is very small under the expected rate, the count is statistically unusual and may reflect a burst.',
  },
  {
    q: '10. What are the limitations of this method?',
    a: 'It uses simulated data, assumes the Poisson model fits, and flags statistical anomalies — not malicious activity. The adaptive baseline and severity score are experimental.',
  },
];

const QUIZ: { q: string; options: string[]; answer: number; explain: string }[] = [
  {
    q: 'In a Poisson distribution, the variance is equal to:',
    options: ['The standard deviation', 'Lambda (λ)', 'Lambda squared', 'Zero'],
    answer: 1,
    explain: 'For Poisson, both the mean and the variance equal λ. The standard deviation is √λ.',
  },
  {
    q: 'The upper-tail probability P(X ≥ k) is used for burst detection because:',
    options: [
      'It is easier to compute than the PMF',
      'We care about counts that are at least as high as the observed value',
      'It is always larger than 0.5',
      'It ignores lambda',
    ],
    answer: 1,
    explain: 'A burst is about unusually high counts, so we ask "how likely is k or more?" — that is the upper tail.',
  },
  {
    q: 'If α = 0.01 and P(X ≥ k) = 0.004, the observation is classified as:',
    options: ['NORMAL', 'ELEVATED', 'BURST DETECTED', 'Cannot determine'],
    answer: 2,
    explain: 'The upper-tail probability is below α, so the observation is flagged as a burst.',
  },
  {
    q: 'A variance-to-mean ratio far from 1 suggests:',
    options: [
      'The data perfectly follows Poisson',
      'The Poisson model may not fit the data well',
      'Alpha is too small',
      'Lambda must be zero',
    ],
    answer: 1,
    explain: 'Poisson requires mean = variance, so a VMR far from 1 is evidence of over- or under-dispersion.',
  },
  {
    q: 'Why is the same observed count (e.g. 35) unusual at λ=20 but normal at λ=40?',
    options: [
      'The Poisson formula changes',
      '35 is above the mean for λ=20 but below the mean for λ=40',
      'Alpha changes automatically',
      'Factorials behave differently',
    ],
    answer: 1,
    explain: 'The upper-tail probability depends on λ. 35 is far above 20 but below 40, so it is alarming only in the first case.',
  },
];

export function AboutPage() {
  const [answers, setAnswers] = useState<(number | null)[]>(QUIZ.map(() => null));
  const [learnLambda, setLearnLambda] = useState(10);
  const [learnK, setLearnK] = useState(18);

  const pmf = poissonPmf(learnK, learnLambda);
  const cdf = poissonCdf(learnK, learnLambda);
  const upper = poissonUpperTail(learnK, learnLambda);

  return (
    <div className="space-y-5">
      <SectionTitle
        title="About the Project"
        subtitle="Traffic Burst Detection in Communication Networks Using Poisson Distribution"
        icon={<Info size={18} />}
      />

      <Card title="Problem Statement">
        <p className="text-sm text-slate-300 leading-relaxed">
          Communication networks can experience sudden increases in packet traffic. Identifying
          observations that are unusually high compared with an expected traffic rate can help
          demonstrate statistical anomaly detection.
        </p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Objectives">
          <ul className="text-sm text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Apply Poisson distribution to network traffic analysis.</li>
            <li>Calculate exact and cumulative probabilities.</li>
            <li>Use upper-tail probability to flag unusual packet counts.</li>
            <li>Visualize traffic behavior.</li>
            <li>Compare fixed and adaptive baseline approaches.</li>
            <li>Explain the mathematical basis of each detection result.</li>
          </ul>
        </Card>
        <Card title="Proposed Solution">
          <p className="text-sm text-slate-300 leading-relaxed">
            Develop an interactive dashboard that simulates communication network traffic and uses
            Poisson probability calculations to identify potentially unusual traffic bursts.
          </p>
        </Card>
      </div>

      <Card title="Mathematical Concepts">
        <div className="flex flex-wrap gap-2">
          {[
            'Poisson distribution','Probability mass function','Cumulative probability',
            'Expected value','Variance','Standard deviation','Statistical significance',
            'Rolling mean','Descriptive statistics',
          ].map((c) => (
            <span key={c} className="chip border border-electric-500/30 bg-electric-500/10 text-electric-400">
              {c}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Novelty">
        <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-300">
          {[
            'Interactive Poisson probability laboratory',
            'Dynamic simulated network traffic',
            'Configurable statistical thresholds',
            'Fixed versus adaptive baseline comparison',
            'Explainable burst detection',
            'Traffic burst severity indicator',
            'What-if scenario comparison',
            'Distribution diagnostics',
            'Exportable statistical reports',
          ].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-400 shrink-0" /> {n}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Limitations">
        <ul className="text-sm text-slate-300 space-y-1.5 list-disc list-inside">
          <li>The demonstration uses simulated traffic.</li>
          <li>The results depend on the suitability of the Poisson model.</li>
          <li>A high packet count does not automatically indicate malicious activity.</li>
          <li>The application does not inspect real network packets.</li>
          <li>The adaptive baseline and severity score are experimental analytical features.</li>
        </ul>
      </Card>

      <div className="pt-4">
        <SectionTitle
          title="Mathematical Education Mode"
          subtitle="Learn the concepts behind the detector"
          icon={<GraduationCap size={18} />}
        />
      </div>

      <Card title="Core Concepts">
        <div className="space-y-3">
          {CONCEPTS.map((c) => (
            <details key={c.q} className="group">
              <summary className="cursor-pointer text-sm font-medium text-slate-200 flex items-center gap-2 py-1">
                <BookOpen size={14} className="text-electric-400" />
                {c.q}
              </summary>
              <p className="text-sm text-slate-400 pl-6 mt-1 leading-relaxed">{c.a}</p>
            </details>
          ))}
        </div>
      </Card>

      <Card title="Interactive Example" subtitle="Change λ and k and see the probabilities update">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <NumberInput label="λ (expected rate)" value={learnLambda} min={0} max={100} onChange={setLearnLambda} />
            <NumberInput label="k (observed count)" value={learnK} min={0} max={200} onChange={(v) => setLearnK(Math.round(v))} />
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="glass p-2">
                <div className="text-xs text-slate-500">P(X=k)</div>
                <div className="font-mono text-electric-400">{pmf.toExponential(3)}</div>
              </div>
              <div className="glass p-2">
                <div className="text-xs text-slate-500">P(X≤k)</div>
                <div className="font-mono text-cyan-400">{cdf.toFixed(4)}</div>
              </div>
              <div className="glass p-2">
                <div className="text-xs text-slate-500">P(X≥k)</div>
                <div className="font-mono text-accent-red">{upper.toExponential(3)}</div>
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-300 space-y-2 bg-navy-900/60 p-4 rounded-lg border border-white/5 font-mono text-xs">
            <div>Given λ = {learnLambda}, k = {learnK}:</div>
            <div>P(X={learnK}) = (e^-{learnLambda} · {learnLambda}^{learnK}) / {learnK}!</div>
            <div>= {pmf.toExponential(4)}</div>
            <div>P(X≥{learnK}) = {upper.toExponential(4)}</div>
            <div className="text-slate-500 pt-2 border-t border-white/5">
              If α = 0.01, this observation is{' '}
              <span className={upper <= 0.01 ? 'text-accent-red' : 'text-accent-green'}>
                {upper <= 0.01 ? 'BURST DETECTED' : 'not flagged'}
              </span>
              .
            </div>
          </div>
        </div>
      </Card>

      <Card title="Interactive Quiz" subtitle="Test your understanding">
        <div className="space-y-4">
          {QUIZ.map((item, i) => {
            const chosen = answers[i];
            const correct = chosen === item.answer;
            return (
              <div key={i} className="glass p-4">
                <div className="text-sm font-medium text-slate-200 mb-2 flex items-start gap-2">
                  <Target size={16} className="text-electric-400 mt-0.5 shrink-0" />
                  {item.q}
                </div>
                <div className="space-y-1.5">
                  {item.options.map((opt, j) => {
                    const isAnswer = j === item.answer;
                    const isChosen = j === chosen;
                    let cls = 'border-white/5 bg-navy-900/40 hover:bg-white/5 text-slate-300';
                    if (chosen !== null) {
                      if (isAnswer) cls = 'border-accent-green/40 bg-accent-green/10 text-accent-green';
                      else if (isChosen) cls = 'border-accent-red/40 bg-accent-red/10 text-accent-red';
                      else cls = 'border-white/5 bg-navy-900/40 text-slate-500';
                    }
                    return (
                      <button
                        key={j}
                        disabled={chosen !== null}
                        onClick={() => setAnswers((a) => a.map((x, idx) => (idx === i ? j : x)))}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${cls}`}
                      >
                        <span className="flex items-center gap-2">
                          {chosen !== null && isAnswer && <CheckCircle2 size={14} />}
                          {chosen !== null && isChosen && !isAnswer && <XCircle size={14} />}
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {chosen !== null && (
                  <div className="mt-2 text-xs text-slate-400 flex items-start gap-2">
                    <Lightbulb size={13} className="text-accent-amber mt-0.5 shrink-0" />
                    <span>
                      {correct ? 'Correct! ' : 'Not quite. '}
                      {item.explain}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={() => setAnswers(QUIZ.map(() => null))} className="btn-ghost">
            <Calculator size={16} /> Reset Quiz
          </button>
        </div>
      </Card>
    </div>
  );
}
