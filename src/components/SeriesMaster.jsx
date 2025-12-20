import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function SeriesMaster({ onExit }) {
  const [seriesName, setSeriesName] = useState("");
  const [categoryId, setCategoryId] = useState("");

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

  // Save series
  const saveSeries = async () => {
    if (!seriesName || !categoryId) {
      alert("Enter series name and select category");
      return;
    }

    await api.post("/series", {
      SeriesName: seriesName,
      CategoryID: categoryId
    });

    setSeriesName("");
    setCategoryId("");

    const s = await api.get("/series");
    setSeriesList(s.data || []);
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>Series Master</h3>

      <div style={{ marginBottom: 8 }}>
        <input
          placeholder="Series name"
          value={seriesName}
          onChange={e => setSeriesName(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
        >
          <option value="">Select Category</option>
          {categories.map(c => (
            <option key={c.CategoryID} value={c.CategoryID}>
              {c.CategoryName}
            </option>
          ))}
        </select>
      </div>

      <button onClick={saveSeries}>Save</button>
      <button onClick={onExit} style={{ marginLeft: 8 }}>
        Back
      </button>

      <hr />

      <ul>
        {seriesList.map(s => (
          <li key={s.SeriesID}>
            {s.SeriesName} ({s.CategoryName})
          </li>
        ))}
      </ul>
    </div>
  );
}
