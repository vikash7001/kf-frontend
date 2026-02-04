import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL;

export default function RateList({ onExit }) {
  const [rows, setRows] = useState([]);
  const [savingSeries, setSavingSeries] = useState(null);

  useEffect(() => {
    loadSeries();
  }, []);

  async function loadSeries() {
    const res = await fetch(`${API}/series`);
    const data = await res.json();
    setRows(data);
  }

  async function saveRate(seriesName, rate) {
    setSavingSeries(seriesName);

    const finalRate =
      rate === '' || rate === null ? null : Number(rate);

    try {
      await fetch(`${API}/series/rate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SeriesName: seriesName,
          Rate: finalRate
        })
      });

      // ✅ lock saved value into state
      setRows(prev =>
        prev.map(r =>
          r.SeriesName === seriesName
            ? { ...r, Rate: finalRate }
            : r
        )
      );

    } finally {
      setSavingSeries(null);
    }
  }

  return (
    <div>
      <h3>Rate List</h3>

      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Series</th>
            <th>Rate</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {rows.map(r => (
            <tr key={r.SeriesName}>
              <td>{r.SeriesName}</td>

              <td>
                <input
                  type="number"
                  step="0.01"
                  value={r.Rate ?? ''}
                  onChange={e => {
                    const val = e.target.value;
                    setRows(prev =>
                      prev.map(x =>
                        x.SeriesName === r.SeriesName
                          ? { ...x, Rate: val }
                          : x
                      )
                    );
                  }}
                />
              </td>

              <td>
                <button
                  disabled={savingSeries === r.SeriesName}
                  onClick={() => saveRate(r.SeriesName, r.Rate)}
                >
                  {savingSeries === r.SeriesName ? 'Saving...' : 'Save'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />
      <button onClick={onExit}>Back</button>
    </div>
  );
}
