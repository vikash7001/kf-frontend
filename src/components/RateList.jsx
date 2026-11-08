import React, { useEffect, useState } from 'react';

import { api } from '../services/api';

// ==========================================================
// RATE LIST – four rates per series.
// RSP is the old single "Rate" (bot, design search etc. use it).
// WSP, KF and Vitrino are kept here for reference.
// ==========================================================
const RATES = [
  { key: 'WSP', label: 'WSP' },
  { key: 'Rate', label: 'RSP' },
  { key: 'KF', label: 'KF' },
  { key: 'Vitrino', label: 'Vitrino' }
];

// Vitrino = WSP x 1.9, rounded to the nearest price ending in 5 or 9
// (exactly in the middle → the higher one). Same rule as the SQL.
export function vitrinoFromWsp(wsp) {
  const w = Number(wsp);
  if (wsp === '' || wsp === null || wsp === undefined || !Number.isFinite(w) || w <= 0) return null;
  const x = w * 1.9, b = Math.floor(x / 10) * 10;
  return [b - 1, b + 5, b + 9]
    .map(c => ({ c, d: Math.abs(x - c) }))
    .sort((p, q) => p.d - q.d || q.c - p.c)[0].c;
}

const clean = v => (v === '' || v === null || v === undefined ? null : Number(v));
const same = (a, b) => clean(a) === clean(b);

export default function RateList({ onExit }) {
  const [rows, setRows] = useState([]);
  const [saved, setSaved] = useState({});          // series -> last saved values
  const [savingSeries, setSavingSeries] = useState(null);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState(null);            // { series, ok, text }
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState(null);    // { ok, text }

  useEffect(() => {
    loadSeries();
  }, []);

  async function loadSeries() {
    const res = await api.get('/series');
    setRows(res.data);
    setSaved(Object.fromEntries(res.data.map(r => [r.SeriesName, { ...r }])));
  }

  // typing WSP fills Vitrino by itself (it can still be changed by hand)
  const setValue = (series, key, val) =>
    setRows(prev => prev.map(x => {
      if (x.SeriesName !== series) return x;
      const next = { ...x, [key]: val };
      if (key === 'WSP') {
        const v = vitrinoFromWsp(val);
        if (v !== null) next.Vitrino = v;
      }
      return next;
    }));

  const changed = r => RATES.some(({ key }) => !same(r[key], saved[r.SeriesName]?.[key]));

  async function saveRow(r) {
    setSavingSeries(r.SeriesName);
    setMsg(null);
    const body = { SeriesName: r.SeriesName };
    RATES.forEach(({ key }) => { body[key] = clean(r[key]); });

    try {
      const res = await api.put('/series/rate', body);
      const w = res.data?.website;
      // lock saved values into state
      setRows(prev => prev.map(x => (x.SeriesName === r.SeriesName ? { ...x, ...body } : x)));
      setSaved(prev => ({ ...prev, [r.SeriesName]: { ...r, ...body } }));
      setMsg({
        series: r.SeriesName,
        ok: !w || w.ok,
        text: !w ? '✓ Saved'
          : w.ok ? `✓ Saved · website updated (${w.products} design${w.products === 1 ? '' : 's'})`
          : `✓ Saved · ⚠ website not updated: ${w.error}`
      });
    } catch (e) {
      setMsg({ series: r.SeriesName, ok: false, text: e?.response?.data?.error || 'Not saved' });
    } finally {
      setSavingSeries(null);
    }
  }

  // one-time: send every saved Vitrino rate to the website
  async function pushAll() {
    if (!window.confirm('Send the saved Vitrino rate of every series to the website (vitrino.in) as its selling price?\nMRP is not changed.')) return;
    setPushing(true);
    setPushMsg(null);
    try {
      const res = await api.post('/series/rate/website', {});
      const w = res.data?.website;
      if (!res.data?.sent) setPushMsg({ ok: false, text: 'No series has a Vitrino rate yet.' });
      else if (!w?.ok) setPushMsg({ ok: false, text: `Website not updated: ${w?.error || 'unknown error'}` });
      else {
        const missing = (w.results || []).filter(x => !x.products).map(x => x.series);
        setPushMsg({
          ok: true,
          text: `✓ ${res.data.sent} series sent · ${w.products} designs updated on the website` +
            (missing.length ? ` · not on website: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}` : '')
        });
      }
    } catch (e) {
      setPushMsg({ ok: false, text: e?.response?.data?.error || 'Could not send' });
    } finally {
      setPushing(false);
    }
  }

  const q = search.trim().toLowerCase();
  const shown = rows.filter(r => !q || `${r.SeriesName} ${r.CategoryName || ''}`.toLowerCase().includes(q));

  return (
    <div>
      <h3>Rate List</h3>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <input
          placeholder="Search series"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
        <button onClick={pushAll} disabled={pushing}>
          {pushing ? 'Sending…' : '🌐 Send all Vitrino rates to website'}
        </button>
        {pushMsg && (
          <span style={{ fontWeight: 600, color: pushMsg.ok ? '#2e7d32' : '#c62828' }}>{pushMsg.text}</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
        Saving a Vitrino rate also updates that series' selling price on vitrino.in (MRP stays as it is).
      </div>

      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Series</th>
            {RATES.map(({ key, label }) => (
              <th key={key}>
                {label}
                {key === 'Vitrino' && <div style={{ fontSize: 11, fontWeight: 400, color: '#777' }}>1.9 × WSP</div>}
              </th>
            ))}
            <th></th>
          </tr>
        </thead>

        <tbody>
          {shown.map(r => {
            const dirty = changed(r);
            return (
              <tr key={r.SeriesName} style={dirty ? { background: '#fffbe6' } : null}>
                <td>
                  <b>{r.SeriesName}</b>
                  {r.CategoryName && <div style={{ fontSize: 12, color: '#777' }}>{r.CategoryName}</div>}
                </td>

                {RATES.map(({ key }) => (
                  <td key={key}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={{ width: 90 }}
                      value={r[key] ?? ''}
                      onChange={e => setValue(r.SeriesName, key, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && dirty) saveRow(r); }}
                    />
                  </td>
                ))}

                <td style={{ whiteSpace: 'nowrap' }}>
                  <button
                    disabled={savingSeries === r.SeriesName || !dirty}
                    onClick={() => saveRow(r)}
                  >
                    {savingSeries === r.SeriesName ? 'Saving...' : 'Save'}
                  </button>
                  {msg?.series === r.SeriesName && (
                    <span style={{ marginLeft: 6, fontWeight: 600, color: msg.ok ? '#2e7d32' : '#c62828' }}>
                      {msg.text}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <br />
      <button onClick={onExit}>Back</button>
    </div>
  );
}
