// "Open to close": a listing's times taken from the bar's hours on its days.
// The same file lives in barzi-data src/lib/openToClose.ts (the desk); keep them alike.

const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export type DayHours = { opens_at: string | null; closes_at: string | null; is_closed: boolean } | undefined;

export type OpenToClose = {
  start: string | null; // null: leave the start as it is
  end: string | null; // null: no single end (closing differs by day, or nothing to fill)
  note: string | null; // why it didn't fill everything
};

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
const short = (day: string) => day.slice(0, 3);

function clock(t: string): string {
  const [h, m] = t.split(':').map(Number);
  if (m === 0 && h === 0) return 'midnight';
  if (m === 0 && h === 12) return 'noon';
  const h12 = h % 12 || 12;
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'PM' : 'AM'}`;
}

// The weekday of a YYYY-MM-DD date
export function weekdayOf(date: string): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return WEEK[(new Date(y, m - 1, d).getDay() + 6) % 7];
}

// days: the listing's weekdays (or the weekday of its one date).
// hoursFor: the bar's hours on a weekday, undefined when not listed.
export function openToClose(days: string[], hoursFor: (day: string) => DayHours): OpenToClose {
  if (days.length === 0) return { start: null, end: null, note: 'Pick the days first.' };
  const ordered = WEEK.filter((d) => days.includes(d));
  const missing = ordered.filter((d) => { const h = hoursFor(d); return !h || h.is_closed || !h.opens_at || !h.closes_at; });
  if (missing.length) {
    return { start: null, end: null, note: `No open hours for ${missing.map(short).join(', ')}. Add them under Hours first.` };
  }
  const opens = new Set(ordered.map((d) => hhmm(hoursFor(d)!.opens_at)));
  const closes = new Set(ordered.map((d) => hhmm(hoursFor(d)!.closes_at)));
  if (opens.size > 1) {
    const list = ordered.map((d) => `${short(d)} ${clock(hhmm(hoursFor(d)!.opens_at)!)}`).join(', ');
    return { start: null, end: null, note: `It opens at different times (${list}). Split it into one listing per opening time.` };
  }
  const start = [...opens][0];
  if (closes.size > 1) {
    return { start, end: null, note: 'Closing time differs by day, so the end is left blank and it runs until close each night.' };
  }
  return { start, end: [...closes][0], note: null };
}
