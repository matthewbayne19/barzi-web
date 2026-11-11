import { useState } from 'react';
import type { Bar } from '../data';
import { DAYS } from '../format';
import { message, supabase, type FeatureRow } from '../supabase';
import { Back, ErrorBox, toast } from '../ui';

// Same names and groups as the app's filters (constants/amenities.ts).
// Trivia, karaoke, bingo and live music come from the bar's Nights instead.
const GROUPS: { title: string; keys: [string, string][] }[] = [
  { title: 'Games', keys: [['pool', 'Pool'], ['darts', 'Darts'], ['shuffleboard', 'Shuffleboard'], ['arcade', 'Arcade'], ['board_games', 'Board games']] },
  { title: 'Setting', keys: [['outdoor_seating', 'Outdoor seating'], ['rooftop', 'Rooftop'], ['dog_friendly', 'Dog-friendly']] },
  { title: 'Also here', keys: [['touchtunes', 'Jukebox'], ['photobooth', 'Photobooth']] },
];
const LABEL = Object.fromEntries(GROUPS.flatMap((g) => g.keys));
const SHOWN = new Set(Object.keys(LABEL));
const COUNTED: Record<string, string> = { pool: 'Tables', darts: 'Boards', shuffleboard: 'Tables' };
const PRICED: Record<string, string> = { pool: '$ per game', darts: '$ per game', shuffleboard: '$ per game', photobooth: '$ per session' };
const LEAGUES = new Set(['pool', 'darts', 'shuffleboard']);
const OUTSIDE = new Set(['outdoor_seating', 'rooftop']);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Draft = { quantity: string; price: string; cash_only: boolean; league_days: string[]; heated: boolean; covered: boolean; open_months: number[] };

const toDraft = (f?: FeatureRow): Draft => ({
  quantity: f?.quantity != null ? String(f.quantity) : '',
  price: f?.price != null ? String(Number(f.price)) : '',
  cash_only: !!f?.cash_only,
  league_days: f?.league_days ?? [],
  heated: !!f?.heated,
  covered: !!f?.covered,
  open_months: f?.open_months ?? [],
});

