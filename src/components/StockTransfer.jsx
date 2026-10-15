import React, { useEffect, useState, useRef } from "react";
import { api } from "../services/api";
import BarcodeSuggest from "./BarcodeSuggest";

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
const [loading, setLoading] = useState(false);

  // size logic
  const [isOnlineEnabled, setIsOnlineEnabled] = useState(false);
  const [enabledSizes, setEnabledSizes] = useState([]);
  const [sizeQty, setSizeQty] = useState({});
const [sizeStock, setSizeStock] = useState({});
  const itemRef = useRef();
  const qtyRef = useRef();

  // barcode scanning
  const [scanCode, setScanCode] = useState("");
  const [scanMsg, setScanMsg] = useState(null);      // { ok, text }
  const [scanning, setScanning] = useState(false);
  const scanRef = useRef(null);
  const hasBarcodes = rows.some(r => (r.Barcodes || []).length > 0);

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
    r.CategoryName,

  isonline:
    r.IsOnline
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

  // ---------------- SCAN A BUNDLE ----------------
  // The whole bundle goes by default. Change a size on the line if only
  // some pieces are sent – those pieces leave the bundle, the rest stays.
  const codeKey = v => {
    const s = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const m = s.match(/^[A-Z]{0,3}(\d+)$/);
    return m ? m[1] : s.slice(-6);
  };

  const onScan = async picked => {
    const v = String(picked ?? scanCode).trim();
    setScanCode("");
    if (!v) return;

    if (rows.some(r => (r.Barcodes || []).some(b => codeKey(b) === codeKey(v)))) {
      setScanMsg({ ok: false, text: `${v.toUpperCase()} is already in this transfer` });
      return;
    }

    try {
      setScanning(true);
      const res = await api.get(`/barcode/scan/${encodeURIComponent(v)}`, { location: fromLocation });
      const b = res.data;
      const bundleSizes = (b.sizes || []).filter(s => Number(s.qty) > 0)
        .map(s => ({ size_code: s.size_code, qty: Number(s.qty) }));
      const pcs = bundleSizes.reduce((a, s) => a + s.qty, 0);

      setRows(prev => {
        const i = prev.findIndex(r => (r.Barcodes || []).length && Number(r.ProductID) === Number(b.productid));
        if (i >= 0) {
          // same design scanned again: add this bundle to that line
          const r = prev[i];
          const sizes = [...(r.SizeRows || [])];
          bundleSizes.forEach(s => {
            const x = sizes.find(z => z.size_code === s.size_code);
            if (x) x.qty = Number(x.qty) + s.qty; else sizes.push({ ...s });
          });
          const next = [...prev];
          next[i] = {
            ...r,
            Barcodes: [...r.Barcodes, b.barcode],
            SizeRows: sizes,
            Quantity: sizes.reduce((a, s) => a + Number(s.qty || 0), 0)
          };
          return next;
        }
        return [...prev, {
          ProductID: b.productid,
          Item: b.item,
          SeriesName: b.seriesname,
          CategoryName: b.categoryname,
          Quantity: pcs,
          SizeRows: bundleSizes,
          Barcodes: [b.barcode]
        }];
      });
      setScanMsg({ ok: true, text: `✓ ${b.barcode} · ${b.item} · ${pcs} pcs added` });
    } catch (e) {
      setScanMsg({ ok: false, text: e?.response?.data?.error || "Could not check this barcode" });
    } finally {
      setScanning(false);
      setTimeout(() => scanRef.current?.focus(), 0);
    }
  };

  // change a size on a scanned line (send fewer pieces than the bundle has)
  const setRowSize = (i, size_code, val) => {
    setRows(prev => {
      const next = [...prev];
      const r = next[i];
      const sizes = (r.SizeRows || []).map(s => s.size_code === size_code
        ? { ...s, qty: val === "" ? "" : Math.max(0, Number(val)) } : s);
      next[i] = { ...r, SizeRows: sizes, Quantity: sizes.reduce((a, s) => a + Number(s.qty || 0), 0) };
      return next;
    });
  };

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

    const bundles = rows.reduce((a, r) => a + (r.Barcodes || []).length, 0);
    const pcs = rows.reduce((a, r) => a + Number(r.Quantity || 0), 0);
    if (!window.confirm(
      `Transfer ${pcs} pcs from ${fromLocation} to ${toLocation}?` +
      (bundles
        ? `\n\n${bundles} scanned bundle${bundles > 1 ? "s" : ""}: full bundles move to ${toLocation} with the same label.` +
          `\nWhere you lowered a size, only those pieces leave the bundle (they arrive without a barcode).`
        : "")
    )) return;

    const cleanRows = rows
      .map(r => ({
        ...r,
        SizeRows: (r.SizeRows || [])
          .filter(s => Number(s.qty || 0) > 0)
          .map(s => ({ size_code: s.size_code, qty: Number(s.qty) }))
      }))
      .filter(r => Number(r.Quantity || 0) > 0);
    if (!cleanRows.length) {
      alert("No pieces to transfer");
      return;
    }

    const payload = {
      UserName: user.username,
      FromLocation: fromLocation,
      ToLocation: toLocation,
      Rows: cleanRows
    };

