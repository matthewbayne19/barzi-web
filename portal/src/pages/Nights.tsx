import { useState } from 'react';
import type { Bar } from '../data';
import { DAYS, EVENT_KINDS, dateText, daysText, hhmm, kindName, timeRange, todayISO } from '../format';
import { message, supabase, type EventRow } from '../supabase';
import { Back, Chips, DaysPicker, ErrorBox, Field, Seg, navigate, toast } from '../ui';

const firstDay = (e: EventRow) => Math.min(...e.days.map((d) => DAYS.indexOf(d as any)));

export function Nights({ bar }: { bar: Bar }) {
  const d = bar.data!;
  const today = todayISO();
  const weekly = d.events.filter((e) => !e.event_date).sort((a, b) => firstDay(a) - firstDay(b) || (a.start_time ?? '').localeCompare(b.start_time ?? ''));
  const upcoming = d.events.filter((e) => e.event_date && e.event_date >= today).sort((a, b) => a.event_date!.localeCompare(b.event_date!));

  const item = (e: EventRow, day: string) => (
    <button key={e.id} type="button" className="item" onClick={() => navigate(`nights/${e.id}`)}>
      <span className="day">{day}</span>
      <span className="main">
        <span className="title">{e.title || kindName(e.kind)}</span>
        <span className="meta">{[kindName(e.kind), timeRange(e), e.host && `host: ${e.host}`].filter(Boolean).join(' · ')}</span>
      </span>
    </button>
  );

  return (
    <>
      <Back to="" label={d.venue.name} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Nights and events</h1>
        <button type="button" className="btn primary small" onClick={() => navigate('nights/new')}>+ Add</button>
      </div>
      <span className="label">Every week</span>
      {weekly.length ? <div className="list">{weekly.map((e) => item(e, daysText(e.days)))}</div>
        : <div className="empty">No weekly nights yet. Trivia, karaoke, live music, bingo: add each one once and it shows every week.</div>}
      <span className="label">Coming up</span>
      {upcoming.length ? <div className="list">{upcoming.map((e) => item(e, dateText(e.event_date, false)))}</div>
        : <div className="empty">No one-off events. Add a band, a special night or a holiday party with its date.</div>}
      <p className="small">A night ended? Open it and tap Remove. It drops off barzi right away.</p>
    </>
  );
}

type Draft = {
  kind: string; title: string; host: string; mode: 'weekly' | 'date'; days: string[]; event_date: string;
  start_time: string; end_time: string; ends_at_close: boolean; cover: string; perks: string;
};

const toDraft = (e?: EventRow): Draft => ({
  kind: e?.kind ?? 'trivia',
  title: e?.title ?? '',
  host: e?.host ?? '',
  mode: e?.event_date ? 'date' : 'weekly',
  days: e?.days ?? [],
  event_date: e?.event_date ?? '',
  start_time: hhmm(e?.start_time),
  end_time: hhmm(e?.end_time),
  ends_at_close: e?.ends_at_close ?? false,
  cover: e?.cover_charge != null ? String(e.cover_charge) : '',
  perks: e?.perks ?? '',
});

