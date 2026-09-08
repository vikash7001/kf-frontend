import React, { useEffect, useState, useRef } from "react";
import { api, postIncoming, createBarcode } from "../services/api";

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
const [selectedProduct, setSelectedProduct] = useState(null);
const [isOnlineEnabled, setIsOnlineEnabled] = useState(false);
const [enabledSizes, setEnabledSizes] = useState([]);
const [sizeQty, setSizeQty] = useState({});

  const [rows, setRows] = useState([]);
  const [incomingId, setIncomingId] = useState(null);
  const [barcodeSourceRows, setBarcodeSourceRows] = useState([]);
  const [showBarcodePrompt, setShowBarcodePrompt] = useState(false);
  const [showBundleComposer, setShowBundleComposer] = useState(false);
  const [barcodeRowIndex, setBarcodeRowIndex] = useState(0);
  const [bundleSizeQty, setBundleSizeQty] = useState({});
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
  productid: r.ProductID,
  item: r.Item,
  seriesname: r.SeriesName,
  categoryname: r.CategoryName,
  isonline: r.IsOnline
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

const selectProduct = async (p) => {

  setSelectedProduct(p);

  setItem(p.item);
  setSeries(p.seriesname);
  setCategory(p.categoryname);

  setShowItemSug(false);
  setHighlightIndex(-1);

  try {

    const res = await api.get(
      `/online/status-by-item/${p.item}`
    );

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

  setRows(prev => [
    ...prev,
    {
      ProductID: selectedProduct.productid,

      Item: item,

      SeriesName: series,

      CategoryName: category,

      Quantity: Number(qty),

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
  setSeries("");
  setCategory("");
  setQty("");

  setSelectedProduct(null);

  setIsOnlineEnabled(false);
  setEnabledSizes([]);
  setSizeQty({});

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
        setIncomingId(res.data.incomingId);
        setBarcodeSourceRows(payload.Rows);
        setShowBarcodePrompt(true);
        alert(`Posted successfully. Purchase ID: ${res.data.incomingId}`);
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
          onKeyDown={e => {

            if (!showItemSug) return;

            if (e.key === "ArrowDown") {
              e.preventDefault();

              setHighlightIndex(prev =>
                prev < itemSuggestions.length - 1
                  ? prev + 1
                  : prev
              );
            }

            if (e.key === "ArrowUp") {
              e.preventDefault();

              setHighlightIndex(prev =>
                prev > 0
                  ? prev - 1
                  : 0
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
                  i === highlightIndex
                    ? "active-suggestion"
                    : ""
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

      <button
        onClick={onAddRow}
        disabled={loading}
      >
        Add
      </button>

      <input
        value={series}
        placeholder="Series"
        readOnly
      />

      <input
        value={category}
        placeholder="Category"
        readOnly
      />
    </div>

    {/* ONLINE SIZE INPUT */}

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

              <div>{sz}</div>

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

              <td className="qty-col">
                {r.Quantity}
              </td>

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

      <div>
        Total Pieces:
        <strong> {totalQty}</strong>
      </div>

      <button
        className="submit-btn"
        onClick={onSubmit}
      >
        Submit Incoming
      </button>
    </div>

    {showConfirm && (
      <div className="confirm-overlay">

        <div className="confirm-box">

          <h3>Confirm Posting</h3>

          <div>
            <strong>Location:</strong> {location}
          </div>

          <div>
            <strong>Total Pieces:</strong> {totalQty}
          </div>

          <div className="confirm-actions">

            <button
              onClick={() => setShowConfirm(false)}
            >
              Back
            </button>

            <button
              onClick={confirmSubmit}
            >
              Confirm
            </button>

          </div>
        </div>
      </div>
    )}

    {showBarcodePrompt && (
      <div className="confirm-overlay">
        <div className="confirm-box">
          <h3>Purchase Posted</h3>

          <div>
            <strong>Purchase ID:</strong> {incomingId}
          </div>

          <div style={{ marginTop: 12 }}>
            Do you want to create barcodes for this purchase?
          </div>

          <div className="confirm-actions">
            <button
              onClick={() => setShowBarcodePrompt(false)}
            >
              No
            </button>

            <button
              onClick={() => {
                const firstRow = barcodeSourceRows[0];
                const initialQty = {};

                (firstRow?.SizeRows || []).forEach(s => {
                  initialQty[s.size_code] = 0;
                });

                setBarcodeRowIndex(0);
                setBundleSizeQty(initialQty);
                setShowBarcodePrompt(false);
                setShowBundleComposer(true);
              }}
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    )}

    {showBundleComposer && (
      <div className="confirm-overlay">
        <div
          className="confirm-box"
          style={{ maxWidth: 520 }}
        >
          <h3>Create Bundle</h3>

          <div style={{ marginBottom: 12 }}>
            <strong>Purchase ID:</strong> {incomingId}
          </div>

          <label>
            Design
          </label>

          <select
            value={barcodeRowIndex}
            onChange={e => {
              const index = Number(e.target.value);
              const selected = barcodeSourceRows[index];
              const initialQty = {};

              (selected?.SizeRows || []).forEach(s => {
                initialQty[s.size_code] = 0;
              });

              setBarcodeRowIndex(index);
              setBundleSizeQty(initialQty);
            }}
            style={{
              width: "100%",
              marginTop: 6,
              marginBottom: 16
            }}
          >
            {barcodeSourceRows.map((r, i) => (
              <option key={i} value={i}>
                {r.Item} — {r.SeriesName} — {r.CategoryName}
              </option>
            ))}
          </select>

          {(barcodeSourceRows[barcodeRowIndex]?.SizeRows || []).length === 0 ? (
            <div>
              No size breakdown is available for this purchase row.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 8 }}>
                <strong>Bundle quantities by size</strong>
              </div>

              {(barcodeSourceRows[barcodeRowIndex]?.SizeRows || []).map(s => (
                <div
                  key={s.size_code}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8
                  }}
                >
                  <span>
                    {s.size_code} (available: {s.qty})
                  </span>

                  <input
                    type="number"
                    min="0"
                    max={s.qty}
                    value={bundleSizeQty[s.size_code] || ""}
                    onChange={e =>
                      setBundleSizeQty({
                        ...bundleSizeQty,
                        [s.size_code]: Math.min(
                          Number(s.qty),
                          Math.max(0, Number(e.target.value || 0))
                        )
                      })
                    }
                    style={{ width: 80 }}
                  />
                </div>
              ))}

              <div style={{ marginTop: 12 }}>
                <strong>
                  Bundle pieces:{" "}
                  {Object.values(bundleSizeQty)
                    .map(Number)
                    .reduce((a, b) => a + b, 0)}
                </strong>
              </div>
            </>
          )}

          <div className="confirm-actions" style={{ marginTop: 18 }}>
            <button
              onClick={() => setShowBundleComposer(false)}
            >
              Cancel
            </button>

            <button
              onClick={async () => {
                const selected = barcodeSourceRows[barcodeRowIndex];
                const sizes = Object.entries(bundleSizeQty)
                  .filter(([, q]) => Number(q || 0) > 0)
                  .map(([size_code, q]) => ({
                    size_code,
                    qty: Number(q)
                  }));

                if (!selected?.ProductID) {
                  alert("Product information is missing for this row.");
                  return;
                }

                if (!sizes.length) {
                  alert("Enter at least one size quantity for the bundle.");
                  return;
                }

                try {
                  setLoading(true);

                  const res = await createBarcode({
                    productid: selected.ProductID,
                    Location: location,
                    incomingheaderid: incomingId,
                    sizes: sizes
                  });

                  if (res.data?.success) {
                    alert(`Barcode created: ${res.data.barcode.barcode}`);
                    setShowBundleComposer(false);
                  } else {
                    alert("Barcode creation failed.");
                  }
                } catch (err) {
                  alert(
                    err?.response?.data?.message ||
                    "Barcode creation failed."
                  );
                } finally {
                  setLoading(false);
                }
              }}
            >
              Create Barcode
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