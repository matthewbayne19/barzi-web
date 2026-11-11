import { useEffect, useState } from 'react';
import type { Bar } from '../data';
import { message, supabase } from '../supabase';
import { Back, ErrorBox, Loading, Seg } from '../ui';

type Stats = Record<'views' | 'viewers' | 'directions' | 'calls' | 'website' | 'instagram' | 'shares' | 'flyer_views' | 'going' | 'check_ins' | 'saves', number>;

export function StatsPage({ bar }: { bar: Bar }) {
  const v = bar.data!.venue;
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setStats(null); setError(null);
    supabase.rpc('owner_venue_stats', { p_venue_id: v.id, p_days: Number(days) }).then(({ data, error }) => {
      if (!live) return;
      if (error) setError(message(error)); else setStats(data as Stats);
    });
    return () => { live = false; };
  }, [v.id, days]);

  const tile = (n: number, label: string) => <div className="stat"><b>{n.toLocaleString()}</b><span>{label}</span></div>;
  const line = (label: string, n: number) => <div className="kv"><span>{label}</span><b>{n.toLocaleString()}</b></div>;

  return (
    <>
      <Back to="" label={v.name} />
      <h1>Your page on barzi</h1>
      <Seg options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} value={days} onChange={setDays} />
      <ErrorBox error={error} />
      {!stats && !error && <Loading />}
      {stats && (
        <>
          <div className="grid2">
            {tile(stats.views, 'Page views')}
            {tile(stats.viewers, 'People who looked')}
            {tile(stats.directions, 'Directions')}
            {tile(stats.check_ins, 'Check-ins')}
          </div>
          <div className="list">
            {line('Calls', stats.calls)}
            {line('Website taps', stats.website)}
            {line('Instagram taps', stats.instagram)}
            {line('Flyer views', stats.flyer_views)}
            {line('Shares', stats.shares)}
            {line('Tapped "going"', stats.going)}
            {line('Saved your bar (all time)', stats.saves)}
          </div>
        </>
      )}
      <p className="small">Counts only. barzi never shows bars who looked or checked in. barzi's own team is left out.</p>
    </>
  );
}