// The row as the database stores it, only with the fields that apply
function toRow(k: string, x: Draft) {
  return {
    quantity: COUNTED[k] && x.quantity ? Number(x.quantity) : null,
    price: PRICED[k] && x.price !== '' ? Number(x.price) : null,
    cash_only: PRICED[k] ? x.cash_only || null : null,
    league_days: LEAGUES.has(k) ? x.league_days : [],
    heated: OUTSIDE.has(k) ? x.heated || null : null,
    covered: OUTSIDE.has(k) ? x.covered || null : null,
    open_months: OUTSIDE.has(k) && x.open_months.length < 12 ? [...x.open_months].sort((a, b) => a - b) : [],
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function Features({ bar }: { bar: Bar }) {
  const d = bar.data!;
  const had = new Map(d.features.map((f) => [f.amenity, f]));
  const [on, setOn] = useState<Set<string>>(() => new Set(d.features.map((f) => f.amenity)));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(Object.keys(LABEL).map((k) => [k, toDraft(had.get(k))])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (k: string) => setOn((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const set = (k: string, patch: Partial<Draft>) => setDrafts((x) => ({ ...x, [k]: { ...x[k], ...patch } }));
  const flip = <T,>(xs: T[], v: T) => (xs.includes(v) ? xs.filter((y) => y !== v) : [...xs, v]);

  const save = async () => {
    for (const k of on) {
      if (!SHOWN.has(k)) continue;
      const x = drafts[k];
      if (COUNTED[k] && x.quantity && !/^\d{1,2}$/.test(x.quantity)) { setError(`${LABEL[k]}: how many should be a number.`); return; }
      if (PRICED[k] && x.price && !/^\d{1,3}(\.\d{1,2})?$/.test(x.price)) { setError(`${LABEL[k]}: the price should look like 2 or 2.50.`); return; }
    }
    const removing = [...had.keys()].filter((k) => SHOWN.has(k) && !on.has(k));
    if (removing.length && !window.confirm(`Take ${removing.length === 1 ? 'this' : 'these'} off your page?\n\n${removing.map((k) => LABEL[k]).join(', ')}`)) return;
    setBusy(true); setError(null);
    try {
      for (const k of removing) {
        const { error } = await supabase.from('venue_features').delete().eq('venue_id', d.venue.id).eq('amenity', k);
        if (error) throw error;
      }
      for (const k of on) {
        if (!SHOWN.has(k)) continue;
        const row = toRow(k, drafts[k]);
        const before = had.get(k);
        if (!before) {
          const { error } = await supabase.from('venue_features').insert({ venue_id: d.venue.id, amenity: k, ...row });
          if (error) throw error;
        } else {
          const changed = Object.fromEntries(Object.entries(row).filter(([c, v]) => !same((before as any)[c], v)));
          if (!Object.keys(changed).length) continue;
          const { error } = await supabase.from('venue_features').update(changed).eq('venue_id', d.venue.id).eq('amenity', k);
          if (error) throw error;
        }
      }
      await bar.reload();
      toast('Saved. It’s live on barzi.');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const details = (k: string) => {
    const x = drafts[k];
    if (!COUNTED[k] && !PRICED[k] && !OUTSIDE.has(k)) return null;
    return (
      <div key={k} className="card" style={{ gap: 10 }}>
        <b>{LABEL[k]}</b>
        {(COUNTED[k] || PRICED[k]) && (
          <div className="grid2">
            {COUNTED[k] && (
              <label className="field"><span>{COUNTED[k]}</span>
                <input className="text" inputMode="numeric" maxLength={2} value={x.quantity} onChange={(e) => set(k, { quantity: e.target.value.replace(/\D/g, '') })} />
              </label>
            )}
            {PRICED[k] && (
              <label className="field"><span>{PRICED[k]}</span>
                <input className="text" inputMode="decimal" maxLength={6} placeholder="$" value={x.price} onChange={(e) => set(k, { price: e.target.value.replace(/[^\d.]/g, '') })} />
              </label>
            )}
          </div>
        )}
        {PRICED[k] && <label className="check"><input type="checkbox" checked={x.cash_only} onChange={(e) => set(k, { cash_only: e.target.checked })} />Cash or coins only</label>}
        {LEAGUES.has(k) && (
          <div className="stack" style={{ gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>League nights<span className="hint"> · optional</span></span>
            <div className="chips">
              {DAYS.map((day) => (
                <button key={day} type="button" aria-pressed={x.league_days.includes(day)} className={'chip' + (x.league_days.includes(day) ? ' on' : '')}
                  onClick={() => set(k, { league_days: flip(x.league_days, day) })}>{day.slice(0, 3)}</button>
              ))}
            </div>
          </div>
        )}
        {OUTSIDE.has(k) && (
          <>
            <div className="row" style={{ gap: 16 }}>
              <label className="check"><input type="checkbox" checked={x.covered} onChange={(e) => set(k, { covered: e.target.checked })} />Covered</label>
              <label className="check"><input type="checkbox" checked={x.heated} onChange={(e) => set(k, { heated: e.target.checked })} />Heated</label>
            </div>
            <div className="stack" style={{ gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Open these months<span className="hint"> · none picked means all year</span></span>
              <div className="chips">
                {MONTHS.map((m, i) => (
                  <button key={m} type="button" aria-pressed={x.open_months.includes(i + 1)} className={'chip' + (x.open_months.includes(i + 1) ? ' on' : '')}
                    onClick={() => set(k, { open_months: flip(x.open_months, i + 1) })}>{m}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <Back to="" label={d.venue.name} />
      <h1>Features</h1>
      <p className="small">What people can find you by on barzi’s map and filters. Tap to turn on or off.</p>
      {GROUPS.map((g) => (
        <div key={g.title} className="stack">
          <span style={{ fontSize: 14, fontWeight: 600 }}>{g.title}</span>
          <div className="chips">
            {g.keys.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={on.has(k)} className={'chip' + (on.has(k) ? ' on' : '')} onClick={() => toggle(k)}>{label}</button>
            ))}
          </div>
        </div>
      ))}
      {[...SHOWN].filter((k) => on.has(k)).map(details)}
      <p className="small">Trivia, karaoke, bingo and live music show up on their own when you add them under Nights.</p>
      <ErrorBox error={error} />
      <button type="button" className="btn primary full" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
    </>
  );
}
