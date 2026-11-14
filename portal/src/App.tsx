import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configured, message, supabase } from './supabase';
import { listBars, useBar, type BarSummary } from './data';
import { Brand, ErrorBox, Loading, Toasts, navigate, useRoute } from './ui';
import { SignIn } from './pages/SignIn';
import { Home } from './pages/Home';
import { NightEditor, Nights } from './pages/Nights';
import { SpecialEditor, Specials } from './pages/Specials';
import { Hours } from './pages/Hours';
import { Flyers } from './pages/Flyers';
import { Details } from './pages/Details';
import { Features } from './pages/Features';

const PICKED = 'barzi-bars:venue';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* private mode */ } };

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configured) {
    return <div className="shell"><Brand /><ErrorBox error="This site is missing its Supabase settings (VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY)." /></div>;
  }
  if (session === undefined) return <div className="shell"><Loading /></div>;
  return (
    <>
      {session ? <SignedIn session={session} /> : <SignIn />}
      <Toasts />
    </>
  );
}

function SignedIn({ session }: { session: Session }) {
  const [bars, setBars] = useState<BarSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(read(PICKED));
  const route = useRoute();

  useEffect(() => {
    listBars().then(setBars).catch((e) => setError(message(e)));
  }, [session.user.id]);

  const venueId = bars && (bars.length === 1 ? bars[0].id : bars.find((b) => b.id === picked)?.id ?? null);
  const bar = useBar(venueId ?? null);

  const signOut = async () => {
    write(PICKED, null);
    await supabase.auth.signOut();
    window.location.hash = '';
  };

  const email = session.user.email ?? '';
  const header = (
    <div className="top">
      <button type="button" className="back" style={{ padding: 0 }} onClick={() => navigate('')} aria-label="barzi for bars home"><Brand /></button>
      <button type="button" className="avatar" title={`Signed in as ${email}. Tap to sign out.`} aria-label="Sign out"
        onClick={() => { if (window.confirm(`Signed in as ${email}.\n\nSign out?`)) signOut(); }}>
        {email.slice(0, 2).toUpperCase()}
      </button>
    </div>
  );

  if (error) return <div className="shell">{header}<ErrorBox error={error} /></div>;
  if (!bars) return <div className="shell">{header}<Loading /></div>;

  if (bars.length === 0) {
    return (
      <div className="shell">
        {header}
        <h1>No bar linked yet</h1>
        <p className="lead">{email} isn't linked to a bar on barzi. If you just talked to us, give it a few minutes. Otherwise email <a href="mailto:hello@baynestudio.com?subject=barzi%20for%20bars">hello@baynestudio.com</a>.</p>
        <button type="button" className="btn" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  if (!venueId || route[0] === 'bars') {
    return (
      <div className="shell">
        {header}
        <h1>Your bars</h1>
        <div className="list">
          {bars.map((b) => (
            <button key={b.id} type="button" className="item" onClick={() => { write(PICKED, b.id); setPicked(b.id); navigate(''); }}>
              <span className="main"><span className="title">{b.name}</span><span className="meta">{b.address}</span></span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  let page;
  if (bar.error) page = <ErrorBox error={bar.error} />;
  else if (!bar.data) page = <Loading />;
  else {
    const [section, id] = route;
    switch (section) {
      case 'nights': page = id ? <NightEditor key={id} bar={bar} id={id} /> : <Nights bar={bar} />; break;
      case 'specials': page = id ? <SpecialEditor key={id} bar={bar} id={id} /> : <Specials bar={bar} />; break;
      case 'hours': page = <Hours key={bar.data.venue.id} bar={bar} />; break;
      case 'flyers': page = <Flyers bar={bar} />; break;
      case 'features': page = <Features key={bar.data.venue.id} bar={bar} />; break;
      case 'details': page = <Details key={bar.data.venue.id} bar={bar} />; break;
      default: page = <Home data={bar.data} manyBars={bars.length > 1} />;
    }
  }

  return <div className="shell">{header}{page}</div>;
}
