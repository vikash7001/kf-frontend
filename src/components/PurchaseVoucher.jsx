import React, { useEffect, useState, useRef } from "react";
import { api, postIncoming, createBarcode } from "../services/api";
import { printLabels, toLabel, syncLabelSettings } from "../utils/barcodeLabels";
import BusyOverlay from "./BusyOverlay";

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
  const [picked, setPicked] = useState({});           // designs ticked for "make barcodes"
  const [manualOpen, setManualOpen] = useState(false); // "one bundle by hand" box
  const [progress, setProgress] = useState(null);      // {done, total} while creating

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

  useEffect(() => { syncLabelSettings(); }, []);   // latest label settings of each office

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
    setPicked(Object.fromEntries(availableRows.filter(r => r.SizesTracked).map(r => [r.ProductID, true])));

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

  const describe = b => Object.entries(b).map(([z, n]) => (n > 1 ? `${z}×${n}` : z)).join(" ");
  const pcsOf = b => Object.values(b).reduce((a, n) => a + Number(n), 0);

  // make every bundle of every ticked design, one after another
  const makeBundlesFor = async designRows => {
    const jobs = [];
    const lines = [];
    designRows.forEach(row => {
      const plan = planBundles(row);
      if (!plan.length) return;
      plan.forEach(b => jobs.push({ row, b }));
      const full = plan.filter(b => describe(b) === describe(plan[0])).length;
      const rest = plan.length - full;
      lines.push(`${row.Item}: ${full} × (${describe(plan[0])})` +
        (rest ? ` + 1 × (${describe(plan[plan.length - 1])})` : ""));
    });
    if (!jobs.length) return;
    const shown = lines.slice(0, 12).join("\n") + (lines.length > 12 ? `\n…and ${lines.length - 12} more designs` : "");
    if (!window.confirm(`Make ${jobs.length} barcode${jobs.length > 1 ? "s" : ""} for ${lines.length} design${lines.length > 1 ? "s" : ""}?\n\n${shown}`)) return;

    setManualOpen(false);
    setProgress({ done: 0, total: jobs.length });
    const made = [];
    try {
      for (const { row, b } of jobs) {
        const sizes = Object.entries(b).map(([size_code, qty]) => ({ size_code, qty }));
        const res = await createBarcode({ productid: row.ProductID, Location: location, incomingheaderid: incomingId, sizes });
        made.push({
          barcode: res.data.barcode.barcode, item: row.Item, seriesname: row.SeriesName,
          categoryname: row.CategoryName, location, incomingheaderid: incomingId, sizes
        });
        setProgress({ done: made.length, total: jobs.length });
      }
    } catch (err) {
      alert(`${made.length} of ${jobs.length} barcodes were made, then it stopped:\n` +
        (err?.response?.data?.error || "Could not create the barcode"));
    } finally {
      setCreatedBundles(prev => [...prev, ...made]);
      try {
        const availableRows = await loadBarcodeAvailability(incomingId);
        setBundleSizeQty(oneSet(availableRows[0]));
      } catch { /* list refreshes next time */ }
      setBundlePcs("");
      setProgress(null);
    }
  };

  // one bundle typed by hand
  const createOneBundle = async () => {
    const selected = barcodeSourceRows[barcodeRowIndex];
    const sizes = Object.entries(bundleSizeQty)
      .filter(([, q]) => Number(q || 0) > 0)
      .map(([size_code, q]) => ({ size_code, qty: Number(q) }));
    if (!selected?.ProductID) return alert("Product information is missing for this design.");
    if (!sizes.length) return alert("Enter at least one size quantity for the bundle.");
    setProgress({ done: 0, total: 1 });
    try {
      const res = await createBarcode({ productid: selected.ProductID, Location: location, incomingheaderid: incomingId, sizes });
      if (!res.data?.success) throw new Error("failed");
      setCreatedBundles(prev => [...prev, {
        barcode: res.data.barcode.barcode, item: selected.Item, seriesname: selected.SeriesName,
        categoryname: selected.CategoryName, location, incomingheaderid: incomingId, sizes
      }]);
      const availableRows = await loadBarcodeAvailability(incomingId);
      const same = availableRows.findIndex(r => r.ProductID === selected.ProductID);
      if (same >= 0) {
        setBarcodeRowIndex(same);
        setBundleSizeQty(oneSet(availableRows[same]));
      } else {
        setManualOpen(false);
      }
      setBundlePcs("");
    } catch (err) {
      alert(err?.response?.data?.message || err?.response?.data?.error || "Barcode creation failed.");
    } finally {
      setProgress(null);
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
                setManualOpen(false);
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

    {showBundleComposer && (() => {
      const sel = barcodeSourceRows[barcodeRowIndex];
      const autoRows = barcodeSourceRows.filter(r => r.SizesTracked);
      const pickedRows = autoRows.filter(r => picked[r.ProductID]);
      const pickedBundles = pickedRows.reduce((a, r) => a + planBundles(r).length, 0);
      const allTicked = autoRows.length > 0 && pickedRows.length === autoRows.length;
      const cell = { padding: "5px 7px", borderBottom: "1px solid #eee", verticalAlign: "middle" };
      return (
      <div className="confirm-overlay" style={{ zIndex: 1000 }}>
        <div
          className="confirm-box"
          style={{ maxWidth: 860, width: "94%", maxHeight: "92vh", display: "flex", flexDirection: "column", padding: 0 }}
        >
          {/* header */}
          <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #ddd" }}>
            <h3 style={{ margin: 0 }}>Create Barcodes</h3>
            <div style={{ color: "#555", marginTop: 4 }}>
              Purchase <b>#{incomingId}</b> · <b>{location}</b> · one barcode = one physical bundle
            </div>
          </div>

          {/* body – scrolls inside the box */}
          <div style={{ padding: "10px 18px", overflowY: "auto", flex: 1 }}>
            {createdBundles.length > 0 && (
              <div style={{ border: "1px solid #b7dfb9", background: "#f2fbf2", borderRadius: 6, padding: "8px 10px", marginBottom: 12 }}>
                <b>✓ {createdBundles.length} barcode{createdBundles.length > 1 ? "s" : ""} made</b>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6, maxHeight: 92, overflowY: "auto" }}>
                  {createdBundles.map((b, i) => (
                    <span key={`${b.barcode}-${i}`} title={b.sizes.map(s => `${s.size_code}: ${s.qty}`).join(", ")}
                      style={{ background: "#fff", border: "1px solid #ccc", borderRadius: 12, padding: "1px 8px", fontSize: 13 }}>
                      <b>{b.barcode}</b> {b.item} · {b.sizes.reduce((a, s) => a + Number(s.qty), 0)} pcs
                    </span>
                  ))}
                </div>
              </div>
            )}

            {barcodeSourceRows.length === 0 ? (
              <div style={{ padding: 12, fontWeight: 600, color: "#2e7d32" }}>
                Everything in this purchase has a barcode. Print the labels and you're done.
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 6, color: "#333" }}>
                  Tick the designs → <b>Make barcodes</b>. Each design is packed as full sets
                  (1 of every size), and what is left goes into one last bundle.
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#f3f6fb", position: "sticky", top: -10 }}>
                      <th style={{ ...cell, width: 30 }}>
                        <input type="checkbox" checked={allTicked} disabled={!autoRows.length}
                          onChange={e => setPicked(e.target.checked ? Object.fromEntries(autoRows.map(r => [r.ProductID, true])) : {})} />
                      </th>
                      <th style={{ ...cell, textAlign: "left" }}>Design</th>
                      <th style={{ ...cell, textAlign: "left" }}>Sizes left</th>
                      <th style={{ ...cell, textAlign: "right" }}>Pcs</th>
                      <th style={{ ...cell, textAlign: "left" }}>Will make</th>
                      <th style={cell}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {barcodeSourceRows.map((r, i) => {
                      const plan = r.SizesTracked ? planBundles(r) : [];
                      return (
                        <tr key={r.ProductID || i} style={manualOpen && i === barcodeRowIndex ? { background: "#eef3ff" } : null}>
                          <td style={{ ...cell, textAlign: "center" }}>
                            <input type="checkbox" disabled={!r.SizesTracked} checked={!!picked[r.ProductID]}
                              onChange={e => setPicked(p => ({ ...p, [r.ProductID]: e.target.checked }))} />
                          </td>
                          <td style={cell}><b>{r.Item}</b> <span style={{ color: "#666" }}>{r.SeriesName}</span></td>
                          <td style={{ ...cell, color: "#444" }}>
                            {r.SizesTracked ? r.SizeRows.map(s => `${s.size_code}×${s.qty}`).join(" ") : <i>sizes not recorded</i>}
                          </td>
                          <td style={{ ...cell, textAlign: "right" }}>{r.Quantity}</td>
                          <td style={{ ...cell, color: "#444" }}>
                            {r.SizesTracked ? `${plan.length} bundle${plan.length > 1 ? "s" : ""}` : "by hand"}
                          </td>
                          <td style={{ ...cell, textAlign: "right" }}>
                            <button type="button" style={{ fontSize: 12 }} onClick={() => {
                              setBarcodeRowIndex(i);
                              setBundleSizeQty(oneSet(r));
                              setBundlePcs("");
                              setManualOpen(true);
                            }}>One bundle by hand</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {manualOpen && sel && (
                  <div style={{ border: "1px solid #9bb3e0", borderRadius: 6, padding: "10px 12px", marginTop: 12, background: "#fafcff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <b>One bundle of {sel.Item}</b>
                      <button type="button" onClick={() => setBundleSizeQty(oneSet(sel))}>1 of each</button>
                      {sel.SizesTracked && <button type="button" onClick={() => setBundleSizeQty(allLeft(sel))}>All left</button>}
                      <button type="button" onClick={() => setBundleSizeQty({})}>Clear</button>
                      <span>Pieces{" "}
                        <input type="number" min="0" value={bundlePcs} style={{ width: 55 }}
                          onChange={e => { setBundlePcs(e.target.value); setBundleSizeQty(spread(sel, e.target.value)); }} />
                      </span>
                      <button type="button" style={{ marginLeft: "auto" }} onClick={() => setManualOpen(false)}>✕</button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(sel.SizeRows || []).map(s => (
                        <div key={s.size_code} style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: 700 }}>{s.size_code}</div>
                          {s.qty !== null && <div style={{ fontSize: 11, color: "#777" }}>left {s.qty}</div>}
                          <input type="number" min="0" style={{ width: 54 }}
                            max={s.qty ?? sel.Quantity}
                            value={bundleSizeQty[s.size_code] || ""}
                            onChange={e => setBundleSizeQty({
                              ...bundleSizeQty,
                              [s.size_code]: Math.min(Number(s.qty ?? sel.Quantity), Math.max(0, Number(e.target.value || 0)))
                            })} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                      <b>Bundle: {Object.values(bundleSizeQty).map(Number).reduce((a, b) => a + b, 0)} pcs</b>
                      <button type="button" onClick={createOneBundle} style={{ fontWeight: 700 }}>Create this barcode</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* footer – always visible */}
          <div className="confirm-actions" style={{ margin: 0, padding: "10px 18px", borderTop: "1px solid #ddd", alignItems: "center" }}>
            {barcodeSourceRows.length > 0 && (
              <button type="button" disabled={!pickedRows.length || !!progress} onClick={() => makeBundlesFor(pickedRows)}
                style={{ fontWeight: 800, marginRight: "auto", padding: "7px 14px" }}>
                ⚡ Make barcodes{pickedRows.length ? ` – ${pickedBundles} for ${pickedRows.length} design${pickedRows.length > 1 ? "s" : ""}` : ""}
              </button>
            )}
            {createdBundles.length > 0 && (
              <button onClick={printCreatedBundles} disabled={!!progress}>
                🖨 Print {createdBundles.length} label{createdBundles.length > 1 ? "s" : ""}
              </button>
            )}
            <button onClick={() => { setShowBundleComposer(false); setCreatedBundles([]); setManualOpen(false); }}>
              Done
            </button>
          </div>
        </div>
      </div>
      );
    })()}

    {progress && <BusyOverlay done={progress.done} total={progress.total} />}

    {loading && (
      <div className="loading-overlay">
        Posting... Please wait
      </div>
    )}

  </div>
);
}