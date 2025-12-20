import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function ProductMaster({ onExit }) {
  const [item, setItem] = useState("");
  const [seriesName, setSeriesName] = useState("");

  const [seriesList, setSeriesList] = useState([]);
  const [productList, setProductList] = useState([]);

  // Load series & products
  useEffect(() => {
    async function load() {
      const s = await api.get("/series");
      const p = await api.get("/products");
      setSeriesList(s.data || []);
      setProductList(p.data || []);
    }
    load();
  }, []);

  // Save product (NAME-BASED)
  const save = async () => {
    if (!item || !seriesName) {
      alert("Enter item and select series");
      return;
    }

    const selectedSeries = seriesList.find(
      s => s.SeriesName === seriesName
    );

    if (!selectedSeries) {
      alert("Invalid series selected");
      return;
    }

    await api.post("/products", {
      Item: item,
      SeriesName: selectedSeries.SeriesName,
      CategoryName: selectedSeries.CategoryName
    });

    setItem("");
    setSeriesName("");

    const p = await api.get("/products");
    setProductList(p.data || []);
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>Product Master</h3>

      <div style={{ marginBottom: 8 }}>
        <input
          placeholder="Item code / name"
          value={item}
          onChange={e => setItem(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <select
          value={seriesName}
          onChange={e => setSeriesName(e.target.value)}
        >
          <option value="">Select Series</option>
          {seriesList.map(s => (
            <option key={s.SeriesName} value={s.SeriesName}>
              {s.SeriesName}
            </option>
          ))}
        </select>
      </div>

      <button onClick={save}>Save</button>
      <button onClick={onExit} style={{ marginLeft: 8 }}>
        Back
      </button>

      <hr />

      <ul>
        {productList.map(p => (
          <li key={p.ProductID}>
            {p.Item} ({p.SeriesName})
          </li>
        ))}
      </ul>
    </div>
  );
}
