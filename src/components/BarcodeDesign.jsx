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

    const barcodeHtml = design.showBarcode
      ? `<div class="barcode">
          <div class="bars">${Array.from({ length: 42 }).map((_, i) =>
            `<span style="width:${i % 5 === 0 ? 2 : 1}px;margin-right:${i % 3 === 0 ? 1 : 0}px;background:${i % 7 === 0 ? "#fff" : "#000"}"></span>`
          ).join("")}</div>
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
    margin: ${margin}mm;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: white;
  }

  body {
    font-family: Arial, sans-serif;
    color: #000;
  }

  .page {
    display: grid;
    grid-template-columns: repeat(${columns}, ${labelWidth}mm);
    gap: 0;
  }

  .label {
    width: ${labelWidth}mm;
    height: ${labelHeight}mm;
    padding: 1.5mm;
    overflow: hidden;
    border: 0.2mm solid #000;
  }

  .brand {
    text-align: center;
    font-weight: 800;
    font-size: ${Number(design.brandSize) || 16}px;
    line-height: 1.05;
    white-space: nowrap;
  }

  .brand img {
    display: block;
    margin: 0 auto;
  }

  .location {
    text-align: center;
    font-weight: 700;
    font-size: 7px;
    margin-top: 1mm;
    padding-bottom: 1mm;
    border-bottom: 0.2mm solid #000;
  }

  .details {
    margin-top: 1.5mm;
    font-size: ${Number(design.bodySize) || 8}px;
    line-height: 1.25;
  }

  .nowrap {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sizes {
    width: 100%;
    margin-top: 1.5mm;
    border: 0.2mm solid #000;
    font-size: 6px;
  }

  .size-row {
    display: grid;
    grid-template-columns: repeat(${SAMPLE.sizes.length}, 1fr);
  }

  .size-row > div {
    text-align: center;
    padding: 0.5mm 0;
    border-right: 0.2mm solid #000;
  }

  .size-row > div:last-child {
    border-right: 0;
  }

  .qty {
    border-top: 0.2mm solid #000;
  }

  .barcode {
    margin-top: 1.5mm;
    text-align: center;
  }

  .bars {
    height: 7mm;
    display: flex;
    justify-content: center;
    align-items: stretch;
    overflow: hidden;
  }

  .bars span {
    display: block;
    height: 100%;
  }

  .barcode-text {
    margin-top: 0.5mm;
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 1px;
  }

  @media print {
    .label {
      border: 0;
    }
  }
</style>
</head>
<body>
  <div class="page">${labelHtml.repeat(columns)}</div>
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

  const SampleBarcode = () => (
    <div style={{
      marginTop: 4,
      textAlign: "center",
      width: "100%"
    }}>
      <div style={{
        height: 25,
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        overflow: "hidden"
      }}>
        {Array.from({ length: 42 }).map((_, i) => (
          <span
            key={i}
            style={{
              display: "block",
              width: i % 5 === 0 ? 2 : 1,
              marginRight: i % 3 === 0 ? 1 : 0,
              background: i % 7 === 0 ? "#fff" : "#000"
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1 }}>
        {SAMPLE.barcode}
      </div>
    </div>
  );

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
