import { useEffect, useRef, useState } from 'react';

/** A controlled number input that accepts empty string and validates on blur. */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  hint,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const last = useRef(value);
  useEffect(() => {
    if (last.current !== value) {
      setText(String(value));
      last.current = value;
    }
  }, [value]);
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <input
        type="number"
        className="input"
        value={text}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (Number.isFinite(n)) {
            let v = n;
            if (min !== undefined) v = Math.max(min, v);
            if (max !== undefined) v = Math.min(max, v);
            onChange(v);
            last.current = v;
          }
        }}
      />
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export function SliderInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  format?: (v: number) => string;
}) {
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="label mb-0">{label}</label>
          <span className="text-xs font-mono text-electric-400">
            {format ? format(value) : value}
          </span>
        </div>
      )}
      <input
        type="range"
        className="w-full accent-electric-500 cursor-pointer"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function SelectInput<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label?: string;
}) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <select className="input" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
