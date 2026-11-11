import { useState } from 'react';
import type { Bar } from '../data';
import { DAYS, dateText, hhmm, todayISO } from '../format';
import { message, supabase } from '../supabase';
import { Back, ErrorBox, Field, toast } from '../ui';

type Day = { day: string; id: string | null; listed: boolean; closed: boolean; opens: string; closes: string };

export function Hours({ bar }: { bar: Bar }) {
  const d = bar.data!;
  const v = d.venue;
  const initial = (): Day[] => DAYS.map((day) => {
    const h = d.hours.find((x) => x.day_of_week === day);
    return { day, id: h?.id ?? null, listed: !!h, closed: h?.is_closed ?? false, opens: hhmm(h?.opens_at), closes: hhmm(h?.closes_at) };
  });
  const [days, setDays] = useState<Day[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClosedNow = !!v.closed_until && v.closed_until >= todayISO();
  const [closing, setClosing] = useState(isClosedNow);
  const [until, setUntil] = useState(isClosedNow ? v.closed_until! : '');
  const [note, setNote] = useState(isClosedNow ? v.closed_note ?? '' : '');
  const [closeBusy, setCloseBusy] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<Day>) => setDays((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch, listed: true } : x)));
  const copyDown = (i: number) => setDays((xs) => xs.map((x, j) => (j > i ? { ...x, listed: true, closed: xs[i].closed, opens: xs[i].opens, closes: xs[i].closes } : x)));

  const saveHours = async () => {
    const bad = days.find((x) => x.listed && !x.closed && (!x.opens || !x.closes));
    if (bad) { setError(`${bad.day}: add the opening and closing time, or mark it closed.`); return; }
    setBusy(true); setError(null);
    try {
      for (const x of days) {
        if (!x.listed) continue;
        const row = { is_closed: x.closed, opens_at: x.closed ? null : x.opens, closes_at: x.closed ? null : x.closes };
        const before = d.hours.find((h) => h.day_of_week === x.day);
        if (before) {
          if (before.is_closed === row.is_closed && hhmm(before.opens_at) === (row.opens_at ?? '') && hhmm(before.closes_at) === (row.closes_at ?? '')) continue;
          const { error } = await supabase.from('venue_hours').update(row).eq('id', before.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('venue_hours').insert({ venue_id: v.id, day_of_week: x.day, ...row });
          if (error) throw error;
        }
      }
      await bar.reload();
      toast('Hours saved. They’re live on barzi.');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const saveClosure = async (open: boolean) => {
    if (!open && !until) { setCloseError('Pick the day you reopen.'); return; }
    if (!open && until < todayISO()) { setCloseError('Pick a date from today on.'); return; }
    setCloseBusy(true); setCloseError(null);
    const { error } = await supabase.rpc('owner_update_venue', {
      p_venue_id: v.id,
      p_changes: open ? { closed_until: null, closed_note: null } : { closed_until: until, closed_note: note.trim() || null },
    });
    setCloseBusy(false);
    if (error) { setCloseError(message(error)); return; }
    await bar.reload();
    if (open) { setClosing(false); setUntil(''); setNote(''); }
    toast(open ? 'You’re open again on barzi.' : `barzi now shows you closed until ${dateText(until)}.`);
  };

  return (
    <>
      <Back to="" label={v.name} />
      <h1>Hours and closures</h1>
      <div className="list">
        {days.map((x, i) => (
          <div key={x.day} style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 500 }}>{x.day}</span>
              <div className="row" style={{ gap: 6 }}>
                {i < 6 && <button type="button" className="back" style={{ fontSize: 13, whiteSpace: 'nowrap' }} onClick={() => copyDown(i)} aria-label={`Copy ${x.day} to the days below`}>Copy down</button>}
                <label className="check" style={{ fontSize: 14 }}><input type="checkbox" checked={x.listed && x.closed} onChange={(e) => update(i, { closed: e.target.checked })} />Closed</label>
              </div>
            </div>
            {!(x.listed && x.closed) && (
              <div className="grid2">
                <input className="text" type="time" step={900} aria-label={`${x.day} opens`} value={x.opens} onChange={(e) => update(i, { opens: e.target.value, closed: false })} />
                <input className="text" type="time" step={900} aria-label={`${x.day} closes`} value={x.closes} onChange={(e) => update(i, { closes: e.target.value, closed: false })} />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="small">Opens, then closes. A close after midnight, like 2 AM, counts as the same night.</p>
      <ErrorBox error={error} />
      <button type="button" className="btn primary full" disabled={busy} onClick={saveHours}>{busy ? 'Saving…' : 'Save hours'}</button>

      <section className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="stack" style={{ gap: 2 }}>
            <b>Closed for a while</b>
            <span className="small">Renovation, private event, holiday</span>
          </span>
          {isClosedNow
            ? <button type="button" className="btn small" disabled={closeBusy} onClick={() => saveClosure(true)}>We’re open again</button>
            : !closing && <button type="button" className="btn small" onClick={() => setClosing(true)}>Set a closure</button>}
        </div>
        {isClosedNow && <span className="muted">barzi shows you closed until {dateText(v.closed_until)}{v.closed_note ? ` · “${v.closed_note}”` : ''}. Your nights stay off Tonight until then.</span>}
        {closing && (
          <>
            <Field label="Back open on"><input className="text" type="date" min={todayISO()} value={until} onChange={(e) => setUntil(e.target.value)} /></Field>
            <Field label="Note shown on barzi" hint="optional"><input className="text" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Closed for renovations" /></Field>
            <ErrorBox error={closeError} />
            <div className="row">
              {!isClosedNow && <button type="button" className="btn" onClick={() => { setClosing(false); setCloseError(null); }}>Cancel</button>}
              <button type="button" className="btn primary grow" disabled={closeBusy} onClick={() => saveClosure(false)}>{closeBusy ? 'Saving…' : isClosedNow ? 'Update closure' : 'Show us as closed'}</button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
