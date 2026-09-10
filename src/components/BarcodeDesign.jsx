import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_DESIGN = {
  labelWidth: 38,
  labelHeight: 38,
  columns: 2,
  orientation: "portrait",
  margin: 2,
  logo: "",
  logoWidth: 55,
  showBrand: true,
  showLocation: true,
  showItem: true,
  showSeries: true,
  showCategory: true,
  showPurchase: true,
  showSizes: true,
  showBarcode: true,
  brandSize: 16,
  bodySize: 8
};

const SAMPLE = {
  brand: "KARNI FASHIONS",
  location: "JAIPUR",
  item: "10001",
  series: "Wonder",
  category: "Women Fancy Kurti",
  purchase: "727",
  barcode: "KF-7904H5",
  sizes: [
    ["L", 1],
    ["XL", 1],
    ["XXL", 1],
    ["3XL", 1]
  ]
};

function readSavedDesign() {
  try {
    const raw = localStorage.getItem("kf_barcode_design");
    return raw ? { ...DEFAULT_DESIGN, ...JSON.parse(raw) } : DEFAULT_DESIGN;
  } catch {
    return DEFAULT_DESIGN;
  }
}

export default function BarcodeDesign() {
  const [design, setDesign] = useState(readSavedDesign);
  const [logoName, setLogoName] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("kf_barcode_design", JSON.stringify(design));
    } catch {
      // Keep the designer usable even if browser storage is unavailable.
    }
  }, [design]);

  const update = (key, value) => {
    setDesign(prev => ({ ...prev, [key]: value }));
  };

  const pageWidth = design.orientation === "portrait"
    ? design.labelWidth * design.columns + design.margin * 2
    : design.labelHeight * design.columns + design.margin * 2;

  const pageHeight = design.orientation === "portrait"
    ? design.labelHeight + design.margin * 2
    : design.labelWidth + design.margin * 2;

  const scale = 5;

  const previewLabelStyle = useMemo(() => ({
    width: design.labelWidth * scale,
    height: design.labelHeight * scale,
    boxSizing: "border-box",
    border: "1px solid #222",
    background: "#fff",
    padding: 5,
    overflow: "hidden",
    fontFamily: "Arial, sans-serif",
    color: "#000"
  }), [design.labelWidth, design.labelHeight]);

  const handleLogo = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      update("logo", reader.result);
    };
    reader.readAsDataURL(file);
  };

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

  const printSample = () => {
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      alert("Please allow pop-ups to print a sample label.");
      return;
    }

    const labelWidth = Number(design.labelWidth) || 38;
    const labelHeight = Number(design.labelHeight) || 38;
    const margin = Number(design.margin) || 0;
    const columns = Number(design.columns) || 1;

    const brandHtml = design.showBrand
      ? `<div class="brand">${design.logo
          ? `<img src="${design.logo}" alt="Logo" style="max-width:${design.logoWidth}%;max-height:25px;object-fit:contain;">`
          : SAMPLE.brand}</div>`
      : "";

    const locationHtml = design.showLocation
      ? `<div class="location">${SAMPLE.location}</div>`
      : "";

    const details = [];
    if (design.showItem) details.push(`<div><b>ITEM:</b> ${SAMPLE.item}</div>`);
    if (design.showSeries) details.push(`<div><b>SER:</b> ${SAMPLE.series}</div>`);
    if (design.showCategory) details.push(`<div class="nowrap"><b>CAT:</b> ${SAMPLE.category}</div>`);
    if (design.showPurchase) details.push(`<div><b>PUR:</b> ${SAMPLE.purchase}</div>`);

    const sizeHtml = design.showSizes
      ? `<div class="sizes">
          <div class="size-row">${SAMPLE.sizes.map(([size]) => `<div>${size}</div>`).join("")}</div>
          <div class="size-row qty">${SAMPLE.sizes.map(([, qty]) => `<div>${qty}</div>`).join("")}</div>
        </div>`
      : "";

    const barcodeBits = code128BPattern(SAMPLE.barcode);
    const quietModules = 9;
    const moduleDots = 2;
    const barcodeDots = barcodeWithQuietZone.length * moduleDots;
    const barcodeWithQuietZone = barcodeBits
      ? `${"0".repeat(quietModules)}${barcodeBits}${"0".repeat(quietModules)}`
      : "";

    const barcodeHtml = design.showBarcode
      ? `<div class="barcode">
          ${barcodeWithQuietZone ? `
          <svg class="barcode-svg"
               width="${barcodeDots}"
               height="80"
               viewBox="0 0 ${barcodeDots} 80"
               preserveAspectRatio="none"
               role="img"
               aria-label="Sample barcode"
               shape-rendering="crispEdges">
            <rect width="${barcodeDots}" height="80" fill="#fff"/>
            ${barcodeWithQuietZone.split("").map((bit, i) =>
              bit === "1"
                ? `<rect x="${i * moduleDots}" y="0" width="${moduleDots}" height="80" fill="#000"/>`
                : ""
            ).join("")}
          </svg>` : ""}
          <div class="barcode-text">${SAMPLE.barcode}</div>
        </div>`
      : "";

    const labelHtml = `
      <div class="label">
        ${brandHtml}
        ${locationHtml}
        <div class="details">${details.join("")}</div>
        ${sizeHtml}
        ${barcodeHtml}
      </div>
    `;

    popup.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Karni Fashions - Sample Barcode Print</title>
