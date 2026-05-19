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
const [availableSizeStock, setAvailableSizeStock] =
  useState({});
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const itemRef = useRef(null);
  const itemInputRef = useRef(null);

  // ---------------- LOAD DATA ----------------

  useEffect(() => {
    async function load() {
      const p = await api.get("/products");
console.log(p.data[0]);
      const cu = await api.get("/customers");

      setProducts(
  (p.data || []).map(r => ({
  productid: r.ProductID,

  item: r.Item,

  seriesname:
    r.SeriesName,

  categoryname:
    r.CategoryName,

  isonline:
    r.IsOnline
}))
);

      setCustomers(cu.data || []);
    }

    load().catch(() => alert("Failed to load data"));
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
            if (res.data?.is_online) {

        setIsOnlineEnabled(true);

        setEnabledSizes(
          res.data.sizes || []
        );

        setSizeQty({});

        // ------------------------------
        // LOAD LIVE SIZE STOCK
        // ------------------------------

        const locationMap = {
          Jaipur: 1,
          Kolkata: 2,
          Ahmedabad: 3
        };

        const locationid =
          locationMap[location];

        if (locationid) {

          const stockRes =
            await api.get(
              `/online/location-size-stock/${p.productid}/${locationid}`
            );

          const stockMap = {};

          (stockRes.data || [])
            .forEach(r => {

            stockMap[r.size_code] =
              Number(r.qty || 0);

          });

          setAvailableSizeStock(
            stockMap
          );
        }
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
    if (isOnlineEnabled) {

      if (
        totalSizeQty !== Number(qty)
      ) {

        alert(
          "Size total must equal quantity"
        );

        return;
      }

      // --------------------------------
      // VALIDATE AVAILABLE STOCK
      // --------------------------------

      for (const [sz, q] of Object.entries(sizeQty)) {

        const enteredQty =
          Number(q || 0);

        const availableQty =
          Number(
            availableSizeStock[sz] || 0
          );

        if (enteredQty > availableQty) {

          alert(
            `${sz} exceeds available stock`
          );

          return;
        }
      }
    }

        setRows(r => [
      ...r,
      {
        Item: selectedProduct.item,

        SeriesName:
          selectedProduct.seriesname,

        CategoryName:
          selectedProduct.categoryname,

        Quantity:
          Number(qty),

        // --------------------------------
        // BACKEND EXPECTS SizeRows
        // --------------------------------

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
    <div className="voucher-wrapper">

      <div className="voucher-top">
        <h2>Sales Voucher</h2>

        <div className="location-group">
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
            disabled={loading}
          />
        </div>
      </div>

      {/* ENTRY ROW */}
      <div className="voucher-entry">

        <div ref={itemRef} className="entry-item">
          <input
            ref={itemInputRef}
            value={item}
            onChange={e => onItemChange(e.target.value)}
            placeholder="Search Item..."
            disabled={loading}
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
            <div className="suggestion-box">
              {itemSuggestions.map((p, i) => (
                <div
                  key={i}
                  onClick={() => selectProduct(p)}
                  className={`suggestion-item ${
                    i === highlightIndex ? "active-suggestion" : ""
                  }`}
                >
                  <>
  {p.item}

  {p.isonline && (
    <span
      style={{
        marginLeft: 8,
        color: "green",
        fontWeight: "bold"
      }}
    >
      ONLINE
    </span>
  )}
</>
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
{/* SIZE INPUT */}

{isOnlineEnabled && (
  <div
    style={{
      marginTop: 12,
      padding: 10,
      border: "1px solid #ddd",
      borderRadius: 6,
      background: "#fafafa"
    }}
  >

    <b>Size Qty</b>

    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginTop: 8
      }}
    >

      {enabledSizes.map(sz => (
        <div key={sz}>

<div>
  {sz}

  <span
    style={{
      marginLeft: 6,
      color: "#666",
      fontSize: 12
    }}
  >
    (
    Available:
    {" "}
    {
      availableSizeStock[sz] || 0
    }
    )
  </span>
</div>

          <input
            type="number"
            value={sizeQty[sz] || ""}
            onChange={e =>
              setSizeQty({
                ...sizeQty,
                [sz]: Number(e.target.value)
              })
            }
            style={{
              width: 70
            }}
          />
        </div>
      ))}

    </div>

    <div style={{ marginTop: 10 }}>
      <strong>
        Total: {totalSizeQty} / {qty || 0}
      </strong>
    </div>

  </div>
)}
      {/* TABLE */}
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
          Submit Sales
        </button>
      </div>

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Confirm Sales Posting</h3>
            <div><strong>Location:</strong> {location}</div>
            <div><strong>Customer:</strong> {customer || "-"}</div>
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