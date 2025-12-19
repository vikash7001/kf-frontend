import React, { useEffect, useState, useRef } from "react";
import { api, postIncoming } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata"];

export default function PurchaseVoucher() {
  console.log("PurchaseVoucher mounted");

  const user = JSON.parse(localStorage.getItem("kf_user"));

  // lookups
  const [products, setProducts] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [categories, setCategories] = useState([]);

  // form inputs
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [item, setItem] = useState("");
  const [series, setSeries] = useState("");
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState("");

  // suggestions
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [seriesSuggestions, setSeriesSuggestions] = useState([]);
  const [showItemSug, setShowItemSug] = useState(false);
  const [showSeriesSug, setShowSeriesSug] = useState(false);

  const [rows, setRows] = useState([]);

  const itemRef = useRef(null);
  const seriesRef = useRef(null);

  // LOAD LOOKUPS
  useEffect(() => {
    console.log("Loading lookups...");

    (async () => {
      try {
        const p = await api.get("/products");

const normalized = (p.data || []).map(r => ({
  ProductID: r.productid,
  Item: r.item,
  SeriesName: r.seriesname,
  CategoryName: r.categoryname
}));

setProducts(normalized);

        const s = await api.get("/series");
        setSeriesList((s.data || []).map(r => r.seriesname));


        const c = await api.get("/categories");
        setCategories((c.data || []).map(r => r.categoryname));


      } catch (err) {
        console.error("Lookup fetch error", err);
        alert("Failed to load lookups");
      }
    })();
  }, []);

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handler = e => {
      if (itemRef.current && !itemRef.current.contains(e.target)) setShowItemSug(false);
      if (seriesRef.current && !seriesRef.current.contains(e.target)) setShowSeriesSug(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ITEM INPUT
  const onItemChange = val => {
    setItem(val);
    setSeries("");
    setCategory("");

    if (!val.trim()) {
      setShowItemSug(false);
      return;
    }

    const q = val.toLowerCase();
    const matches = products.filter(p =>
      (p.item && p.item.toLowerCase().includes(q)) ||
      (p.productid && p.productid.toString().includes(q))
    );

    setItemSuggestions(matches);
    setShowItemSug(matches.length > 0);
  };

  const selectProduct = p => {
    setItem(p.item);
    setSeries(p.seriesname);
    setCategory(p.categoryname);
    setShowItemSug(false);
  };

  // SERIES INPUT
  const onSeriesChange = val => {
    setSeries(val);
    setCategory("");

    if (!val.trim()) {
      setShowSeriesSug(false);
      return;
    }

    const q = val.toLowerCase();
    const matches = seriesList.filter(s => s.toLowerCase().startsWith(q));
    setSeriesSuggestions(matches);
    setShowSeriesSug(matches.length > 0);

    const exact = seriesList.find(s => s.toLowerCase() === q);
    if (exact) {
      const p = products.find(pr => pr.seriesname === exact);
      if (p) setCategory(p.categoryname);
    }
  };

  const selectSeries = s => {
    setSeries(s);
    setShowSeriesSug(false);
    const p = products.find(pr => pr.seriesname === s);
    if (p) setCategory(p.categoryname);
  };

  // ADD ROW
  const onAddRow = () => {
    if (!item || !qty) {
      alert("Enter Item and Quantity");
      return;
    }

    const existing = products.find(p => p.item === item && p.seriesname === series);

    if (!existing && !series.trim()) {
      alert("New item — enter Series");
      return;
    }

    if (!seriesList.includes(series) && !category.trim()) {
      alert("New series — select Category");
      return;
    }

    setRows(prev => [
      ...prev,
      {
        Item: item,
        SeriesName: series,
        CategoryName: category,
        Quantity: Number(qty)
      }
    ]);

    setItem("");
    setSeries("");
    setCategory("");
    setQty("");
  };

  const removeRow = i => setRows(rows.filter((_, idx) => idx !== i));

  // SUBMIT
  const onSubmit = async () => {
    if (!rows.length) {
      alert("No rows to post");
      return;
    }

const payload = {
  UserID: user.userid,
  UserName: user.username,
  Location: location,
  Rows: rows
};

    try {
      const res = await postIncoming(payload);
      if (res.data?.success) {
        alert("Posted successfully");
        setRows([]);
      } else {
        alert("Post failed");
      }
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Submit failed — check console");
    }
  };

  const small = { padding: "6px 8px", marginRight: 8 };

  return (
    <div style={{ padding: 18 }}>
      <h2>Purchase Voucher (Incoming)</h2>

      <div style={{ marginBottom: 12 }}>
        <label>Location:</label>
        <select value={location} onChange={e => setLocation(e.target.value)}>
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div ref={itemRef} style={{ position: "relative" }}>
          <input
            style={{ ...small, width: 220 }}
            placeholder="Item"
            value={item}
            onChange={e => onItemChange(e.target.value)}
          />
          {showItemSug && (
            <div style={{ position: "absolute", top: 36, background: "#fff", border: "1px solid #ccc" }}>
              {itemSuggestions.map((p, i) => (
                <div key={i} onClick={() => selectProduct(p)} style={{ padding: 8, cursor: "pointer" }}>
                  <b>{p.item}</b> — {p.seriesname} ({p.categoryname})
                </div>
              ))}
            </div>
          )}
        </div>

        <div ref={seriesRef} style={{ position: "relative" }}>
          <input
            style={{ ...small, width: 180 }}
            placeholder="Series"
            value={series}
            onChange={e => onSeriesChange(e.target.value)}
          />
          {showSeriesSug && (
            <div style={{ position: "absolute", top: 36, background: "#fff", border: "1px solid #ccc" }}>
              {seriesSuggestions.map((s, i) => (
                <div key={i} onClick={() => selectSeries(s)} style={{ padding: 8, cursor: "pointer" }}>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          list="catList"
          style={{ ...small, width: 180 }}
          placeholder="Category"
          value={category}
          onChange={e => setCategory(e.target.value)}
        />
        <datalist id="catList">
          {categories.map((c, i) => <option key={i} value={c} />)}
        </datalist>

        <input
          style={{ ...small, width: 80 }}
          type="number"
          placeholder="Qty"
          value={qty}
          onChange={e => setQty(e.target.value)}
        />

        <button onClick={onAddRow}>Add</button>
      </div>

      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Item</th>
            <th>Series</th>
            <th>Category</th>
            <th>Qty</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan="5" align="center">No rows added</td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.Item}</td>
              <td>{r.SeriesName}</td>
              <td>{r.CategoryName}</td>
              <td align="right">{r.Quantity}</td>
              <td>
                <button onClick={() => removeRow(i)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 12 }}>
        <button onClick={onSubmit}>Submit Incoming</button>
      </div>
    </div>
  );
}
