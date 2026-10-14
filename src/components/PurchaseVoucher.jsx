import React, { useEffect, useState, useRef } from "react";
import { api, postIncoming, createBarcode } from "../services/api";
import { printLabels, toLabel } from "../utils/barcodeLabels";

const LOCATIONS = ["Jaipur", "Kolkata", "Ahmedabad"];

export default function PurchaseVoucher({ initialBarcodePurchaseId = null, initialBarcodeLocation = null }) {

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
// true once a size is typed by hand (then auto-fill stops)
const [sizesTouched, setSizesTouched] = useState(false);

  const [rows, setRows] = useState([]);
  const [incomingId, setIncomingId] = useState(null);
  const [barcodeSourceRows, setBarcodeSourceRows] = useState([]);
  const [showBarcodePrompt, setShowBarcodePrompt] = useState(false);
  const [showBundleComposer, setShowBundleComposer] = useState(false);
  const [barcodeRowIndex, setBarcodeRowIndex] = useState(0);
  const [bundleSizeQty, setBundleSizeQty] = useState({});
  const [createdBundles, setCreatedBundles] = useState([]);
  const [bundlePcs, setBundlePcs] = useState("");
  const [makingAll, setMakingAll] = useState(false);

  // ---------------- BUNDLE AUTO-FILL ----------------
  // A new bundle starts as one "set": 1 piece of every size still left.
  // (Designs without recorded sizes start empty – sizes are typed.)
  const oneSet = row => {
    const q = {};
    if (row?.SizesTracked) (row.SizeRows || []).forEach(s => { if (Number(s.qty) > 0) q[s.size_code] = 1; });
    return q;
  };
  const allLeft = row => {
    const q = {};
    if (row?.SizesTracked) (row.SizeRows || []).forEach(s => { if (Number(s.qty) > 0) q[s.size_code] = Number(s.qty); });
    return q;
  };
  // "pieces in this bundle" → spread over the sizes still left
  const spread = (row, total) => {
    const sizes = (row?.SizeRows || []).map(s => ({ ...s, room: s.qty === null ? Infinity : Number(s.qty) }))
      .filter(s => s.room > 0);
    const q = {};
    let left = Math.min(Number(total) || 0, Number(row?.Quantity) || 0);
    while (left > 0) {
      let placed = false;
      for (const s of sizes) {
        if (left <= 0) break;
        if ((q[s.size_code] || 0) < s.room) { q[s.size_code] = (q[s.size_code] || 0) + 1; left--; placed = true; }
      }
      if (!placed) break;
    }
    return q;
  };
  // plan for "make all bundles": full sets (1 of every size) while every size
  // still has a piece, then whatever is left goes into one last bundle
  const planBundles = row => {
    const rem = {};
    (row?.SizeRows || []).forEach(s => { if (Number(s.qty) > 0) rem[s.size_code] = Number(s.qty); });
    const sizes = Object.keys(rem);
    if (!sizes.length) return [];
    const full = Math.min(...sizes.map(z => rem[z]));
    const plan = [];
    for (let i = 0; i < full; i++) plan.push(Object.fromEntries(sizes.map(z => [z, 1])));
    const last = Object.fromEntries(sizes.map(z => [z, rem[z] - full]).filter(([, n]) => n > 0));
    if (Object.keys(last).length) plan.push(last);
    return plan;
  };
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
      setSizesTouched(false);
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
// ---------------- AUTO-FILL SIZES ----------------
// Spreads the quantity over the design's sizes (N/A left out), like the
// Sales Voucher: 12 pcs over 6 sizes = 2 each, 14 = 3,3,2,2,2,2.
// Stops as soon as a size is typed by hand.
useEffect(() => {
  if (!isOnlineEnabled || sizesTouched) return;
  const total = Number(qty) || 0;
  const sizes = enabledSizes.filter(sz => !/^n\s*\/?\s*a$/i.test(String(sz).trim()));
  if (!total || !sizes.length) { setSizeQty({}); return; }
  const filled = {};
  sizes.forEach((sz, i) => {
    const n = Math.floor(total / sizes.length) + (i < total % sizes.length ? 1 : 0);
    if (n > 0) filled[sz] = n;
  });
  setSizeQty(filled);
}, [qty, isOnlineEnabled, enabledSizes, sizesTouched]);

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
  setSizesTouched(false);

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

  const loadBarcodeAvailability = async (purchaseId) => {
    const availabilityRes = await api.get(`/barcode/incoming/${purchaseId}`);

    const availableRows = (availabilityRes.data?.rows || [])
      .filter(r => Number(r.remaining_quantity || 0) > 0)
      .map(r => ({
        ProductID: r.productid,
        Item: r.item,
        SeriesName: r.seriesname,
        CategoryName: r.categoryname,
        Quantity: Number(r.remaining_quantity || 0),
        // sizes recorded at purchase → limit per size;
        // not recorded → any size, limited by the total only
        SizesTracked: r.sizes_tracked !== false,
        SizeRows: r.sizes_tracked !== false
          ? Object.entries(r.remaining_sizes || {})
              .filter(([, q]) => Number(q || 0) > 0)
              .map(([size_code, q]) => ({ size_code, qty: Number(q) }))
          : (r.size_choices || []).map(size_code => ({ size_code, qty: null }))
      }))
      .filter(r => r.Quantity > 0 && r.SizeRows.length > 0);

    setBarcodeSourceRows(availableRows);
    setBarcodeRowIndex(0);

    const initialQty = oneSet(availableRows[0]);
    setBundleSizeQty(initialQty);
                setBundlePcs("");

    return availableRows;
  };

  useEffect(() => {
    if (!initialBarcodePurchaseId) return;

    let cancelled = false;

    (async () => {
      try {
        const purchaseId = Number(initialBarcodePurchaseId);
        if (!Number.isInteger(purchaseId) || purchaseId <= 0) return;

        if (initialBarcodeLocation) {
          setLocation(initialBarcodeLocation);
        }

        setLoading(true);
        setIncomingId(purchaseId);

        const availableRows = await loadBarcodeAvailability(purchaseId);
        if (cancelled) return;

        if (!availableRows.length) {
          alert("No unbarcoded stock remains for this purchase.");
          return;
        }

        const firstRow = availableRows[0];
        const initialQty = oneSet(firstRow);

        setBarcodeRowIndex(0);
        setBundleSizeQty(initialQty);
                setBundlePcs("");
        setCreatedBundles([]);
        setShowBarcodePrompt(false);
        setShowBundleComposer(true);
      } catch (e) {
        console.error(e);
        if (!cancelled) alert("Failed to load barcode availability");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialBarcodePurchaseId, initialBarcodeLocation]);

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
        const newIncomingId = res.data.incomingId;
        setIncomingId(newIncomingId);

        const availableRows = await loadBarcodeAvailability(newIncomingId);

        if (availableRows.length > 0) {
          setShowBarcodePrompt(true);
        }

        alert(`Posted successfully. Purchase ID: ${newIncomingId}`);
        setRows([]);
      }
    } catch (err) {
      alert(
        err?.response?.data?.message ||
        "Submit failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------- UI ----------------


  // ---------------- PRINT BARCODE LABELS (2-UP) ----------------

  const makeAllBundles = async () => {
    const row = barcodeSourceRows[barcodeRowIndex];
    if (!row?.SizesTracked) {
      alert("Sizes were not recorded for this design – please enter each bundle by hand.");
      return;
    }
    const plan = planBundles(row);
    if (!plan.length) return;
    const describe = b => Object.entries(b).map(([z, n]) => (n > 1 ? `${z}×${n}` : z)).join(" ");
    const sum = b => Object.values(b).reduce((a, n) => a + n, 0);
    const full = plan.filter(b => sum(b) === sum(plan[0]) && describe(b) === describe(plan[0])).length;
    const extra = plan.length - full;
    if (!window.confirm(
      `Make ${plan.length} bundle${plan.length > 1 ? "s" : ""} for ${row.Item}?\n\n` +
      `${full} × (${describe(plan[0])}) = ${sum(plan[0])} pcs each` +
      (extra ? `\n1 × (${describe(plan[plan.length - 1])}) = ${sum(plan[plan.length - 1])} pcs (what is left)` : "")
    )) return;

    setMakingAll(true);
    const made = [];
    try {
      for (const b of plan) {
        const sizes = Object.entries(b).map(([size_code, qty]) => ({ size_code, qty }));
        const res = await createBarcode({ productid: row.ProductID, Location: location, incomingheaderid: incomingId, sizes });
        made.push({
          barcode: res.data.barcode.barcode, item: row.Item, seriesname: row.SeriesName,
          categoryname: row.CategoryName, location, incomingheaderid: incomingId, sizes
        });
      }
    } catch (err) {
      alert(err?.response?.data?.error || "Could not create all bundles");
    } finally {
      setCreatedBundles(prev => [...prev, ...made]);
      const availableRows = await loadBarcodeAvailability(incomingId);
      setBarcodeRowIndex(0);
      setBundleSizeQty(oneSet(availableRows[0]));
      setBundlePcs("");
      setMakingAll(false);
    }
  };

  const printCreatedBundles = () => {
    if (!createdBundles.length) {
      alert("No barcode labels to print.");
      return;
    }
    printLabels(createdBundles.map(b => toLabel(b, { location, purchase: incomingId })));
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
        <span style={{ marginLeft: 8, color: "#666", fontSize: 12 }}>
          {sizesTouched ? "(edited by hand)" : "(auto-filled from quantity – change any size if needed)"}
        </span>

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
                onChange={e => {
                  setSizesTouched(true);
                  setSizeQty({
                    ...sizeQty,
                    [sz]: Number(e.target.value)
                  });
                }}
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
                const initialQty = oneSet(firstRow);

                setBarcodeRowIndex(0);
                setBundleSizeQty(initialQty);
                setBundlePcs("");
                setCreatedBundles([]);
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
          style={{ maxWidth: 720, width: "92%" }}
        >
          <h3>Create Physical Bundles</h3>

          <div style={{ marginBottom: 6 }}>
            <strong>Purchase ID:</strong> {incomingId}
          </div>
          <div style={{ marginBottom: 16 }}>
            <strong>Location:</strong> {location}
          </div>

          <div
            style={{
              padding: 10,
              marginBottom: 16,
              background: "#f7f7f7",
              border: "1px solid #ddd",
              borderRadius: 6
            }}
          >
            Create <strong>one barcode per physical bundle</strong>.
            The same design can have multiple bundles/barcodes.
            Choose the quantities that actually go into each physical package.
          </div>

          {createdBundles.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Bundles created in this purchase</strong>
              </div>

              {createdBundles.map((b, i) => (
                <div
                  key={`${b.barcode}-${i}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 9px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    marginBottom: 6
                  }}
                >
                  <span>
                    <strong>{b.barcode}</strong> — {b.item}
                  </span>
                  <span>
                    {b.sizes.map(s => `${s.size_code}: ${s.qty}`).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {barcodeSourceRows.length === 0 ? (
            <div style={{ padding: 12 }}>
              All purchased quantities for this purchase have been assigned
              to active bundles.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 8 }}>
                <strong>Remaining unbundled stock</strong>
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: 18
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 7 }}>Design</th>
                    <th style={{ textAlign: "left", padding: 7 }}>Remaining by size</th>
                    <th style={{ textAlign: "right", padding: 7 }}>Pieces</th>
                    <th style={{ padding: 7 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {barcodeSourceRows.map((r, i) => (
                    <tr key={r.ProductID || i}>
                      <td style={{ padding: 7 }}>
                        {r.Item} — {r.SeriesName} — {r.CategoryName}
                      </td>
                      <td style={{ padding: 7 }}>
                        {r.SizesTracked
                          ? r.SizeRows.map(s => `${s.size_code}: ${s.qty}`).join("  |  ")
                          : "sizes not recorded – any size"}
                      </td>
                      <td style={{ padding: 7, textAlign: "right" }}>
                        {r.Quantity}
                      </td>
                      <td style={{ padding: 7, textAlign: "right" }}>
                        <button
                          onClick={() => {
                            const index = barcodeSourceRows.findIndex(
                              x => x.ProductID === r.ProductID
                            );
                            const initialQty = oneSet(r);
                            setBarcodeRowIndex(index >= 0 ? index : i);
                            setBundleSizeQty(initialQty);
                setBundlePcs("");
                          }}
                        >
                          Select Design
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {barcodeSourceRows[barcodeRowIndex] && (
                <div
                  style={{
                    borderTop: "1px solid #ddd",
                    paddingTop: 14
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <strong>New Physical Bundle</strong>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    {barcodeSourceRows[barcodeRowIndex].Item} — {barcodeSourceRows[barcodeRowIndex].SeriesName} — {barcodeSourceRows[barcodeRowIndex].CategoryName}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                    <button type="button" onClick={() => setBundleSizeQty(oneSet(barcodeSourceRows[barcodeRowIndex]))}>1 of each size</button>
                    <button type="button" onClick={() => setBundleSizeQty(allLeft(barcodeSourceRows[barcodeRowIndex]))}>All remaining</button>
                    <button type="button" onClick={() => setBundleSizeQty({})}>Clear</button>
                    <span style={{ marginLeft: 6 }}>
                      Pieces in bundle{" "}
                      <input type="number" min="0" value={bundlePcs} style={{ width: 60 }}
                        onChange={e => {
                          setBundlePcs(e.target.value);
                          setBundleSizeQty(spread(barcodeSourceRows[barcodeRowIndex], e.target.value));
                        }} />
                    </span>
                    {barcodeSourceRows[barcodeRowIndex].SizesTracked && (
                      <button type="button" disabled={makingAll || loading} onClick={makeAllBundles}
                        style={{ marginLeft: "auto", fontWeight: 700 }}>
                        {makingAll ? "Making bundles…" : "⚡ Make all bundles for this design"}
                      </button>
                    )}
                  </div>

                  {(barcodeSourceRows[barcodeRowIndex].SizeRows || []).map(s => (
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
                        {s.size_code}{s.qty !== null ? ` (remaining: ${s.qty})` : ""}
                      </span>

                      <input
                        type="number"
                        min="0"
                        max={s.qty ?? barcodeSourceRows[barcodeRowIndex].Quantity}
                        value={bundleSizeQty[s.size_code] || ""}
                        onChange={e =>
                          setBundleSizeQty({
                            ...bundleSizeQty,
                            [s.size_code]: Math.min(
                              Number(s.qty ?? barcodeSourceRows[barcodeRowIndex].Quantity),
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
                      Bundle pieces: {Object.values(bundleSizeQty)
                        .map(Number)
                        .reduce((a, b) => a + b, 0)}
                    </strong>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="confirm-actions" style={{ marginTop: 18 }}>
            {createdBundles.length > 0 && (
              <button
                onClick={printCreatedBundles}
                disabled={loading}
              >
                🖨 Print {createdBundles.length} label{createdBundles.length > 1 ? "s" : ""}
              </button>
            )}

            <button
              onClick={() => {
                setShowBundleComposer(false);
                setCreatedBundles([]);
              }}
            >
              Done
            </button>

            {barcodeSourceRows.length > 0 && barcodeSourceRows[barcodeRowIndex] && (
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
                    alert("Product information is missing for this design.");
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
                      sizes
                    });

                    if (res.data?.success) {
                      setCreatedBundles(prev => [
                        ...prev,
                        {
                          barcode: res.data.barcode.barcode,
                          item: selected.Item,
                          seriesname: selected.SeriesName,
                          categoryname: selected.CategoryName,
                          location,
                          incomingheaderid: incomingId,
                          sizes
                        }
                      ]);

                      const availableRows = await loadBarcodeAvailability(incomingId);

                      if (availableRows.length === 0) {
                        setBarcodeRowIndex(0);
                        setBundleSizeQty({});
                      } else {
                        const sameDesignIndex = availableRows.findIndex(
                          r => r.ProductID === selected.ProductID
                        );
                        const nextIndex =
                          sameDesignIndex >= 0 ? sameDesignIndex : 0;
                        const initialQty = oneSet(availableRows[nextIndex]);
                        setBarcodeRowIndex(nextIndex);
                        setBundleSizeQty(initialQty);
                setBundlePcs("");
                      }


                    } else {
                      alert("Barcode creation failed.");
                    }
                  } catch (err) {
                    alert(
                      err?.response?.data?.message ||
                      err?.response?.data?.error ||
                      "Barcode creation failed."
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Create Barcode for This Bundle
              </button>
            )}
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