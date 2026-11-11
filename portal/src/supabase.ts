import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const configured = !!SUPABASE_URL && !!KEY;

export const supabase = createClient(SUPABASE_URL || 'https://example.supabase.co', KEY || 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

export const flyerUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/flyers/${path}`;

export type Venue = {
  id: string; slug: string; name: string; address: string;
  phone: string | null; website: string | null; instagram: string | null;
  serves_food: boolean | null; kitchen_closes: string | null; tv_count: number | null;
  sports_shown: string[]; team_bars: string[]; cash_only: boolean;
  closed_until: string | null; closed_note: string | null;
  bar_types: string[]; is_archived: boolean | null;
};
export const VENUE_COLUMNS = 'id, slug, name, address, phone, website, instagram, serves_food, kitchen_closes, tv_count, sports_shown, team_bars, cash_only, closed_until, closed_note, bar_types, is_archived';

export type EventRow = {
  id: string; venue_id: string; kind: string; title: string | null; host: string | null;
  days: string[]; event_date: string | null; start_time: string | null; end_time: string | null;
  ends_at_close: boolean; cover_charge: number | null; perks: string | null; updated_at?: string;
};
export type SpecialRow = {
  id: string; venue_id: string; kind: string; title: string;
  days: string[]; start_time: string | null; end_time: string | null;
};
export type FeatureRow = {
  venue_id: string; amenity: string; quantity: number | null; price: number | null; cash_only: boolean | null;
  league_days: string[]; heated: boolean | null; covered: boolean | null; open_months: number[]; tags: string[]; source: string;
};

export type HoursRow = {
  id: string; venue_id: string; day_of_week: string;
  opens_at: string | null; closes_at: string | null; is_closed: boolean;
};
export type FlyerRow = {
  id: string; venue_id: string; event_id: string | null; image_path: string;
  width: number; height: number; title: string | null; event_date: string | null;
  expires_at: string | null; created_at: string;
};

// Turns a Supabase or network error into one plain sentence
export function message(e: unknown): string {
  const m = (e as any)?.message ?? String(e);
  if (/row-level security|permission denied|42501/i.test(m)) return "You don't have access to change that. Try signing in again.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Couldn't reach barzi. Check your connection and try again.";
  return m;
}
