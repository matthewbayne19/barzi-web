import { useState, type FormEvent } from 'react';
import { supabase } from '../supabase';
import { Brand, ErrorBox, Field } from '../ui';

export function SignIn() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const address = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) { setError('Enter the email barzi has for your bar.'); return; }
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) {
      if (/apple|not allowed|signups? not allowed|403/i.test(error.message)) {
        setError("That email isn't set up for a bar yet. Email hello@baynestudio.com and we'll add you.");
      } else if (/rate|seconds/i.test(error.message)) {
        setError('Too many tries. Wait a minute, then send the code again.');
      } else {
        setError(error.message);
      }
      return;
    }
    setSentTo(address);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!sentTo) return;
    setBusy(true); setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: sentTo, token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setError(/expired|invalid/i.test(error.message) ? "That code didn't work. Check the newest email, or send a new code." : error.message);
  };

  return (
    <div className="shell">
      <Brand big />
      <h1 className="hero">Keep your bar's page current.</h1>
      <p className="lead">Update your nights, events, specials, hours and flyers. Changes show in the barzi app right away.</p>

      {!sentTo ? (
        <form className="stack" style={{ marginTop: 16, gap: 12 }} onSubmit={send}>
          <Field label="Work email">
            <input className="text" type="email" autoComplete="email" inputMode="email" autoFocus
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbar.com" />
          </Field>
          <ErrorBox error={error} />
          <button className="btn primary full" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in code'}</button>
        </form>
      ) : (
        <form className="card" style={{ marginTop: 16 }} onSubmit={verify}>
          <b>Check your email</b>
          <span className="muted" style={{ fontSize: 15, lineHeight: 1.5 }}>
            We sent a code to {sentTo}. Type it here, or tap the link in the email on this device.
          </span>
          <Field label="6-digit code">
            <input className="text" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={10}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              style={{ letterSpacing: '0.3em', fontSize: 22, fontWeight: 600 }} />
          </Field>
          <ErrorBox error={error} />
          <button className="btn primary full" disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Sign in'}</button>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="back" onClick={() => { setSentTo(null); setCode(''); setError(null); }}>Use another email</button>
            <button type="button" className="back" disabled={busy} onClick={() => send()}>Send a new code</button>
          </div>
        </form>
      )}

      <div className="grow" />
      <p className="small center">
        No password. Not set up yet? Email <a href="mailto:hello@baynestudio.com?subject=barzi%20for%20bars">hello@baynestudio.com</a> and we'll add your bar.
        <br /><a href="https://www.gobarzi.com/terms">Terms</a> · <a href="https://www.gobarzi.com/privacy">Privacy</a>
      </p>
    </div>
  );
}
