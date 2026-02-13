import React, { useEffect, useState, useRef } from "react";
import { api, postIncoming } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata", "Ahmedabad"];

export default function PurchaseVoucher() {

  const user = JSON.parse(localStorage.getItem("kf_user"));

  // ---------------- STATE ----------------

  const [products, setProducts] = useState([]);

  const [location, setLocation] = useState(LOCATIONS[0]);
  const [item, setItem] = useState("");
  const [series, setSeries] = useState("");
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState("");

  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showItemSug, setShowItemSug] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const itemRef = useRef(null);
  const itemInputRef = useRef(null);

  // ---------------- LOAD PRODUCTS ----------------

  useEffect(() => {
    (async () => {
      try {
        const p = await api.get("/products");
        setProducts(
          (p.data || []).map(r => ({
            item: r.Item,
            seriesname: r.SeriesName,
            categoryname: r.CategoryName
          }))
        );
      } catch {
        alert("Failed to load products");
      }
    })();
  }, []);

  // ---------------- HIDE DROPDOWN ----------------

  useEffect(() => {
    const handler = e => {
      if (itemRef.current && !itemRef.current.contains(e.target)) {
        setShowItemSug(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ---------------- ITEM CHANGE ----------------

  const onItemChange = val => {
    setItem(val);
    setSeries("");
    setCategory("");
    setHighlightIndex(-1);

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

  const selectProduct = p => {
    setItem(p.item);
    setSeries(p.seriesname);
    setCategory(p.categoryname);
    setShowItemSug(false);
    setHighlightIndex(-1);
  };

  // ---------------- ADD ROW ----------------

  const onAddRow = () => {
    if (!item || !qty) {
      alert("Enter Item and Quantity");
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
    setItemSuggestions([]);
    setShowItemSug(false);
    setHighlightIndex(-1);

    setTimeout(() => {
      itemInputRef.current?.focus();
    }, 0);
  };

  const removeRow = i =>
    setRows(rows.filter((_, idx) => idx !== i));

  const totalQty = rows.reduce(
    (sum, r) => sum + Number(r.Quantity || 0),
    0
  );

  // ---------------- SUBMIT ----------------

  const onSubmit = () => {
    if (!rows.length) {
      alert("No rows to post");
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    const payload = {
      UserID: user.userid,
      UserName: user.username,
      Location: location,
      Rows: rows
    };

    try {
      setShowConfirm(false);
      setLoading(true);

      const res = await postIncoming(payload);
      if (res.data?.success) {
        alert("Posted successfully");
        setRows([]);
      }
    } catch {
      alert("Submit failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- UI ----------------

  return (
    <div>

      <h2>Purchase Voucher (Incoming)</h2>

      <div style={{ marginBottom: 12 }}>
        <label>Location: </label>
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

      {/* ENTRY ROW */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>

        <div ref={itemRef} style={{ position: "relative" }}>
          <input
            ref={itemInputRef}
            placeholder="Item"
            value={item}
            onChange={e => onItemChange(e.target.value)}
            disabled={loading}
            autoFocus
            onKeyDown={e => {
              if (!showItemSug) return;

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIndex(prev =>
                  prev < itemSuggestions.length - 1 ? prev + 1 : prev
                );
              }

              if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIndex(prev =>
                  prev > 0 ? prev - 1 : 0
                );
              }

              if (e.key === "Enter") {
                e.preventDefault();
                if (highlightIndex >= 0) {
                  selectProduct(itemSuggestions[highlightIndex]);
                }
              }
            }}
          />

          {showItemSug && (
            <div
              style={{
                position: "absolute",
                background: "#fff",
                border: "1px solid #ccc",
                width: "100%",
                maxHeight: 200,
                overflowY: "auto",
                zIndex: 10
              }}
            >
              {itemSuggestions.map((p, i) => (
                <div
                  key={i}
                  onClick={() => selectProduct(p)}
                  style={{
                    padding: 8,
                    cursor: "pointer",
                    background:
                      i === highlightIndex
                        ? "#d9e2ff"
                        : "transparent"
                  }}
                >
                  {p.item}
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="number"
          placeholder="Qty"
          value={qty}
          onChange={e => setQty(e.target.value)}
          disabled={loading}
          onKeyDown={e => {
            if (e.key === "Enter") onAddRow();
          }}
        />

        <button onClick={onAddRow} disabled={loading}>
          Add
        </button>

        <input value={series} placeholder="Series" readOnly />
        <input value={category} placeholder="Category" readOnly />
      </div>

      {/* TABLE */}
      <table>
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
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.Item}</td>
              <td>{r.SeriesName}</td>
              <td>{r.CategoryName}</td>
              <td>{r.Quantity}</td>
              <td>
                <button
                  className="secondary"
                  onClick={() => removeRow(i)}
                  disabled={loading}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 14 }}>
        <strong>Total Pieces:</strong> {totalQty}
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={onSubmit} disabled={loading}>
          Submit Incoming
        </button>
      </div>

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Confirm Posting</h3>

            <div><strong>Location:</strong> {location}</div>
            <div><strong>Total Pieces:</strong> {totalQty}</div>

            <div style={{ marginTop: 15, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="secondary" onClick={() => setShowConfirm(false)}>
                Back
              </button>
              <button onClick={confirmSubmit}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="loading-overlay">
          Posting... Please wait
        </div>
      )}

    </div>
  );
}
