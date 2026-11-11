import { useEffect, useState, type ReactNode } from 'react';
import { DAYS } from './format';

export function navigate(path: string) {
  window.location.hash = '#/' + path.replace(/^\/+/, '');
}

export function useRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const on = () => { setParts(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parts;
}

// One message at a time, bottom of the screen
let pushToast: ((t: { text: string; err?: boolean }) => void) | null = null;
export function toast(text: string, err = false) { pushToast?.({ text, err }); }
export function Toasts() {
  const [t, setT] = useState<{ text: string; err?: boolean } | null>(null);
  useEffect(() => {
    pushToast = setT;
    return () => { pushToast = null; };
  }, []);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => setT(null), t.err ? 6000 : 3000);
    return () => clearTimeout(id);
  }, [t]);
  if (!t) return null;
  return <div className={'toast' + (t.err ? ' err' : '')} role="status">{t.text}</div>;
}

export function Brand({ big = false }: { big?: boolean }) {
  return <div className={'brand' + (big ? ' big' : '')}><b>barzi</b><span>for bars</span></div>;
}

export function Back({ to, label }: { to: string; label: string }) {
  return <button type="button" className="back" onClick={() => navigate(to)}>‹ {label}</button>;
}

export function Loading() {
  return <div className="spinner" role="progressbar" aria-label="Loading" />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}{hint && <span className="hint"> · {hint}</span>}</span>
      {children}
    </label>
  );
}

export function Chips<T extends string>({ options, value, onChange, label }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; label: (v: T) => string;
}) {
  return (
    <div className="chips" role="radiogroup">
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o}
          className={'chip' + (value === o ? ' on' : '')} onClick={() => onChange(o)}>{label(o)}</button>
      ))}
    </div>
  );
}

export function DaysPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (d: string) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
  return (
    <div className="days" role="group" aria-label="Days">
      {DAYS.map((d) => (
        <button key={d} type="button" aria-pressed={value.includes(d)} aria-label={d}
          className={'chip' + (value.includes(d) ? ' on' : '')} onClick={() => toggle(d)}>{d.slice(0, 3)}</button>
      ))}
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="error" role="alert">{error}</div>;
}
