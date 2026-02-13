import React, { useEffect, useState, useRef } from "react";
import { api, postSales } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata", "Ahmedabad"];

export default function SalesVoucher() {

  const user = JSON.parse(localStorage.getItem("kf_user"));

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [location, setLocation] = useState(LOCATIONS[0]);
  const [customer, setCustomer] = useState("");
  const [voucherNo, setVoucherNo] = useState("");

  const [item, setItem] = useState("");
  const [qty, setQty] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [rows, setRows] = useState([]);

  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showItemSug, setShowItemSug] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const [isOnlineEnabled, setIsOnlineEnabled] = useState(false);
  const [enabledSizes, setEnabledSizes] = useState([]);
  const [sizeQty, setSizeQty] = useState({});

  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const itemRef = useRef(null);
  const itemInputRef = useRef(null);

  // ---------------- LOAD DATA ----------------

  useEffect(() => {
    async function load() {
      const p = await api.get("/products");
      const cu = await api.get("/customers");

      setProducts(
        (p.data || []).map(r => ({
          item: r.Item,
          seriesname: r.SeriesName,
          categoryname: r.CategoryName
        }))
      );

      setCustomers(cu.data || []);
    }

    load().catch(() => alert("Failed to load data"));
  }, []);

  // ---------------- ITEM CHANGE ----------------

  const onItemChange = (val) => {
    setItem(val);
    setSelectedProduct(null);
    setHighlightIndex(-1);

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

  const selectProduct = async (p) => {
    setSelectedProduct(p);
    setItem(p.item);
    setShowItemSug(false);
    setHighlightIndex(-1);

    try {
      const res = await api.get(`/online/status-by-item/${p.item}`);
      if (res.data?.is_online && location === "Jaipur") {
        setIsOnlineEnabled(true);
        setEnabledSizes(res.data.sizes || []);
        setSizeQty({});
      }
    } catch {}
  };

  const totalSizeQty = Object.values(sizeQty)
    .map(Number)
    .reduce((a, b) => a + b, 0);

  const totalQty = rows.reduce(
    (sum, r) => sum + Number(r.Quantity || 0),
    0
  );

  // ---------------- ADD ROW ----------------

  const onAddRow = () => {
    if (!selectedProduct || !qty) {
      alert("Select item and quantity");
      return;
    }

    if (isOnlineEnabled && location === "Jaipur") {
      if (totalSizeQty !== Number(qty)) {
        alert("Size total must equal quantity");
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
        SizeQty: isOnlineEnabled ? sizeQty : null
      }
    ]);

    setItem("");
    setQty("");
    setSelectedProduct(null);
    setIsOnlineEnabled(false);
    setEnabledSizes([]);
    setSizeQty({});
    setHighlightIndex(-1);

    setTimeout(() => {
      itemInputRef.current?.focus();
    }, 0);
  };

  const removeRow = (i) =>
    setRows(rows.filter((_, x) => x !== i));

  // ---------------- SUBMIT ----------------

  const onSubmit = () => {
    if (!rows.length) {
      alert("No items added");
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    const payload = {
      UserName: user.username,
      Location: location,
      Customer: customer,
      VoucherNo: voucherNo || null,
      Rows: rows
    };

    try {
      setShowConfirm(false);
      setLoading(true);

      const res = await postSales(payload);

      if (res.data?.success) {
        alert("Sales saved");
        setRows([]);
        setCustomer("");
        setVoucherNo("");
      }
    } catch {
      alert("Sales failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- UI ----------------

  return (
    <div style={{ padding: 18 }}>
      <h2>Sales Voucher</h2>

      <div style={{ marginBottom: 12 }}>
        <select
          value={location}
          onChange={e => setLocation(e.target.value)}
          disabled={loading}
        >
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>

        <input
          list="customerList"
          placeholder="Customer"
          value={customer}
          onChange={e => setCustomer(e.target.value)}
          style={{ marginLeft: 8 }}
          disabled={loading}
        />

        <datalist id="customerList">
          {customers.map(c => (
            <option key={c.CustomerID} value={c.CustomerName} />
          ))}
        </datalist>

        <input
          placeholder="Voucher No"
          value={voucherNo}
          onChange={e => setVoucherNo(e.target.value)}
          style={{ marginLeft: 8 }}
          disabled={loading}
        />
      </div>

      {/* ITEM ENTRY */}
      <div style={{ display: "flex", gap: 8 }}>
        <div ref={itemRef} style={{ position: "relative" }}>
          <input
            ref={itemInputRef}
            value={item}
            onChange={e => onItemChange(e.target.value)}
            placeholder="Item"
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
          value={qty}
          onChange={e => setQty(e.target.value)}
          placeholder="Qty"
          disabled={loading}
          onKeyDown={e => {
            if (e.key === "Enter") onAddRow();
          }}
        />

        <button onClick={onAddRow} disabled={loading}>
          Add
        </button>
      </div>

      {/* TABLE */}
      <table style={{ marginTop: 12 }}>
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

      <button onClick={onSubmit} style={{ marginTop: 12 }} disabled={loading}>
        Submit Sales
      </button>

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Confirm Sales Posting</h3>

            <div><strong>Location:</strong> {location}</div>
            <div><strong>Customer:</strong> {customer || "-"}</div>
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

      {loading && (
        <div className="loading-overlay">
          Posting... Please wait
        </div>
      )}
    </div>
  );
}