<style>
  @page {
    size: ${labelWidth}mm ${labelHeight}mm;
    margin: 0;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    width: ${labelWidth}mm;
    height: ${labelHeight}mm;
    background: white;
    overflow: hidden;
  }

  body {
    font-family: Arial, sans-serif;
    color: #000;
  }

  .page {
    width: ${labelWidth}mm;
    height: ${labelHeight}mm;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }

  .label {
    width: ${labelWidth}mm;
    height: ${labelHeight}mm;
    padding: 0.7mm;
    margin: 0;
    overflow: hidden;
    border: 0.2mm solid #000;
    position: relative;
  }

  .brand {
    text-align: center;
    font-weight: 800;
    font-size: min(${Number(design.brandSize) || 16}px, 11px);
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
    font-size: min(${Number(design.bodySize) || 8}px, 11px);
    line-height: 1.05;
    padding-right: 0.2mm;
  }

  .details > div {
    height: 2.6mm;
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
    margin-top: 0.5mm;
    border: 0.2mm solid #000;
    font-size: 6px;
    line-height: 1;
  }

  .size-row {
    display: grid;
    grid-template-columns: repeat(${SAMPLE.sizes.length}, 1fr);
    height: 2.7mm;
  }

  .size-row > div {
    text-align: center;
    padding: 0.5mm 0;
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
    bottom: 1.5mm;
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
      width: ${labelWidth}mm !important;
      height: ${labelHeight}mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }

    .page,
    .label {
      width: ${labelWidth}mm !important;
      height: ${labelHeight}mm !important;
      margin: 0 !important;
    }

    .label {
      border: 0;
    }
  }
</style>
</head>
<body>
  <div class="page">
    ${labelHtml}
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print();
      }, 250);
    };
  <\/script>
