import React, { useEffect, useState, useRef } from "react";
import { api, postIncoming, createBarcode } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata", "Ahmedabad"];

  const code128BPattern = value => {
    // Canonical Code 128-B symbol patterns (107 symbols).
    const patterns = [
      "11011001100",
      "11001101100",
      "11001100110",
      "10010011000",
      "10010001100",
      "10001001100",
      "10011001000",
      "10011000100",
      "10001100100",
      "11001001000",
      "11001000100",
      "11000100100",
      "10110011100",
      "10011011100",
      "10011001110",
      "10111001100",
      "10011101100",
      "10011100110",
      "11001110010",
      "11001011100",
      "11001001110",
      "11011100100",
      "11001110100",
      "11101101110",
      "11101001100",
      "11100101100",
      "11100100110",
      "11101100100",
      "11100110100",
      "11100110010",
      "11011011000",
      "11011000110",
      "11000110110",
      "10100011000",
      "10001011000",
      "10001000110",
      "10110001000",
      "10001101000",
      "10001100010",
      "11010001000",
      "11000101000",
      "11000100010",
      "10110111000",
      "10110001110",
      "10001101110",
      "10111011000",
      "10111000110",
      "10001110110",
      "11101110110",
      "11010001110",
      "11000101110",
      "11011101000",
      "11011100010",
      "11011101110",
      "11101011000",
      "11101000110",
      "11100010110",
      "11101101000",
      "11101100010",
      "11100011010",
      "11101111010",
      "11001000010",
      "11110001010",
      "10100110000",
      "10100001100",
      "10010110000",
      "10010000110",
      "10000101100",
      "10000100110",
      "10110010000",
      "10110000100",
      "10011010000",
      "10011000010",
      "10000110100",
      "10000110010",
      "11000010010",
      "11001010000",
      "11110111010",
      "11000010100",
      "10001111010",
      "10100111100",
      "10010111100",
      "10010011110",
      "10111100100",
      "10011110100",
      "10011110010",
      "11110100100",
      "11110010100",
      "11110010010",
      "11011011110",
      "11011110110",
      "11110110110",
      "10101111000",
      "10100011110",
      "10001011110",
      "10111101000",
      "10111100010",
      "11110101000",
      "11110100010",
      "10111011110",
      "10111101110",
      "11101011110",
      "11110101110",
      "11010000100",
      "11010010000",
      "11010011100",
      "1100011101011"
    ];

    const start = 104;
    const stop = 106;
    const values = [start];

    for (const ch of String(value)) {
      const code = ch.charCodeAt(0);
      if (code < 32 || code > 127) return null;
      values.push(code - 32);
    }

    let checksum = start;
    for (let i = 1; i < values.length; i++) {
      checksum += values[i] * i;
    }
    checksum %= 103;
    values.push(checksum);
    values.push(stop);

    return values.map(v => patterns[v]).join("");
  };

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
  const [createdBundles, setCreatedBundles] = useState([]);
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
        SizeRows: Object.entries(r.remaining_sizes || {})
          .filter(([, q]) => Number(q || 0) > 0)
          .map(([size_code, q]) => ({
            size_code,
            qty: Number(q)
          }))
      }))
      .filter(r => r.SizeRows.length > 0);

    setBarcodeSourceRows(availableRows);
    setBarcodeRowIndex(0);

    const initialQty = {};
    (availableRows[0]?.SizeRows || []).forEach(s => {
      initialQty[s.size_code] = 0;
    });
    setBundleSizeQty(initialQty);

    return availableRows;
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

  const escapePrintHtml = value =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const printCreatedBundles = () => {
    if (!createdBundles.length) {
      alert("No barcode labels to print.");
      return;
    }

    const saved = (() => {
      try {
        const raw = localStorage.getItem("kf_barcode_design");
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    })();

    const cfg = {
      labelWidth: Number(saved.labelWidth) || 38,
      labelHeight: Number(saved.labelHeight) || 38,
      logo: saved.logo || "",
      logoWidth: Number(saved.logoWidth) || 55,
      showBrand: saved.showBrand !== false,
      showLocation: saved.showLocation !== false,
      showItem: saved.showItem !== false,
      showSeries: saved.showSeries !== false,
      showCategory: saved.showCategory !== false,
      showPurchase: saved.showPurchase !== false,
      showSizes: saved.showSizes !== false,
      showBarcode: saved.showBarcode !== false,
      brandSize: Number(saved.brandSize) || 16,
      bodySize: Math.max(Number(saved.bodySize) || 8, 9)
    };

    const escapeHtml = value =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const makeBarcodeSvg = barcode => {
      const bits = code128BPattern(barcode);
      if (!bits) return "";

      const quietModules = 9;
      const moduleDots = 2;
      const fullBits =
        `${"0".repeat(quietModules)}${bits}${"0".repeat(quietModules)}`;
      const barcodeDots = fullBits.length * moduleDots;

      return `
        <svg class="barcode-svg"
             width="${barcodeDots}"
             height="80"
             viewBox="0 0 ${barcodeDots} 80"
             preserveAspectRatio="none"
             role="img"
             aria-label="Barcode"
             shape-rendering="crispEdges">
          <rect width="${barcodeDots}" height="80" fill="#fff"/>
          ${fullBits.split("").map((bit, i) =>
            bit === "1"
              ? `<rect x="${i * moduleDots}" y="0" width="${moduleDots}" height="80" fill="#000"/>`
              : ""
          ).join("")}
        </svg>
      `;
    };

    const makeLabel = bundle => {
      const sizes = (bundle.sizes || []).filter(s => Number(s.qty || 0) > 0);

      const brandHtml = cfg.showBrand
        ? `<div class="brand">${
            cfg.logo
              ? `<img src="${cfg.logo}" alt="Logo" style="max-width:${cfg.logoWidth}%;max-height:3.5mm;object-fit:contain;">`
              : "KARNI FASHIONS"
          }</div>`
        : "";

      const locationHtml = cfg.showLocation
        ? `<div class="location">${escapeHtml(location)}</div>`
        : "";

      const details = [];
      if (cfg.showItem) details.push(`<div><b>ITEM:</b> ${escapeHtml(bundle.item)}</div>`);
      if (cfg.showSeries) details.push(`<div><b>SER:</b> ${escapeHtml(bundle.seriesname || bundle.series || "")}</div>`);
      if (cfg.showCategory) details.push(`<div class="nowrap"><b>CAT:</b> ${escapeHtml(bundle.categoryname || bundle.category || "")}</div>`);
      if (cfg.showPurchase) details.push(`<div><b>PUR:</b> ${escapeHtml(incomingId)}</div>`);

      const sizeHtml = cfg.showSizes && sizes.length
        ? `<div class="sizes" style="--size-count:${sizes.length}">
             <div class="size-row">
               ${sizes.map(s => `<div>${escapeHtml(s.size_code)}</div>`).join("")}
             </div>
             <div class="size-row qty">
               ${sizes.map(s => `<div>${Number(s.qty)}</div>`).join("")}
             </div>
           </div>`
        : "";

      const barcodeHtml = cfg.showBarcode
        ? `<div class="barcode">
             ${makeBarcodeSvg(bundle.barcode)}
             <div class="barcode-text">${escapeHtml(bundle.barcode)}</div>
           </div>`
        : "";

      return `
        <div class="label">
          ${brandHtml}
          ${locationHtml}
          <div class="details">${details.join("")}</div>
          ${sizeHtml}
          ${barcodeHtml}
        </div>
      `;
    };

    const printRows = [];
    for (let i = 0; i < createdBundles.length; i += 2) {
      printRows.push(`
        <div class="print-row">
          ${makeLabel(createdBundles[i])}
          ${createdBundles[i + 1]
            ? makeLabel(createdBundles[i + 1])
            : `<div class="label blank-label"></div>`}
        </div>
      `);
    }

    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      alert("Please allow pop-ups to print barcode labels.");
      return;
    }

    popup.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Karni Fashions - Barcode Labels</title>
<style>
  @page {
    size: ${cfg.labelWidth * 2}mm ${cfg.labelHeight}mm;
    margin: 0;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: white;
    overflow: hidden;
  }

  body {
    font-family: Arial, sans-serif;
    color: #000;
  }

  .print-row {
    width: ${cfg.labelWidth * 2}mm;
    height: ${cfg.labelHeight}mm;
    display: flex;
    flex-direction: row;
    gap: 0;
    padding: 0;
    margin: 0;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }

  .print-row:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .label {
    width: ${cfg.labelWidth}mm;
    height: ${cfg.labelHeight}mm;
    flex: 0 0 ${cfg.labelWidth}mm;
    padding: 0.2mm;
    margin: 0;
    overflow: hidden;
    border: 0.2mm solid #000;
    position: relative;
  }

  .blank-label {
    border: 0;
  }

  .brand {
    text-align: center;
    font-weight: 800;
    font-size: min(${cfg.brandSize}px, 11px);
    line-height: 1;
    white-space: nowrap;
    height: 3.5mm;
    overflow: hidden;
  }

  .brand img {
    display: block;
    margin: 0 auto;
    max-height: 3.5mm !important;
  }

  .location {
    text-align: center;
    font-weight: 700;
    font-size: 6.5px;
    line-height: 1;
    margin-top: 0.2mm;
    padding-bottom: 0.5mm;
    border-bottom: 0.2mm solid #000;
  }

  .details {
    margin-top: 0.5mm;
    font-size: min(${cfg.bodySize}px, 11px);
    line-height: 1.05;
    padding-right: 0.2mm;
  }

  .details > div {
    height: 2.9mm;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .nowrap {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sizes {
    width: 100%;
    margin-top: 0.3mm;
    border: 0.2mm solid #000;
    font-size: 7px;
    line-height: 1;
  }

  .size-row {
    display: grid;
    grid-template-columns: repeat(var(--size-count), 1fr);
    height: 2.9mm;
  }

  .size-row > div {
    text-align: center;
    padding: 0.3mm 0;
    border-right: 0.2mm solid #000;
    overflow: hidden;
  }

  .size-row > div:last-child {
    border-right: 0;
  }

  .qty {
    border-top: 0.2mm solid #000;
  }

  .barcode {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 5.5mm;
    text-align: center;
    width: auto;
  }

  .barcode-svg {
    display: block;
    width: 100%;
    height: 10mm;
    shape-rendering: crispEdges;
    image-rendering: pixelated;
  }

  .barcode-text {
    margin-top: 0.3mm;
    font-size: 8px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.7px;
  }

  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }

    .print-row {
      page-break-after: always;
      break-after: page;
    }

    .print-row:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  }
</style>
</head>
<body>
${printRows.join("\n")}
<script>
  window.onload = function () {
    setTimeout(function () {
      window.print();
    }, 300);
  };
<\/script>
</body>
</html>`);

    popup.document.close();
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
                        {r.SizeRows.map(s => `${s.size_code}: ${s.qty}`).join("  |  ")}
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
                            const initialQty = {};
                            (r.SizeRows || []).forEach(s => {
                              initialQty[s.size_code] = 0;
                            });
                            setBarcodeRowIndex(index >= 0 ? index : i);
                            setBundleSizeQty(initialQty);
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
                        {s.size_code} (remaining: {s.qty})
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
                Print Labels (2-UP)
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
                        const initialQty = {};
                        (availableRows[nextIndex]?.SizeRows || []).forEach(s => {
                          initialQty[s.size_code] = 0;
                        });
                        setBarcodeRowIndex(nextIndex);
                        setBundleSizeQty(initialQty);
                      }

                      alert(`Barcode created: ${res.data.barcode.barcode}`);
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