try {

  setLoading(true);

  const res =
    await api.post(
      "/stock/transfer",
      payload
    );

  if (res.data?.success) {
        alert("Stock transferred successfully");
        setRows([]);
        setScanMsg(null);
        itemRef.current?.focus();
      }
    } catch (e) {

  alert(
    e.response?.data?.error ||
    "Transfer failed"
  );

} finally {

  setLoading(false);
}
  };

  // ---------------- UI ----------------
  return (
    <div style={{ padding: 20, background: "#f5f5f5" }}>
      <h2>Stock Transfer</h2>

      {/* HEADER */}
      <div style={{ marginBottom: 12 }}>
        <select value={fromLocation} onChange={e => { setFromLocation(e.target.value); setScanMsg(null); }}
          disabled={hasBarcodes}
          title={hasBarcodes ? "Scanned bundles belong to this office – remove them to change it" : undefined}>
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>

        <span style={{ margin: "0 10px" }}>→</span>

        <select value={toLocation} onChange={e => setToLocation(e.target.value)}>
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* SCAN BARCODE */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        margin: "10px 0", padding: "10px 12px", background: "#f3f7ff",
        border: "1px solid #c9d8f5", borderRadius: 8
      }}>
        <b>📦 Scan barcode</b>
        <BarcodeSuggest
          inputRef={scanRef}
          value={scanCode}
          onChange={setScanCode}
          onSubmit={onScan}
          location={fromLocation}
          exclude={rows.flatMap(r => r.Barcodes || [])}
          placeholder={`Scan a ${fromLocation} bundle (or type 340…)`}
          disabled={loading || scanning}
          style={{ width: 280, fontSize: 16, padding: "6px 8px" }}
        />
        {scanMsg && (
          <span style={{ fontWeight: 600, color: scanMsg.ok ? "#2e7d32" : "#c62828" }}>
            {scanMsg.ok ? "" : "⚠ "}{scanMsg.text}
          </span>
        )}
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
                  <div>
  <strong>{p.item}</strong>

  {p.isonline && (
    <span
      style={{
        marginLeft: 8,
        color: "green",
        fontWeight: "bold",
        fontSize: 12
      }}
    >
      ONLINE
    </span>
  )}

  <div style={{ fontSize: 11 }}>
    {p.seriesname} | {p.categoryname}
  </div>
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
              <td>
                {r.Item}
                {(r.Barcodes || []).length > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: "#4a6fb5" }}>📦 {r.Barcodes.join(", ")}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {(r.SizeRows || []).map(s => (
                        <label key={s.size_code} style={{ fontSize: 12 }}>
                          {s.size_code}{" "}
                          <input type="number" min="0" value={s.qty} style={{ width: 44 }}
                            onChange={e => setRowSize(i, s.size_code, e.target.value)} />
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </td>
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

      <button
  onClick={onSubmit}
  disabled={loading}
  style={{ marginTop: 12 }}
>
        Submit Transfer
      </button>
{loading && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      color: "#fff",
      fontSize: 20,
      fontWeight: "bold"
    }}
  >
    Posting Transfer... Please wait
  </div>
)}
    </div>
  );
}