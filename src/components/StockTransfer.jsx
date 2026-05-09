import React, { useEffect, useState, useRef } from "react";
import { api } from "../services/api";

const LOCATIONS = ["Jaipur", "Ahmedabad", "Kolkata"];
const LOCATION_MAP = {
  Jaipur: 1,
  Ahmedabad: 3,
  Kolkata: 2
};
export default function StockTransfer() {
  const user = JSON.parse(localStorage.getItem("kf_user"));

  const [products, setProducts] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(0);

  // header
  const [fromLocation, setFromLocation] = useState(LOCATIONS[0]);
  const [toLocation, setToLocation] = useState(LOCATIONS[1]);

  // row input
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rows, setRows] = useState([]);

  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showItemSug, setShowItemSug] = useState(false);

  // size logic
  const [isOnlineEnabled, setIsOnlineEnabled] = useState(false);
  const [enabledSizes, setEnabledSizes] = useState([]);
  const [sizeQty, setSizeQty] = useState({});
const [sizeStock, setSizeStock] = useState({});
  const itemRef = useRef();
  const qtyRef = useRef();

  // ---------------- LOAD PRODUCTS ----------------
  useEffect(() => {
    async function load() {
      const p = await api.get("/products");

      setProducts(
  (p.data || []).map(r => ({
    ProductID:
      r.ProductID,

    item:
      r.Item,

    seriesname:
      r.SeriesName,

    categoryname:
      r.CategoryName
  }))
);
    }

    load().catch(() => alert("Failed to load products"));
  }, []);

  // ---------------- ITEM SEARCH ----------------
  const onItemChange = (val) => {
    setItem(val);
    setSelectedProduct(null);

    if (!val) {
      setShowItemSug(false);
      return;
    }

    const matches = products
      .filter(p =>
        (p.item || "").toLowerCase().includes(val.toLowerCase())
      )
      .slice(0, 10);

    setItemSuggestions(matches);
    setShowItemSug(matches.length > 0);
  };

  // ---------------- SELECT PRODUCT ----------------
  const selectProduct = async (p) => {

  setSelectedProduct(p);

  setItem(p.item);

  setShowItemSug(false);

  setTimeout(
    () => qtyRef.current?.focus(),
    100
  );

  try {

    const res =
      await api.get(
        `/online/status-by-item/${p.item}`
      );

    if (res.data?.is_online) {

      setIsOnlineEnabled(true);

      setEnabledSizes(
        res.data.sizes || []
      );

      setSizeQty({});

      // --------------------------
      // LOAD SOURCE LOCATION STOCK
      // --------------------------

      const locationid =
        LOCATION_MAP[fromLocation];

      const stockRes =
        await api.get(
          `/online/location-size-stock/${p.ProductID || p.productid}/${locationid}`
        );

      const stockMap = {};

      (stockRes.data || []).forEach(s => {

        stockMap[s.size_code] =
          Number(s.qty || 0);
      });

      setSizeStock(stockMap);

    } else {

      setIsOnlineEnabled(false);

      setEnabledSizes([]);

      setSizeStock({});
    }

  } catch {

    setIsOnlineEnabled(false);

    setEnabledSizes([]);

    setSizeStock({});
  }
};

  // ---------------- SIZE TOTAL ----------------
  const totalSizeQty = Object.values(sizeQty)
    .map(Number)
    .reduce((a, b) => a + b, 0);

  // ---------------- ADD ROW ----------------
  const onAddRow = () => {
    if (!selectedProduct || !qty) {
      alert("Select item and quantity");
      return;
    }

        if (isOnlineEnabled) {
      if (totalSizeQty !== Number(qty)) {
        alert("Size total must equal quantity");
        return;
      }
    }

        setRows(r => [
      ...r,
      {
        Item:
          selectedProduct.item,

        SeriesName:
          selectedProduct.seriesname,

        CategoryName:
          selectedProduct.categoryname,

        Quantity:
          Number(qty),

        // ------------------------------
        // BACKEND EXPECTS SizeRows
        // ------------------------------

        SizeRows:
          isOnlineEnabled
            ? Object.entries(sizeQty)
                .filter(
                  ([, q]) => Number(q || 0) > 0
                )
                .map(
                  ([size_code, q]) => ({
                    size_code,
                    qty: Number(q)
                  })
                )
            : []
      }
    ]);

    setItem("");
    setQty("");
    setSelectedProduct(null);
    setSizeQty({});
    setIsOnlineEnabled(false);

    setTimeout(() => itemRef.current?.focus(), 100);
  };

  const removeRow = (i) =>
    setRows(rows.filter((_, x) => x !== i));

  // ---------------- SUBMIT ----------------
  const onSubmit = async () => {
    if (!rows.length) {
      alert("No items added");
      return;
    }

    if (fromLocation === toLocation) {
      alert("From and To cannot be same");
      return;
    }

    if (!window.confirm("Confirm Stock Transfer?")) return;

    const payload = {
      UserName: user.username,
      FromLocation: fromLocation,
      ToLocation: toLocation,
      Rows: rows
    };

    try {
      const res = await api.post("/stock/transfer", payload);
      if (res.data?.success) {
        alert("Stock transferred successfully");
        setRows([]);
        itemRef.current?.focus();
      }
    } catch (e) {
      alert(e.response?.data?.error || "Transfer failed");
    }
  };

  // ---------------- UI ----------------
  return (
    <div style={{ padding: 20, background: "#f5f5f5" }}>
      <h2>Stock Transfer</h2>

      {/* HEADER */}
      <div style={{ marginBottom: 12 }}>
        <select value={fromLocation} onChange={e => setFromLocation(e.target.value)}>
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>

        <span style={{ margin: "0 10px" }}>→</span>

        <select value={toLocation} onChange={e => setToLocation(e.target.value)}>
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* ENTRY */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ position: "relative", width: 250 }}>
          <input
            ref={itemRef}
            value={item}
            onChange={e => {
              onItemChange(e.target.value);
              setHighlightIndex(0);
            }}
            placeholder="Item"
            style={{ width: "100%", padding: 6 }}
            onKeyDown={e => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIndex(i =>
                  Math.min(i + 1, itemSuggestions.length - 1)
                );
              }

              if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIndex(i => Math.max(i - 1, 0));
              }

              if (e.key === "Enter") {
                e.preventDefault();
                if (itemSuggestions.length > 0) {
                  selectProduct(itemSuggestions[highlightIndex]);
                }
              }

              if (e.key === "ArrowRight") {
                qtyRef.current?.focus();
              }

              if (e.key === "Escape") {
                setShowItemSug(false);
              }
            }}
          />

          {/* DROPDOWN */}
          {showItemSug && (
            <div style={{
              position: "absolute",
              background: "#fff",
              border: "1px solid #ccc",
              width: "100%",
              maxHeight: 200,
              overflowY: "auto",
              zIndex: 10
            }}>
              {itemSuggestions.map((p, i) => (
                <div
                  key={i}
                  onClick={() => selectProduct(p)}
                  style={{
                    padding: 6,
                    cursor: "pointer",
                    background: i === highlightIndex ? "#dbeafe" : "#fff",
                    borderBottom: "1px solid #eee"
                  }}
                >
                  <strong>{p.item}</strong>
                  <div style={{ fontSize: 11 }}>
                    {p.seriesname} | {p.categoryname}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          ref={qtyRef}
          type="number"
          value={qty}
          onChange={e => setQty(e.target.value)}
          placeholder="Qty"
          style={{ width: 80 }}
          onKeyDown={e => {
            if (e.key === "Enter") onAddRow();
            if (e.key === "ArrowLeft") itemRef.current?.focus();
          }}
        />

        <button onClick={onAddRow}>Add</button>
      </div>

      {/* SELECTED INFO */}
      {selectedProduct && (
        <div style={{ marginTop: 6, fontSize: 12 }}>
          {selectedProduct.seriesname} | {selectedProduct.categoryname}
        </div>
      )}

      {/* SIZE INPUT */}
      {isOnlineEnabled && (
        <div style={{ marginTop: 10 }}>
          <b>Size Qty</b>
          {enabledSizes.map(sz => (
            <div key={sz}>
              {sz}
(
Available:
{sizeStock[sz] || 0}
)
              <input
                type="number"
                value={sizeQty[sz] || ""}
                onChange={e =>
                  setSizeQty({ ...sizeQty, [sz]: Number(e.target.value) })
                }
                style={{ marginLeft: 8 }}
              />
            </div>
          ))}
          <div>Total: {totalSizeQty} / {qty || 0}</div>
        </div>
      )}

      {/* TABLE */}
      <table width="100%" border="1" style={{ marginTop: 12, background: "#fff" }}>
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
                <button onClick={() => removeRow(i)}>X</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={onSubmit} style={{ marginTop: 12 }}>
        Submit Transfer
      </button>
    </div>
  );
}