import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function SeriesMaster({ onExit }) {
  const [seriesName, setSeriesName] = useState("");
  const [categoryName, setCategoryName] = useState("");

  const [categories, setCategories] = useState([]);
  const [seriesList, setSeriesList] = useState([]);

  // Load categories & series
  useEffect(() => {
    async function load() {
      const c = await api.get("/categories");
      const s = await api.get("/series");
      setCategories(c.data || []);
      setSeriesList(s.data || []);
    }
    load();
  }, []);

  // Save series (NAME-BASED)
  const saveSeries = async () => {
    if (!seriesName || !categoryName) {
      alert("Enter series name and select category");
      return;
    }

    await api.post("/series", {
      SeriesName: seriesName,
      CategoryName: categoryName
    });

    setSeriesName("");
    setCategoryName("");

    const s = await api.get("/series");
    setSeriesList(s.data || []);
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>Series Master</h3>

      <input
        placeholder="Series name"
        value={seriesName}
        onChange={e => setSeriesName(e.target.value)}
      />

      <select
        value={categoryName}
        onChange={e => setCategoryName(e.target.value)}
        style={{ marginLeft: 8 }}
      >
        <option value="">Select Category</option>
        {categories.map(c => (
          <option key={c.CategoryName} value={c.CategoryName}>
            {c.CategoryName}
          </option>
        ))}
      </select>

      <div style={{ marginTop: 8 }}>
        <button onClick={saveSeries}>Save</button>
        <button onClick={onExit} style={{ marginLeft: 8 }}>
          Back
        </button>
      </div>

      <hr />

      <ul>
        {seriesList.map(s => (
          <li key={s.SeriesName}>
            {s.SeriesName}
          </li>
        ))}
      </ul>
    </div>
  );
}
