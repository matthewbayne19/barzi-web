import { useState } from 'react';
import type { Bar } from '../data';
import { DAYS, SPECIAL_KINDS, daysText, hhmm, kindName, timeRange } from '../format';
import { message, supabase, type SpecialRow } from '../supabase';
import { Back, Chips, DaysPicker, ErrorBox, Field, navigate, toast } from '../ui';

const firstDay = (s: SpecialRow) => (s.days.length ? Math.min(...s.days.map((d) => DAYS.indexOf(d as any))) : -1);

export function Specials({ bar }: { bar: Bar }) {
  const d = bar.data!;
  const list = [...d.specials].sort((a, b) => firstDay(a) - firstDay(b) || (a.start_time ?? '').localeCompare(b.start_time ?? ''));
  return (
    <>
      <Back to="" label={d.venue.name} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Specials</h1>
        <button type="button" className="btn primary small" onClick={() => navigate('specials/new')}>+ Add</button>
      </div>
      {list.length ? (
        <div className="list">
          {list.map((s) => (
            <button key={s.id} type="button" className="item" onClick={() => navigate(`specials/${s.id}`)}>
              <span className="day">{s.days.length ? daysText(s.days) : 'Daily'}</span>
              <span className="main">
                <span className="title">{s.title}</span>
                <span className="meta">{[kindName(s.kind), timeRange(s)].filter(Boolean).join(' · ')}</span>
              </span>
            </button>
          ))}
        </div>
      ) : <div className="empty">No specials yet. Add your happy hour, a food night or brunch.</div>}
    </>
  );
}

type Draft = { kind: string; title: string; days: string[]; start_time: string; end_time: string };

export function SpecialEditor({ bar, id }: { bar: Bar; id: string }) {
  const d = bar.data!;
  const existing = id === 'new' ? undefined : d.specials.find((s) => s.id === id);
  const [f, setF] = useState<Draft>({
    kind: existing?.kind ?? 'happy_hour',
    title: existing?.title ?? '',
    days: existing?.days ?? [],
    start_time: hhmm(existing?.start_time),
    end_time: hhmm(existing?.end_time),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((x) => ({ ...x, [k]: v }));

  if (id !== 'new' && !existing) {
    return <><Back to="specials" label="Specials" /><div className="empty">That special isn't on your page any more.</div></>;
  }

  const save = async () => {
    if (!f.title.trim()) { setError('Write the special in, like "Half-price wings".'); return; }
    if (f.days.length === 0) { setError('Pick the days it runs.'); return; }
    setBusy(true); setError(null);
    const row = {
      venue_id: d.venue.id, kind: f.kind, title: f.title.trim(), days: f.days,
      start_time: f.start_time || null, end_time: f.end_time || null,
    };
    const res = existing
      ? await supabase.from('specials').update(row).eq('id', existing.id)
      : await supabase.from('specials').insert(row);
    setBusy(false);
    if (res.error) { setError(message(res.error)); return; }
    await bar.reload();
    toast('Saved. It’s live on barzi.');
    navigate('specials');
  };

  const remove = async () => {
    if (!existing || !window.confirm(`Remove "${existing.title}" from barzi?`)) return;
    setBusy(true);
    const { error } = await supabase.from('specials').delete().eq('id', existing.id);
    setBusy(false);
    if (error) { setError(message(error)); return; }
    await bar.reload();
    toast('Removed from barzi.');
    navigate('specials');
  };

  return (
    <>
      <Back to="specials" label="Specials" />
      <h1>{existing ? 'Edit special' : 'Add a special'}</h1>
      <div className="stack">
        <span style={{ fontSize: 14, fontWeight: 600 }}>What kind</span>
        <Chips options={SPECIAL_KINDS} value={f.kind as any} onChange={(v) => set('kind', v)} label={kindName} />
      </div>
      <Field label="The special"><input className="text" maxLength={80} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder={f.kind === 'food' ? 'Half-price wings' : f.kind === 'brunch' ? 'Brunch menu' : 'Happy hour'} /></Field>
      <div className="stack"><span style={{ fontSize: 14, fontWeight: 600 }}>Days</span><DaysPicker value={f.days} onChange={(v) => set('days', v)} /></div>
      <div className="grid2">
        <Field label="Starts" hint="optional"><input className="text" type="time" step={900} value={f.start_time} onChange={(e) => set('start_time', e.target.value)} /></Field>
        <Field label="Ends" hint="optional"><input className="text" type="time" step={900} value={f.end_time} onChange={(e) => set('end_time', e.target.value)} /></Field>
      </div>
      <ErrorBox error={error} />
      <div className="row">
        {existing && <button type="button" className="btn danger" disabled={busy} onClick={remove}>Remove</button>}
        <button type="button" className="btn primary grow" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save, post to barzi'}</button>
      </div>
    </>
  );
}
