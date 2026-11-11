import { useCallback, useEffect, useState } from 'react';
import { supabase, VENUE_COLUMNS, type EventRow, type FeatureRow, type FlyerRow, type HoursRow, type SpecialRow, type Venue } from './supabase';

export type BarData = {
  venue: Venue;
  events: EventRow[];
  specials: SpecialRow[];
  hours: HoursRow[];
  flyers: FlyerRow[];
  features: FeatureRow[];
};

export type Bar = {
  data: BarData | null;
  error: string | null;
  reload: () => Promise<void>;
};

// Everything the portal shows for one bar. RLS returns only bars this person
// manages (every bar for an admin).
export function useBar(venueId: string | null): Bar {
  const [data, setData] = useState<BarData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!venueId) return;
    const [v, e, s, h, f, ft] = await Promise.all([
      supabase.from('venues').select(VENUE_COLUMNS).eq('id', venueId).single(),
      supabase.from('events').select('*').eq('venue_id', venueId).order('start_time', { nullsFirst: false }),
      supabase.from('specials').select('*').eq('venue_id', venueId).order('start_time', { nullsFirst: false }),
      supabase.from('venue_hours').select('*').eq('venue_id', venueId),
      supabase.from('venue_flyers').select('*').eq('venue_id', venueId).order('created_at', { ascending: false }),
      supabase.from('venue_features').select('*').eq('venue_id', venueId),
    ]);
    const err = v.error ?? e.error ?? s.error ?? h.error ?? f.error ?? ft.error;
    if (err) { setError(err.message); return; }
    setError(null);
    setData({
      venue: v.data as Venue,
      events: (e.data ?? []) as EventRow[],
      specials: (s.data ?? []) as SpecialRow[],
      hours: (h.data ?? []) as HoursRow[],
      flyers: (f.data ?? []) as FlyerRow[],
      features: (ft.data ?? []) as FeatureRow[],
    });
  }, [venueId]);

  useEffect(() => {
    setData(null);
    reload();
  }, [reload]);

  return { data, error, reload };
}

export type BarSummary = { id: string; name: string; address: string };

export async function listBars(): Promise<BarSummary[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, address, is_archived')
    .order('name');
  if (error) throw error;
  return (data ?? []).filter((v: any) => !v.is_archived) as BarSummary[];
}

// A flyer still showing in the app
export const isLive = (f: FlyerRow) => !f.expires_at || new Date(f.expires_at).getTime() > Date.now();
