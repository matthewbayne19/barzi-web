// Times and days written the way the barzi app writes them (from the desk's
// lib/format.ts, which copies barzi-ios lib/clock.ts and lib/week.ts).

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const EVENT_KINDS = ['trivia', 'karaoke', 'live_music', 'bingo', 'other'] as const;
export const SPECIAL_KINDS = ['happy_hour', 'food', 'drink', 'brunch'] as const;
export const SPORTS = ['NFL', 'College football', 'NBA', 'College basketball', 'MLB', 'NHL', 'Premier League', 'Champions League', 'MLS', 'UFC', 'F1'];

const KIND_NAMES: Record<string, string> = {
  trivia: 'Trivia', karaoke: 'Karaoke', live_music: 'Live music', bingo: 'Bingo', other: 'Other',
  happy_hour: 'Happy hour', drink: 'Drink special', food: 'Food special', brunch: 'Brunch',
};
export const kindName = (k: string) => KIND_NAMES[k] ?? k;

function clockText(minutes: number, inline = false): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  if (m === 0 && (h === 0 || h === 12)) {
    const word = h === 0 ? 'Midnight' : 'Noon';
    return inline ? word.toLowerCase() : word;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return m > 0 ? `${hour12}:${String(m).padStart(2, '0')} ${period}` : `${hour12} ${period}`;
}

export function timeText(time: string | null | undefined, inline = false): string | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  return clockText(h * 60 + (Number.isNaN(m) ? 0 : m), inline);
}

export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');

export function daysText(days: string[]): string {
  const sorted = DAYS.filter((d) => days.includes(d));
  if (sorted.length === 7) return 'Every day';
  const idx = sorted.map((d) => DAYS.indexOf(d));
  const run = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  const short = (d: string) => d.slice(0, 3);
  if (sorted.length >= 3 && run) return `${short(sorted[0])} – ${short(sorted[sorted.length - 1])}`;
  return sorted.map(short).join(', ');
}

export function dateText(d: string | null | undefined, withDay = true) {
  if (!d) return '';
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  const date = new Date(y, m - 1, day);
  const sameYear = y === new Date().getFullYear();
  return date.toLocaleDateString('en-US', { ...(withDay ? { weekday: 'short' } : {}), month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function timeRange(r: { start_time: string | null; end_time: string | null; ends_at_close?: boolean }) {
  const start = timeText(r.start_time);
  const end = r.ends_at_close ? 'close' : timeText(r.end_time);
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  if (end) return `until ${end}`;
  return '';
}

// Hoboken's clock. A night runs until 5 AM, so 1 AM Saturday is still Friday night.
const ET = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'long' });
export function hobokenNow(at = new Date()) {
  const p: Record<string, string> = {};
  for (const part of ET.formatToParts(at)) p[part.type] = part.value;
  return { date: `${p.year}-${p.month}-${p.day}`, weekday: p.weekday, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
export function tonight(at = new Date()) {
  const now = hobokenNow(at);
  if (now.minutes >= 5 * 60) return { ...now, nightMinutes: now.minutes };
  const before = hobokenNow(new Date(at.getTime() - 6 * 3600 * 1000));
  return { date: before.date, weekday: before.weekday, minutes: now.minutes, nightMinutes: now.minutes + 1440 };
}
export const todayISO = () => hobokenNow().date;

export const plural = (n: number, word: string, many = word + 's') => `${n} ${n === 1 ? word : many}`;