export function NightEditor({ bar, id }: { bar: Bar; id: string }) {
  const d = bar.data!;
  const existing = id === 'new' ? undefined : d.events.find((e) => e.id === id);
  const [f, setF] = useState<Draft>(() => toDraft(existing));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((x) => ({ ...x, [k]: v }));

  if (id !== 'new' && !existing) {
    return <><Back to="nights" label="Nights and events" /><div className="empty">That night isn't on your page any more.</div></>;
  }

  const problem = (): string | null => {
    if (f.mode === 'weekly' && f.days.length === 0) return 'Pick at least one day.';
    if (f.mode === 'date' && !f.event_date) return 'Pick the date.';
    if (f.mode === 'date' && f.event_date < todayISO() && !existing) return 'That date has passed.';
    if (f.kind === 'other' && !f.title.trim()) return 'Give it a name, like "Drag brunch" or "Comedy night".';
    if (!f.start_time) return 'Add a start time.';
    if (f.cover && !(Number(f.cover) >= 0)) return 'Cover should be a number, like 10.';
    return null;
  };

  const save = async () => {
    const p = problem();
    if (p) { setError(p); return; }
    setBusy(true); setError(null);
    const row = {
      venue_id: d.venue.id,
      kind: f.kind,
      title: f.title.trim() || null,
      host: f.host.trim() || null,
      days: f.mode === 'weekly' ? f.days : [],
      event_date: f.mode === 'date' ? f.event_date : null,
      start_time: f.start_time || null,
      end_time: f.ends_at_close ? null : f.end_time || null,
      ends_at_close: f.ends_at_close,
      cover_charge: f.cover ? Number(f.cover) : null,
      perks: f.perks.trim() || null,
    };
    const res = existing
      ? await supabase.from('events').update(row).eq('id', existing.id)
      : await supabase.from('events').insert(row);
    setBusy(false);
    if (res.error) { setError(message(res.error)); return; }
    await bar.reload();
    toast(existing ? 'Saved. It’s live on barzi.' : 'Added. It’s live on barzi.');
    navigate('nights');
  };

  const remove = async () => {
    if (!existing || !window.confirm(`Remove ${existing.title || kindName(existing.kind)} from barzi?`)) return;
    setBusy(true);
    const { error } = await supabase.from('events').delete().eq('id', existing.id);
    setBusy(false);
    if (error) { setError(message(error)); return; }
    await bar.reload();
    toast('Removed from barzi.');
    navigate('nights');
  };

  return (
    <>
      <Back to="nights" label="Nights and events" />
      <h1>{existing ? 'Edit night' : 'Add a night'}</h1>
      <div className="stack">
        <span style={{ fontSize: 14, fontWeight: 600 }}>What kind</span>
        <Chips options={EVENT_KINDS} value={f.kind as any} onChange={(v) => set('kind', v)} label={kindName} />
      </div>
      <Field label="Name" hint={f.kind === 'other' ? 'required' : 'optional'}>
        <input className="text" maxLength={80} value={f.title} onChange={(e) => set('title', e.target.value)}
          placeholder={f.kind === 'live_music' ? 'Band name' : f.kind === 'trivia' ? 'Tuesday trivia' : ''} />
      </Field>
      <Seg options={[{ value: 'weekly', label: 'Every week' }, { value: 'date', label: 'One date' }]} value={f.mode} onChange={(v) => set('mode', v)} />
      {f.mode === 'weekly'
        ? <DaysPicker value={f.days} onChange={(v) => set('days', v)} />
        : <Field label="Date"><input className="text" type="date" min={existing ? undefined : todayISO()} value={f.event_date} onChange={(e) => set('event_date', e.target.value)} /></Field>}
      <div className="grid2">
        <Field label="Starts"><input className="text" type="time" step={900} value={f.start_time} onChange={(e) => set('start_time', e.target.value)} /></Field>
        <Field label="Ends"><input className="text" type="time" step={900} value={f.ends_at_close ? '' : f.end_time} disabled={f.ends_at_close} onChange={(e) => set('end_time', e.target.value)} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={f.ends_at_close} onChange={(e) => set('ends_at_close', e.target.checked)} />Runs until close</label>
      <div className="grid2">
        <Field label="Host or DJ" hint="optional"><input className="text" maxLength={60} value={f.host} onChange={(e) => set('host', e.target.value)} /></Field>
        <Field label="Cover $" hint="optional"><input className="text" inputMode="decimal" value={f.cover} onChange={(e) => set('cover', e.target.value.replace(/[^\d.]/g, ''))} placeholder="None" /></Field>
      </div>
      <Field label="Anything else" hint="optional"><input className="text" maxLength={120} value={f.perks} onChange={(e) => set('perks', e.target.value)} placeholder="Prizes for the top 3 teams" /></Field>
      <ErrorBox error={error} />
      <div className="row">
        {existing && <button type="button" className="btn danger" disabled={busy} onClick={remove}>Remove</button>}
        <button type="button" className="btn primary grow" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save, post to barzi'}</button>
      </div>
      {existing && <p className="small">Want a flyer on this night? Add it under Flyers.</p>}
    </>
  );
}
