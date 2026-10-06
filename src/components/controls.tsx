import { useId, useState, type ReactNode } from 'react';
import { META, clampParam, type Params } from '../core/params';

export function Section({ title, summary, defaultOpen = true, children }: { title: string; summary?: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="section" open={defaultOpen}>
      <summary>
        <span className="section-title">{title}</span>
        {summary && <span className="section-summary">{summary}</span>}
        <svg className="chev" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

interface FieldProps {
  name: keyof Params;
  value: number;
  onChange: (key: keyof Params, v: number) => void;
  disabled?: boolean;
}

export function Field({ name, value, onChange, disabled }: FieldProps) {
  const meta = META[name as string];
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const places = meta.step >= 1 ? 0 : Math.max(0, Math.ceil(-Math.log10(meta.step)));
  const shown = draft ?? value.toFixed(places);

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.replace(',', '.'));
    if (Number.isFinite(n)) onChange(name, clampParam(name, n));
    setDraft(null);
  };

  const fill = ((value - meta.min) / (meta.max - meta.min)) * 100;

  return (
    <div className={`field${disabled ? ' is-disabled' : ''}`}>
      <div className="field-head">
        <label htmlFor={id}>{meta.label}</label>
        <div className="num">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={shown}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
              if (e.key === 'Escape') setDraft(null);
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const dir = e.key === 'ArrowUp' ? 1 : -1;
                onChange(name, clampParam(name, value + dir * meta.step * (e.shiftKey ? 10 : 1)));
                setDraft(null);
              }
            }}
            aria-label={`${meta.label}${meta.unit ? ` in ${meta.unit}` : ''}`}
          />
          <span className="unit">{meta.unit}</span>
        </div>
      </div>
      <input
        className="range"
        type="range"
        min={meta.min}
        max={meta.max}
        step={meta.step}
        value={value}
        disabled={disabled}
        style={{ ['--fill' as string]: `${Math.min(100, Math.max(0, fill))}%` }}
        onChange={(e) => onChange(name, clampParam(name, Number(e.target.value)))}
        aria-label={meta.label}
        aria-describedby={meta.hint ? `${id}-hint` : undefined}
      />
      {meta.hint && (
        <p className="hint" id={`${id}-hint`}>
          <span>{meta.hint}</span>
        </p>
      )}
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <div className="field-head">
        <span className="label">{label}</span>
      </div>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Switch({ label, checked, onChange, note }: { label: string; checked: boolean; onChange: (v: boolean) => void; note?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch-text">
        <span>{label}</span>
        {note && <small>{note}</small>}
      </span>
      <span className="track" aria-hidden="true">
        <span className="thumb" />
      </span>
    </button>
  );
}

