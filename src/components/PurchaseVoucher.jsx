import React, { useEffect, useState, useRef } from "react";
import { api, postIncoming } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata", "Ahmedabad"];

export default function PurchaseVoucher() {
  const user = JSON.parse(localStorage.getItem("kf_user"));

  // lookups
  const [products, setProducts] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [categories, setCategories] = useState([]);

  // form
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

  // 🔹 online size logic
  const [isOnlineEnabled, setIsOnlineEnabled] = useState(false);
  const [enabledSizes, setEnabledSizes] = useState([]);
  const [sizeQty, setSizeQty] = useState({});

  // 🔒 loading freeze state
  const [loading, setLoading] = useState(false);

  const itemRef = useRef(null);
  const seriesRef = useRef(null);

  // ----------------------------------------------------------
  // LOAD LOOKUPS
  // ----------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const p = await api.get("/products");
        const s = await api.get("/series");
        const c = await api.get("/categories");

        setProducts(
          (p.data || []).map(r => ({
            item: r.Item,
            seriesname: r.SeriesName,
            categoryname: r.CategoryName
          }))
        );

        setSeriesList((s.data || []).map(r => r.SeriesName));
        setCategories((c.data || []).map(r => r.CategoryName));
      } catch {
        alert("Failed to load lookups");
      }
    })();
  }, []);

  // ----------------------------------------------------------
  // HIDE SUGGESTIONS
  // ----------------------------------------------------------
  useEffect(() => {
    const handler = e => {
      if (itemRef.current && !itemRef.current.contains(e.target))
        setShowItemSug(false);
      if (seriesRef.current && !seriesRef.current.contains(e.target))
        setShowSeriesSug(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ----------------------------------------------------------
  // ITEM INPUT
  // ----------------------------------------------------------
  const onItemChange = val => {
    setItem(val);
    setSeries("");
    setCategory("");
    setIsOnlineEnabled(false);
    setEnabledSizes([]);
    setSizeQty({});

    if (!val.trim()) {
      setShowItemSug(false);
      return;
    }

    const q = val.toLowerCase();
    const matches = products.filter(p =>
      p.item.toLowerCase().includes(q)
    );

    setItemSuggestions(matches);
    setShowItemSug(matches.length > 0);
  };

  const selectProduct = async p => {
    setItem(p.item);
    setSeries(p.seriesname);
    setCategory(p.categoryname);
    setShowItemSug(false);

    if (location === "Jaipur") {
      try {
        const res = await api.get(`/online/status-by-item/${p.item}`);
        if (res.data?.is_online) {
          setIsOnlineEnabled(true);
          setEnabledSizes(res.data.sizes || []);
          setSizeQty({});
          return;
        }
      } catch {}
    }

    setIsOnlineEnabled(false);
    setEnabledSizes([]);
    setSizeQty({});
  };

  // ----------------------------------------------------------
  // SERIES INPUT
  // ----------------------------------------------------------
  const onSeriesChange = val => {
    setSeries(val);
    setCategory("");

    if (!val.trim()) {
      setShowSeriesSug(false);
      return;
    }

    const q = val.toLowerCase();
    const matches = seriesList.filter(s =>
      s.toLowerCase().startsWith(q)
    );

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

  // ----------------------------------------------------------
  // SIZE TOTAL
  // ----------------------------------------------------------
  const totalSizeQty = Object.values(sizeQty)
    .map(Number)
    .reduce((a, b) => a + b, 0);

  // ----------------------------------------------------------
  // ADD ROW
  // ----------------------------------------------------------
  const onAddRow = () => {
    if (!item || !qty) {
      alert("Enter Item and Quantity");
      return;
    }

    if (isOnlineEnabled && location === "Jaipur") {
      if (!enabledSizes.length) {
        alert("Size details required");
        return;
      }
      if (totalSizeQty !== Number(qty)) {
        alert("Size total must equal quantity");
        return;
      }
    }

    setRows(prev => [
      ...prev,
      {
        Item: item,
        SeriesName: series,
        CategoryName: category,
        Quantity: Number(qty),
        SizeQty: isOnlineEnabled ? sizeQty : null
      }
    ]);

    setItem("");
    setSeries("");
    setCategory("");
    setQty("");
    setIsOnlineEnabled(false);
    setEnabledSizes([]);
    setSizeQty({});
  };

  const removeRow = i =>
    setRows(rows.filter((_, idx) => idx !== i));

  // ----------------------------------------------------------
  // SUBMIT (FREEZE SCREEN)
  // ----------------------------------------------------------
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
      setLoading(true); // 🔒 freeze UI

      const res = await postIncoming(payload);

      if (res.data?.success) {
        alert("Posted successfully");
        setRows([]);
      } else {
        alert("Posting failed");
      }
    } catch {
      alert("Submit failed");
    } finally {
      setLoading(false); // 🔓 unfreeze UI
    }
  };

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------
  return (
    <div style={{ padding: 18 }}>
      <h2>Purchase Voucher (Incoming)</h2>

      <div style={{ marginBottom: 12 }}>
        <label>Location:</label>
        <select
          value={location}
          onChange={e => setLocation(e.target.value)}
          disabled={loading}
        >
          {LOCATIONS.map(l => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* FORM ROW */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Item"
          value={item}
          onChange={e => onItemChange(e.target.value)}
          disabled={loading}
        />

        <input
          placeholder="Series"
          value={series}
          onChange={e => onSeriesChange(e.target.value)}
          disabled={loading}
        />

        <input
          list="catList"
          placeholder="Category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          disabled={loading}
        />

        <input
          type="number"
          placeholder="Qty"
          value={qty}
          onChange={e => setQty(e.target.value)}
          disabled={loading}
        />

        <button onClick={onAddRow} disabled={loading}>
          Add
        </button>
      </div>

      {/* TABLE */}
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
          {rows.length === 0 ? (
            <tr>
              <td colSpan="5" align="center">
                No rows added
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i}>
                <td>{r.Item}</td>
                <td>{r.SeriesName}</td>
                <td>{r.CategoryName}</td>
                <td align="right">{r.Quantity}</td>
                <td>
                  <button
                    onClick={() => removeRow(i)}
                    disabled={loading}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 12 }}>
        <button onClick={onSubmit} disabled={loading}>
          {loading ? "Posting..." : "Submit Incoming"}
        </button>
      </div>

      {/* 🔒 FULL SCREEN FREEZE OVERLAY */}
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            color: "#fff",
            fontSize: 22,
            fontWeight: "bold"
          }}
        >
          Posting... Please wait
        </div>
      )}
    </div>
  );
}
