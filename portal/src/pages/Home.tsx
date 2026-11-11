import type { BarData } from '../data';
import { isLive } from '../data';
import { dateText, kindName, plural, timeText, tonight } from '../format';
import { navigate } from '../ui';

const mins = (t: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

type Line = { key: string; when: string; tone: 'now' | 'later' | 'muted'; text: string; sub?: string };

// What the app shows for this bar tonight, roughly as Tonight orders it
function tonightLines(d: BarData): Line[] {
  const n = tonight();
  const lines: (Line & { sort: number })[] = [];
  const place = (start: string | null, end: string | null, atClose: boolean, closeMin: number | null) => {
    const s = mins(start);
    let e = atClose ? closeMin : mins(end);
    if (s != null && e != null && e <= s) e += 1440;
    const sNight = s != null && s < 5 * 60 ? s + 1440 : s;
    const now = n.nightMinutes;
    if (sNight != null && now >= sNight && (e == null ? now < sNight + 180 : now < e)) return { tone: 'now' as const, sort: sNight };
    if (sNight == null && e != null && now < e) return { tone: 'now' as const, sort: 0 };
    if (sNight != null && now < sNight) return { tone: 'later' as const, sort: sNight };
    return { tone: 'muted' as const, sort: sNight ?? 9999 };
  };
  const today = d.hours.find((h) => h.day_of_week === n.weekday);
  let closeMin: number | null = null;
  if (today && !today.is_closed) {
    const o = mins(today.opens_at), c = mins(today.closes_at);
    closeMin = o != null && c != null && c <= o ? c + 1440 : c;
  }
  for (const e of d.events) {
    if (!(e.event_date === n.date || (!e.event_date && e.days.includes(n.weekday)))) continue;
    const p = place(e.start_time, e.end_time, e.ends_at_close, closeMin);
    const name = e.title || kindName(e.kind);
    lines.push({ key: e.id, when: p.tone === 'now' ? 'Now' : timeText(e.start_time) ?? 'Tonight', tone: p.tone, text: name, sort: p.sort });
  }
  for (const s of d.specials) {
    if (s.days.length && !s.days.includes(n.weekday)) continue;
    const p = place(s.start_time, s.end_time, false, closeMin);
    const until = s.end_time ? `until ${timeText(s.end_time, true)}` : undefined;
    lines.push({ key: s.id, when: p.tone === 'now' ? 'Now' : timeText(s.start_time) ?? 'All day', tone: p.tone, text: s.title || kindName(s.kind), sub: p.tone === 'now' ? until : undefined, sort: p.sort });
  }
  lines.sort((a, b) => a.sort - b.sort);
  if (today && !today.is_closed && today.closes_at) {
    lines.push({ key: 'close', when: timeText(today.closes_at)!, tone: 'muted', text: 'Closes', sort: 99999 });
  }
  return lines;
}

function hoursLine(d: BarData) {
  const n = tonight();
  const today = d.hours.find((h) => h.day_of_week === n.weekday);
  if (!d.hours.length) return 'Not listed yet';
  if (!today || today.is_closed) return 'Closed tonight';
  return `Tonight ${timeText(today.opens_at)}–${timeText(today.closes_at)}`;
}

export function Home({ data, manyBars }: { data: BarData; manyBars: boolean }) {
  const v = data.venue;
  const n = tonight();
  const closed = v.closed_until && v.closed_until >= n.date;
  const lines = closed ? [] : tonightLines(data);
  const weekly = data.events.filter((e) => !e.event_date).length;
  const upcoming = data.events.filter((e) => e.event_date && e.event_date >= n.date).length;
  const liveFlyers = data.flyers.filter(isLive).length;

  const row = (to: string, title: string, side: string) => (
    <button type="button" className="item" onClick={() => navigate(to)}>
      <span className="main"><span className="title">{title}</span></span>
      <span className="side">{side}</span>
    </button>
  );

  return (
    <>
      <div>
        {manyBars && <button type="button" className="back" onClick={() => navigate('bars')}>‹ All bars</button>}
        <h1>{v.name}</h1>
        <div className="row muted" style={{ marginTop: 6, fontSize: 14, gap: 8 }}>
          <span className="dot" />Live on barzi · your changes post right away
        </div>
      </div>

      <section className="card" aria-label="Tonight on your page">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="label">Tonight on your page</span>
          <span className="small">{n.weekday}</span>
        </div>
        {closed ? (
          <span className="muted">Closed until {dateText(v.closed_until)}{v.closed_note ? ` · ${v.closed_note}` : ''}</span>
        ) : lines.length === 0 ? (
          <span className="muted">Nothing listed tonight. <a href="#/nights/new">Add a night</a></span>
        ) : (
          lines.map((l) => (
            <div key={l.key} className="tonight-row">
              <span className={'t ' + (l.tone === 'muted' ? 'muted' : l.tone)}>{l.when}</span>
              <span className={l.tone === 'muted' ? 'muted' : ''}>{l.text}{l.sub && <span className="muted"> {l.sub}</span>}</span>
            </div>
          ))
        )}
      </section>

      <nav className="list" aria-label="Edit your page">
        {row('nights', 'Nights and events', `${weekly} weekly${upcoming ? ` · ${upcoming} coming up` : ''}`)}
        {row('specials', 'Specials', String(data.specials.length))}
        {row('hours', 'Hours and closures', hoursLine(data))}
        {row('flyers', 'Flyers', liveFlyers ? `${liveFlyers} showing` : 'None')}
        {row('details', 'Details and links', 'Phone, website, Instagram')}
      </nav>

      <button type="button" className="item" style={{ border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)', padding: 16 }} onClick={() => navigate('stats')}>
        <span className="main"><span className="label">Your page on barzi</span><span className="meta">Views, directions and taps</span></span>
        <span className="later" style={{ fontSize: 14 }}>Stats</span>
      </button>

      <p className="small center">
        Need your name, address or map pin changed? Email <a href="mailto:hello@baynestudio.com?subject=Change%20for%20my%20bar">hello@baynestudio.com</a>
        <br />{plural(data.events.length + data.specials.length, 'listing')} on your page
      </p>
    </>
  );
}
