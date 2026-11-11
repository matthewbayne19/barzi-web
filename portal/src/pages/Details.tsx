import { useState } from 'react';
import type { Bar } from '../data';
import { SPORTS, hhmm } from '../format';
import { message, supabase } from '../supabase';
import { Back, ErrorBox, Field, Seg, toast } from '../ui';

const typeName = (t: string) => t.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function Details({ bar }: { bar: Bar }) {
  const v = bar.data!.venue;
  const [phone, setPhone] = useState(v.phone ?? '');
  const [website, setWebsite] = useState(v.website ?? '');
  const [instagram, setInstagram] = useState(v.instagram ? '@' + v.instagram.replace(/^@/, '') : '');
  const [food, setFood] = useState<'yes' | 'no' | 'unknown'>(v.serves_food == null ? 'unknown' : v.serves_food ? 'yes' : 'no');
  const [kitchen, setKitchen] = useState(hhmm(v.kitchen_closes));
  const [tvs, setTvs] = useState(v.tv_count != null ? String(v.tv_count) : '');
  const [sports, setSports] = useState<string[]>(v.sports_shown ?? []);
  const [teams, setTeams] = useState((v.team_bars ?? []).join(', '));
  const [cash, setCash] = useState(v.cash_only);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSport = (s: string) => setSports((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]));

  const save = async () => {
    if (tvs && !/^\d{1,3}$/.test(tvs)) { setError('TVs should be a number.'); return; }
    setBusy(true); setError(null);
    const { error } = await supabase.rpc('owner_update_venue', {
      p_venue_id: v.id,
      p_changes: {
        phone: phone.trim() || null,
        website: website.trim() || null,
        instagram: instagram.trim().replace(/^@/, '') || null,
        serves_food: food === 'unknown' ? null : food === 'yes',
        kitchen_closes: food === 'yes' && kitchen ? kitchen : null,
        tv_count: tvs ? Number(tvs) : null,
        sports_shown: sports,
        team_bars: teams.split(',').map((t) => t.trim()).filter(Boolean),
        cash_only: cash,
      },
    });
    setBusy(false);
    if (error) { setError(message(error)); return; }
    await bar.reload();
    toast('Saved. It’s live on barzi.');
  };

  return (
    <>
      <Back to="" label={v.name} />
      <h1>Details and links</h1>
      <Field label="Phone"><input className="text" type="tel" autoComplete="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      <Field label="Website"><input className="text" type="url" inputMode="url" maxLength={200} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="yourbar.com" /></Field>
      <Field label="Instagram"><input className="text" maxLength={31} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yourbar" /></Field>
      <div className="stack">
        <span style={{ fontSize: 14, fontWeight: 600 }}>Food</span>
        <Seg options={[{ value: 'yes', label: 'Serves food' }, { value: 'no', label: 'No food' }, { value: 'unknown', label: 'Not listed' }]} value={food} onChange={setFood} />
      </div>
      <div className="grid2">
        {food === 'yes' && <Field label="Kitchen closes" hint="optional"><input className="text" type="time" step={900} value={kitchen} onChange={(e) => setKitchen(e.target.value)} /></Field>}
        <Field label="TVs" hint="optional"><input className="text" inputMode="numeric" value={tvs} onChange={(e) => setTvs(e.target.value.replace(/\D/g, ''))} /></Field>
      </div>
      <div className="stack">
        <span style={{ fontSize: 14, fontWeight: 600 }}>Sports you show</span>
        <div className="chips">
          {SPORTS.map((s) => <button key={s} type="button" aria-pressed={sports.includes(s)} className={'chip' + (sports.includes(s) ? ' on' : '')} onClick={() => toggleSport(s)}>{s}</button>)}
        </div>
      </div>
      <Field label="Team bar for" hint="optional, commas between"><input className="text" value={teams} onChange={(e) => setTeams(e.target.value)} placeholder="Giants, Liverpool" /></Field>
      <label className="check"><input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} />Cash only</label>
      <ErrorBox error={error} />
      <button type="button" className="btn primary full" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>

      <section className="card locked">
        <span className="label">Set by barzi</span>
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}><span className="muted">Name</span><span>{v.name}</span></div>
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}><span className="muted">Address and map pin</span><span>{v.address}</span></div>
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}><span className="muted">Bar type</span><span>{v.bar_types.length ? v.bar_types.map(typeName).join(', ') : 'Not set'}</span></div>
        <a href={`mailto:hello@baynestudio.com?subject=${encodeURIComponent('Change for ' + v.name)}`} style={{ fontSize: 14, fontWeight: 600 }}>Ask for a change</a>
      </section>
    </>
  );
}
