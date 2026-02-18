import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function ProductMaster({ onExit }) {
  const [item, setItem] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [origin, setOrigin] = useState("");

  const [seriesList, setSeriesList] = useState([]);
  const [list, setList] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const s = await api.get("/series");
    const p = await api.get("/products");
    setSeriesList(s.data || []);
    setList(p.data || []);
  };

  const onSeriesChange = (val) => {
    setSeriesName(val);
    const s = seriesList.find(x => x.SeriesName === val);
    setCategoryName(s?.CategoryName || "");
  };

  const save = async () => {
    if (!item || !seriesName || !categoryName || !origin) {
      alert("Item, Series, Category and Origin required");
      return;
    }

    await api.post("/products", {
      Item: item,
      SeriesName: seriesName,
      CategoryName: categoryName,
      Origin: origin
    });

    setItem("");
    setSeriesName("");
    setCategoryName("");
    setOrigin("");
    load();
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>Product Master</h3>

      <input
        placeholder="Item"
        value={item}
        onChange={e => setItem(e.target.value)}
      />

      <select
        value={seriesName}
        onChange={e => onSeriesChange(e.target.value)}
      >
        <option value="">Select Series</option>
        {seriesList.map(s => (
          <option key={s.SeriesName} value={s.SeriesName}>
            {s.SeriesName}
          </option>
        ))}
      </select>

      <input
        value={categoryName}
        readOnly
        placeholder="Category"
        style={{ background: "#f0f0f0" }}
      />

      {/* ORIGIN DROPDOWN */}
      <select
        value={origin}
        onChange={e => setOrigin(e.target.value)}
      >
        <option value="">Select Origin</option>
        <option value="Jaipur">Jaipur</option>
        <option value="Kolkata">Kolkata</option>
        <option value="Ahmedabad">Ahmedabad</option>
      </select>

      <br /><br />

      <button onClick={save}>Save</button>
      <button onClick={onExit} style={{ marginLeft: 8 }}>Back</button>

      <hr />

      <ul>
        {list.map(p => (
          <li key={p.ProductID}>
            {p.Item} ({p.SeriesName}) - {p.Origin}
          </li>
        ))}
      </ul>
    </div>
  );
}
