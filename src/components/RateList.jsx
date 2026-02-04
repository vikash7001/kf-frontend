import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL;

export default function RateList({ onExit }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSeries();
  }, []);

  async function loadSeries() {
   const res = await fetch(`${API}/series`);
    const data = await res.json();
    setRows(data);
  }

async function saveRate(seriesName, rate) {
  setLoading(true);

  await fetch(`${API}/series/rate`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      SeriesName: seriesName,
      Rate: rate === '' ? null : Number(rate)
    })
  });

  // 🔹 FORCE LOCAL STATE TO HOLD SAVED VALUE
  setRows(prev =>
    prev.map(r =>
      r.SeriesName === seriesName
        ? { ...r, Rate: rate === '' ? null : Number(rate) }
        : r
    )
  );

  setLoading(false);
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
                    setRows(rows =>
                      rows.map(x =>
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
                  disabled={loading}
                  onClick={() => saveRate(r.SeriesName, r.Rate)}
                >
                  Save
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
