import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function ProductMaster({ onExit }) {
  const [item, setItem] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [series, setSeries] = useState([]);
  const [list, setList] = useState([]);

  useEffect(() => {
    api.get("/series").then(r => setSeries(r.data || []));
    api.get("/products").then(r => setList(r.data || []));
  }, []);

  const save = async () => {
    if (!item || !seriesId) return alert("Fill all fields");
    await api.post("/products", {
      Item: item,
      SeriesID: seriesId
    });
    setItem("");
    setSeriesId("");
    const r = await api.get("/products");
    setList(r.data || []);
  };

  return (
    <div>
      <h3>Product Master</h3>

      <input
        placeholder="Item code / name"
        value={item}
        onChange={e => setItem(e.target.value)}
      />

      <select value={seriesId} onChange={e => setSeriesId(e.target.value)}>
        <option value="">Select series</option>
        {series.map(s => (
          <option key={s.SeriesID} value={s.SeriesID}>
            {s.SeriesName}
          </option>
        ))}
      </select>

      <button onClick={save}>Save</button>
      <button onClick={onExit}>Back</button>

      <ul>
        {list.map(p => (
          <li key={p.ProductID}>
            {p.Item} ({p.SeriesName})
          </li>
        ))}
      </ul>
    </div>
  );
}
