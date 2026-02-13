import React, { useEffect, useState, useRef } from "react";
import { api, postIncoming } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata", "Ahmedabad"];

export default function PurchaseVoucher() {
  const user = JSON.parse(localStorage.getItem("kf_user"));

  // lookups
  const [products, setProducts] = useState([]);

  // form
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [item, setItem] = useState("");
  const [series, setSeries] = useState("");
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState("");

  // suggestions
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showItemSug, setShowItemSug] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const itemRef = useRef(null);
  const itemInputRef = useRef(null);

  // ----------------------------------------------------------
  // LOAD PRODUCTS
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // HIDE SUGGESTIONS
  // ----------------------------------------------------------
  useEffect(() => {
    const handler = e => {
      if (itemRef.current && !itemRef.current.contains(e.target))
        setShowItemSug(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ----------------------------------------------------------
  // ITEM CHANGE
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // ADD ROW
  // ----------------------------------------------------------
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

    // reset
    setItem("");
    setSeries("");
    setCategory("");
    setQty("");
    setItemSuggestions([]);
    setShowItemSug(false);
    setHighlightIndex(-1);

    // auto focus back to item
    setTimeout(() => {
      itemInputRef.current?.focus();
    }, 0);
  };

  const removeRow = i =>
    setRows(rows.filter((_, idx) => idx !== i));

  // ----------------------------------------------------------
  // SUBMIT
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

      {/* FIELD ROW */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>

        {/* ITEM */}
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

        {/* QTY */}
        <input
          type="number"
          placeholder="Qty"
          value={qty}
          onChange={e => setQty(e.target.value)}
          disabled={loading}
          onKeyDown={e => {
            if (e.key === "Enter") {
              onAddRow();
            }
          }}
        />

        {/* ADD */}
        <button onClick={onAddRow} disabled={loading}>
          Add
        </button>

        {/* SERIES (READONLY) */}
        <input
          value={series}
          placeholder="Series"
          readOnly
          tabIndex={-1}
        />

        {/* CATEGORY (READONLY) */}
        <input
          value={category}
          placeholder="Category"
          readOnly
          tabIndex={-1}
        />

      </div>

      {/* ROW TABLE */}
      <table border="1" width="100%">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.Item}</td>
              <td>{r.SeriesName}</td>
              <td>{r.CategoryName}</td>
              <td>{r.Quantity}</td>
              <td>
                <button
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

      <div style={{ marginTop: 12 }}>
        <button onClick={onSubmit} disabled={loading}>
          {loading ? "Posting..." : "Submit Incoming"}
        </button>
      </div>

      {/* LOADING OVERLAY */}
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
