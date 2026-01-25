import React, { useEffect, useState } from "react";
import { api } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata"];
const ALL_SIZES = ["S","M","L","XL","XXL","3XL","4XL","5XL","6XL","7XL"];

export default function StockTransfer() {
  const user = JSON.parse(localStorage.getItem("kf_user"));

  const [products, setProducts] = useState([]);

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

  // 🔹 online size logic
  const [isOnlineEnabled, setIsOnlineEnabled] = useState(false);
  const [enabledSizes, setEnabledSizes] = useState([]);
  const [sizeQty, setSizeQty] = useState({});

  // --------------------------------------------------
  // LOAD PRODUCTS
  // --------------------------------------------------
  useEffect(() => {
    async function load() {
      const p = await api.get("/products");

      setProducts(
        (p.data || []).map(r => ({
          item: r.Item,
          seriesname: r.SeriesName,
          categoryname: r.CategoryName
        }))
      );
    }

    load().catch(() => alert("Failed to load products"));
  }, []);

  // --------------------------------------------------
  // ITEM SEARCH
  // --------------------------------------------------
  const onItemChange = (val) => {
    setItem(val);
    setSelectedProduct(null);
    setIsOnlineEnabled(false);
    setEnabledSizes([]);
    setSizeQty({});

    if (!val) {
      setShowItemSug(false);
      return;
    }

    const q = val.toLowerCase();
    const matches = products
      .filter(p => p.item.toLowerCase().includes(q))
      .slice(0, 10);

    setItemSuggestions(matches);
    setShowItemSug(matches.length > 0);
  };

  // --------------------------------------------------
  // SELECT PRODUCT
  // --------------------------------------------------
  const selectProduct = async (p) => {
    setSelectedProduct(p);
    setItem(p.item);
    setShowItemSug(false);

    try {
      const res = await api.get(`/online/status-by-item/${p.item}`);
      if (res.data?.is_online) {
        setIsOnlineEnabled(true);
        setEnabledSizes(res.data.sizes || []);
        setSizeQty({});
      } else {
        setIsOnlineEnabled(false);
        setEnabledSizes([]);
        setSizeQty({});
      }
    } catch {
      setIsOnlineEnabled(false);
      setEnabledSizes([]);
      setSizeQty({});
    }
  };

  // --------------------------------------------------
  // SIZE TOTAL
  // --------------------------------------------------
  const totalSizeQty = Object.values(sizeQty)
    .map(Number)
    .reduce((a, b) => a + b, 0);

  // --------------------------------------------------
  // ADD ROW
  // --------------------------------------------------
  const onAddRow = () => {
    if (!selectedProduct || !qty) {
      alert("Select item and quantity");
      return;
    }

    const jaipurInvolved =
      fromLocation === "Jaipur" || toLocation === "Jaipur";

    if (isOnlineEnabled && jaipurInvolved) {
      if (!enabledSizes.length) {
        alert("Online-enabled item needs size details");
        return;
      }
      if (totalSizeQty !== Number(qty)) {
        alert("Size total must equal transfer quantity");
        return;
      }
    }

    setRows(r => [
      ...r,
      {
        Item: selectedProduct.item,
        SeriesName: selectedProduct.seriesname,
        CategoryName: selectedProduct.categoryname,
        Quantity: Number(qty),
        SizeQty: isOnlineEnabled && jaipurInvolved ? sizeQty : null
      }
    ]);

    setItem("");
    setQty("");
    setSelectedProduct(null);
    setIsOnlineEnabled(false);
    setEnabledSizes([]);
    setSizeQty({});
  };

  const removeRow = (i) =>
    setRows(rows.filter((_, x) => x !== i));

  // --------------------------------------------------
  // SUBMIT TRANSFER
  // --------------------------------------------------
  const onSubmit = async () => {
    if (!rows.length) {
      alert("No items added");
      return;
    }

    if (fromLocation === toLocation) {
      alert("From and To location cannot be same");
      return;
    }

    const payload = {
      UserName: user.username,
      FromLocation: fromLocation,
      ToLocation: toLocation,
      Rows: rows
    };

    try {
      const res = await api.post("/stock/transfer", payload);
      if (res.data?.success) {
        alert("Stock transferred");
        setRows([]);
      }
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || "Transfer failed");
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div style={{ padding: 18 }}>
      <h2>Stock Transfer</h2>

      {/* HEADER */}
      <div style={{ marginBottom: 12 }}>
        <select value={fromLocation} onChange={e => setFromLocation(e.target.value)}>
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>

        <span style={{ margin: "0 8px" }}>→</span>

        <select value={toLocation} onChange={e => setToLocation(e.target.value)}>
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* ROW ENTRY */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <input
            value={item}
            onChange={e => onItemChange(e.target.value)}
            placeholder="Item"
          />
          {showItemSug &&
            itemSuggestions.map((p, i) => (
              <div
                key={i}
                onClick={() => selectProduct(p)}
                style={{ cursor: "pointer", background: "#eee" }}
              >
                {p.item}
              </div>
            ))}
        </div>

        <input
          type="number"
          value={qty}
          onChange={e => setQty(e.target.value)}
          placeholder="Qty"
        />

        <button onClick={onAddRow}>Add</button>
      </div>

      {/* SIZE INPUT */}
      {isOnlineEnabled &&
        (fromLocation === "Jaipur" || toLocation === "Jaipur") && (
          <div style={{ marginTop: 12 }}>
            <b>Size-wise Quantity (Jaipur)</b>
            {enabledSizes.map(sz => (
              <div key={sz}>
                {sz}
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
            <div>
              <b>Total:</b> {totalSizeQty} / {qty || 0}
            </div>
          </div>
        )}

      {/* ROWS */}
      <table border="1" width="100%" style={{ marginTop: 12 }}>
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
