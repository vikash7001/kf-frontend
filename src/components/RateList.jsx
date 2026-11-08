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

// Vitrino = WSP x 2.7, rounded to the nearest price ending in 5 or 9
// (exactly in the middle → the higher one). Same rule as the SQL.
export function vitrinoFromWsp(wsp) {
  const w = Number(wsp);
  if (wsp === '' || wsp === null || wsp === undefined || !Number.isFinite(w) || w <= 0) return null;
  const x = w * 2.7, b = Math.floor(x / 10) * 10;
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
      await api.put('/series/rate', body);
      // lock saved values into state
      setRows(prev => prev.map(x => (x.SeriesName === r.SeriesName ? { ...x, ...body } : x)));
      setSaved(prev => ({ ...prev, [r.SeriesName]: { ...r, ...body } }));
      setMsg({ series: r.SeriesName, ok: true, text: '✓ Saved' });
    } catch (e) {
      setMsg({ series: r.SeriesName, ok: false, text: e?.response?.data?.error || 'Not saved' });
    } finally {
      setSavingSeries(null);
    }
  }

  const q = search.trim().toLowerCase();
  const shown = rows.filter(r => !q || `${r.SeriesName} ${r.CategoryName || ''}`.toLowerCase().includes(q));

  return (
    <div>
      <h3>Rate List</h3>

      <input
        placeholder="Search series"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 10, width: 220 }}
      />

      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Series</th>
            {RATES.map(({ key, label }) => (
              <th key={key}>
                {label}
                {key === 'Vitrino' && <div style={{ fontSize: 11, fontWeight: 400, color: '#777' }}>2.7 × WSP</div>}
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
