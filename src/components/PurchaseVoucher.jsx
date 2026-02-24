import React, { useEffect, useState, useRef } from "react";
import { api, postIncoming } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata", "Ahmedabad"];

export default function PurchaseVoucher() {

  const user = JSON.parse(localStorage.getItem("kf_user"));

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

  useEffect(() => {
    const handler = e => {
      if (itemRef.current && !itemRef.current.contains(e.target)) {
        setShowItemSug(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

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
  };

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

  return (
    <div className="voucher-wrapper">

      <div className="voucher-top">
        <h2>Purchase Voucher</h2>

        <div className="location-group">
          <label>Location</label>
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
      </div>

      <div className="voucher-entry">

        <div ref={itemRef} className="entry-item">
          <input
            ref={itemInputRef}
            placeholder="Search Item..."
            value={item}
            onChange={e => onItemChange(e.target.value)}
            disabled={loading}
          />

          {showItemSug && (
            <div className="suggestion-box">
              {itemSuggestions.map((p, i) => (
                <div
                  key={i}
                  onClick={() => selectProduct(p)}
                  className="suggestion-item"
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
        />

        <button onClick={onAddRow} disabled={loading}>
          Add
        </button>

        <input value={series} placeholder="Series" readOnly />
        <input value={category} placeholder="Category" readOnly />
      </div>

      <div className="table-box">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Series</th>
              <th>Category</th>
              <th className="qty-col">Qty</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.Item}</td>
                <td>{r.SeriesName}</td>
                <td>{r.CategoryName}</td>
                <td className="qty-col">{r.Quantity}</td>
                <td>
                  <button
                    className="remove-btn"
                    onClick={() => removeRow(i)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="voucher-footer">
        <div>Total Pieces: <strong>{totalQty}</strong></div>
        <button className="submit-btn" onClick={onSubmit}>
          Submit Incoming
        </button>
      </div>

      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Confirm Posting</h3>
            <div><strong>Location:</strong> {location}</div>
            <div><strong>Total Pieces:</strong> {totalQty}</div>
            <div className="confirm-actions">
              <button onClick={() => setShowConfirm(false)}>Back</button>
              <button onClick={confirmSubmit}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          Posting... Please wait
        </div>
      )}

    </div>
  );
}