</body>
</html>`);

    popup.document.close();
  };

  const reset = () => {
    setDesign(DEFAULT_DESIGN);
    setLogoName("");
    localStorage.removeItem("kf_barcode_design");
  };

  const Check = ({ label, field }) => (
    <label style={{
      display: "flex",
      alignItems: "center",
      gap: 7,
      marginBottom: 7,
      fontSize: 13
    }}>
      <input
        type="checkbox"
        checked={design[field]}
        onChange={e => update(field, e.target.checked)}
      />
      {label}
    </label>
  );

  const SampleBarcode = () => {
    const bits = code128BPattern(SAMPLE.barcode);
    const quiet = 10;
    const fullBits = bits ? `${"0".repeat(quiet)}${bits}${"0".repeat(quiet)}` : "";

    return (
      <div style={{
        marginTop: 4,
        textAlign: "center",
        width: "100%"
      }}>
        {fullBits && (
          <svg
            viewBox={`0 0 ${fullBits.length} 40`}
            preserveAspectRatio="none"
            style={{
              display: "block",
              width: "100%",
              height: 25,
              shapeRendering: "crispEdges"
            }}
          >
            <rect width={fullBits.length} height="40" fill="#fff" />
            {fullBits.split("").map((bit, i) =>
              bit === "1"
                ? <rect key={i} x={i} y="0" width="1" height="40" fill="#000" />
                : null
            )}
          </svg>
        )}
        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1 }}>
          {SAMPLE.barcode}
        </div>
      </div>
    );
  };

  const LabelPreview = () => (
    <div style={previewLabelStyle}>
      {design.showBrand && (
        <div style={{
          textAlign: "center",
          fontWeight: 800,
          fontSize: design.brandSize,
          lineHeight: 1.05,
          whiteSpace: "nowrap"
        }}>
          {design.logo ? (
            <img
              src={design.logo}
              alt="Logo"
              style={{
                maxWidth: `${design.logoWidth}%`,
                maxHeight: 25,
                objectFit: "contain"
              }}
            />
          ) : (
            SAMPLE.brand
          )}
        </div>
      )}

      {design.showLocation && (
        <div style={{
          textAlign: "center",
          fontWeight: 700,
          fontSize: 7,
          marginTop: 2,
          borderBottom: "1px solid #000",
          paddingBottom: 2
        }}>
          {SAMPLE.location}
        </div>
      )}

      <div style={{
        marginTop: 5,
        fontSize: design.bodySize,
        lineHeight: 1.25
      }}>
        {design.showItem && <div><b>ITEM:</b> {SAMPLE.item}</div>}
        {design.showSeries && <div><b>SER:</b> {SAMPLE.series}</div>}
        {design.showCategory && (
          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <b>CAT:</b> {SAMPLE.category}
          </div>
        )}
        {design.showPurchase && <div><b>PUR:</b> {SAMPLE.purchase}</div>}
      </div>

      {design.showSizes && (
        <div style={{
          marginTop: 5,
          width: "100%",
          border: "1px solid #000",
          fontSize: 6,
          boxSizing: "border-box"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${SAMPLE.sizes.length}, 1fr)`,
            fontWeight: 700
          }}>
            {SAMPLE.sizes.map(([size]) => (
              <div key={size} style={{
                borderRight: "1px solid #000",
                textAlign: "center",
                padding: "1px 0"
              }}>
                {size}
              </div>
            ))}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${SAMPLE.sizes.length}, 1fr)`,
            borderTop: "1px solid #000"
          }}>
            {SAMPLE.sizes.map(([size, qty]) => (
              <div key={size} style={{
                borderRight: "1px solid #000",
                textAlign: "center",
                padding: "1px 0"
              }}>
                {qty}
              </div>
            ))}
          </div>
        </div>
      )}

      {design.showBarcode && <SampleBarcode />}
    </div>
  );

  return (
    <div style={{ padding: 18 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15
      }}>
        <div>
          <h2 style={{ margin: 0 }}>Barcode Label Design</h2>
          <div style={{ marginTop: 4, color: "#666", fontSize: 13 }}>
            Design the physical barcode label. Printing will use these saved settings.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={reset}>Reset</button>
          <button onClick={() => alert("Barcode design saved.")}>Save Design</button>
          <button onClick={printSample}>Sample Print</button>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: 20,
        alignItems: "start"
      }}>
        <div style={{
          border: "1px solid #ccc",
          borderRadius: 6,
          padding: 15,
          background: "#fafafa"
        }}>
          <h3 style={{ marginTop: 0 }}>Label Settings</h3>

          <div style={{ fontWeight: 700, marginBottom: 8 }}>Label Size (mm)</div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <label style={{ flex: 1 }}>
              Width
              <input
                type="number"
                min="10"
                value={design.labelWidth}
                onChange={e => update("labelWidth", Number(e.target.value))}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </label>

            <label style={{ flex: 1 }}>
              Height
              <input
                type="number"
                min="10"
                value={design.labelHeight}
                onChange={e => update("labelHeight", Number(e.target.value))}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </label>
          </div>

          <label style={{ display: "block", marginBottom: 12 }}>
            Labels across / 2-UP
            <select
              value={design.columns}
              onChange={e => update("columns", Number(e.target.value))}
              style={{ width: "100%" }}
            >
              <option value={1}>1-UP</option>
              <option value={2}>2-UP</option>
              <option value={3}>3-UP</option>
            </select>
          </label>

          <label style={{ display: "block", marginBottom: 12 }}>
            Orientation
            <select
              value={design.orientation}
              onChange={e => update("orientation", e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>

          <label style={{ display: "block", marginBottom: 15 }}>
            Margin (mm)
            <input
              type="number"
              min="0"
              step="0.5"
              value={design.margin}
              onChange={e => update("margin", Number(e.target.value))}
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </label>

          <div style={{
            borderTop: "1px solid #ddd",
            paddingTop: 12,
            marginTop: 4
          }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Logo</div>

            <input
              type="file"
              accept="image/*"
              onChange={handleLogo}
            />

            {logoName && (
              <div style={{ fontSize: 11, color: "#666", marginTop: 5 }}>
                {logoName}
              </div>
            )}

            {design.logo && (
              <button
                style={{ marginTop: 7 }}
                onClick={() => {
                  update("logo", "");
                  setLogoName("");
                }}
              >
                Remove Logo
              </button>
            )}

            <label style={{ display: "block", marginTop: 10 }}>
              Logo width (%)
              <input
                type="number"
                min="20"
                max="100"
                value={design.logoWidth}
                onChange={e => update("logoWidth", Number(e.target.value))}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </label>
          </div>

          <div style={{
            borderTop: "1px solid #ddd",
            paddingTop: 12,
            marginTop: 15
          }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Content</div>
            <Check label="Brand / Logo" field="showBrand" />
            <Check label="Location" field="showLocation" />
            <Check label="Item" field="showItem" />
            <Check label="Series" field="showSeries" />
            <Check label="Category" field="showCategory" />
            <Check label="Purchase ID" field="showPurchase" />
            <Check label="Size composition" field="showSizes" />
            <Check label="Barcode" field="showBarcode" />
          </div>

          <div style={{
            borderTop: "1px solid #ddd",
            paddingTop: 12,
            marginTop: 15
          }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Text Size</div>

            <label style={{ display: "block", marginBottom: 8 }}>
              Brand
              <input
                type="number"
                min="8"
                max="30"
                value={design.brandSize}
                onChange={e => update("brandSize", Number(e.target.value))}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </label>

            <label style={{ display: "block" }}>
              Body
              <input
                type="number"
                min="5"
                max="16"
                value={design.bodySize}
                onChange={e => update("bodySize", Number(e.target.value))}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </label>
          </div>
        </div>

        <div style={{
          border: "1px solid #ccc",
          borderRadius: 6,
          padding: 18,
          minHeight: 520,
          background: "#eee"
        }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>
            Print Page Preview
          </div>

          <div style={{
            fontSize: 12,
            color: "#555",
            marginBottom: 15
          }}>
            Label: {design.labelWidth} × {design.labelHeight} mm
            {" · "}
            {design.columns}-UP
            {" · "}
            {design.orientation}
            {" · "}
            margin {design.margin} mm
            {" · "}
            page preview {pageWidth.toFixed(1)} × {pageHeight.toFixed(1)} mm
          </div>

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: design.margin * scale,
            padding: design.margin * scale,
            background: "#fff",
            border: "1px solid #aaa",
            width: "fit-content",
            maxWidth: "100%",
            boxSizing: "border-box"
          }}>
            {Array.from({ length: design.columns }).map((_, i) => (
              <LabelPreview key={i} />
            ))}
          </div>

          <div style={{
            marginTop: 18,
            padding: 12,
            background: "#fff",
            border: "1px solid #ccc",
            fontSize: 12,
            lineHeight: 1.5
          }}>
            <b>Current hardware target:</b> 38 × 38 mm label, 2-UP.
            <br />
            The preview is only a design representation; actual print calibration,
            printer margins and barcode density will be handled when we build the print step.
          </div>
        </div>
      </div>
    </div>
  );
}
