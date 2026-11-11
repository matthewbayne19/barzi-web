import { useRef, useState } from 'react';
import { isLive, type Bar } from '../data';
import { dateText, daysText, kindName, todayISO } from '../format';
import { flyerUrl, message, supabase, type FlyerRow } from '../supabase';
import { Back, ErrorBox, Field, Seg, toast } from '../ui';

const MAX_EDGE = 1600; // same as the app's flyer editor
const MAX_LIVE = 12;   // the database refuses more

// Shrinks a photo to a JPEG under the bucket's 4 MB limit
async function toJpeg(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("That file isn't a photo barzi can read. Try a JPEG or PNG."); });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  for (const q of [0.85, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q));
    if (blob && blob.size < 3.8 * 1024 * 1024) return { blob, width, height };
  }
  throw new Error('That photo is too big. Try a smaller one.');
}

export function Flyers({ bar }: { bar: Bar }) {
  const d = bar.data!;
  const live = d.flyers.filter(isLive);
  const weekly = d.events.filter((e) => !e.event_date);
  const oneOffs = d.events.filter((e) => e.event_date && e.event_date >= todayISO());

  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<'night' | 'date'>(weekly.length ? 'night' : 'date');
  const [eventId, setEventId] = useState<string>(weekly[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const forText = (f: FlyerRow) => {
    const e = f.event_id ? d.events.find((x) => x.id === f.event_id) : null;
    if (e) return `${e.title || kindName(e.kind)} · ${e.event_date ? dateText(e.event_date) : daysText(e.days)}`;
    if (f.event_date) return dateText(f.event_date);
    return f.title ?? 'Flyer';
  };

  const pick = (fl: File | null) => {
    setFile(fl);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(fl ? URL.createObjectURL(fl) : null);
  };

  const reset = () => { setAdding(false); pick(null); setDate(''); setError(null); };

  const upload = async () => {
    if (!file) { setError('Choose the flyer photo.'); return; }
    if (mode === 'night' && !eventId) { setError('Pick which night it’s for.'); return; }
    if (mode === 'date' && !date) { setError('Pick the date.'); return; }
    setBusy(true); setError(null);
    const path = `${d.venue.id}/${crypto.randomUUID()}.jpg`;
    try {
      const { blob, width, height } = await toJpeg(file);
      const up = await supabase.storage.from('flyers').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (up.error) throw up.error;
      const linked = mode === 'night' ? d.events.find((e) => e.id === eventId) : oneOffs.find((e) => e.event_date === date);
      const { error } = await supabase.from('venue_flyers').insert({
        venue_id: d.venue.id,
        event_id: linked?.id ?? null,
        event_date: mode === 'date' ? date : null,
        image_path: path,
        width, height,
      });
      if (error) {
        await supabase.storage.from('flyers').remove([path]);
        throw error;
      }
      await bar.reload();
      toast('Flyer added. It’s live on barzi.');
      reset();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (f: FlyerRow) => {
    if (!window.confirm('Take this flyer down?')) return;
    const { error } = await supabase.from('venue_flyers').delete().eq('id', f.id);
    if (error) { toast(message(error), true); return; }
    await supabase.storage.from('flyers').remove([f.image_path]);
    await bar.reload();
    toast('Flyer taken down.');
  };

  return (
    <>
      <Back to="" label={d.venue.name} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Flyers</h1>
        {!adding && live.length < MAX_LIVE && <button type="button" className="btn primary small" onClick={() => setAdding(true)}>+ Add</button>}
      </div>
      <p className="lead" style={{ fontSize: 15 }}>A flyer shows on your page with its night. A flyer for a date comes down by itself the morning after.</p>

      {adding && (
        <section className="card">
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          {preview
            ? <img src={preview} alt="Flyer preview" style={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 8, background: 'var(--surface2)' }} />
            : <button type="button" className="btn full" style={{ height: 120, borderStyle: 'dashed' }} onClick={() => input.current?.click()}>Choose a photo</button>}
          {preview && <button type="button" className="back" onClick={() => input.current?.click()}>Choose another photo</button>}
          <Seg options={[{ value: 'night', label: 'A weekly night' }, { value: 'date', label: 'A date' }]} value={mode} onChange={setMode} />
          {mode === 'night' ? (
            weekly.length ? (
              <Field label="Which night">
                <select className="text" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                  {weekly.map((e) => <option key={e.id} value={e.id}>{e.title || kindName(e.kind)} · {daysText(e.days)}</option>)}
                </select>
              </Field>
            ) : <span className="muted">Add a weekly night first, or pick A date.</span>
          ) : (
            <Field label="Date"><input className="text" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          )}
          <ErrorBox error={error} />
          <div className="row">
            <button type="button" className="btn" onClick={reset}>Cancel</button>
            <button type="button" className="btn primary grow" disabled={busy} onClick={upload}>{busy ? 'Uploading…' : 'Post flyer'}</button>
          </div>
        </section>
      )}

      {live.length ? (
        <div className="flyers">
          {live.map((f) => (
            <div key={f.id} className="flyer">
              <img src={flyerUrl(f.image_path)} alt={`Flyer for ${forText(f)}`} loading="lazy" />
              <div className="cap">
                <span>{forText(f)}</span>
                <button type="button" className="btn small danger" onClick={() => remove(f)}>Take down</button>
              </div>
            </div>
          ))}
        </div>
      ) : !adding && <div className="empty">No flyers up. Post the one you'd put on Instagram.</div>}
      {live.length >= MAX_LIVE && <p className="small">That's the most flyers a bar can have up ({MAX_LIVE}). Take one down to add another.</p>}
    </>
  );
}
