import React, { useMemo, useState } from "react";
import {
  DEFAULT_DESIGN, DEFAULT_PRINTER, readDesign, readPrinter, saveDesign, savePrinter,
  sheetHtml, printLabels, pageWidthMm, SAMPLE_LABEL
} from "../utils/barcodeLabels";

// ==========================================================
// BARCODE DESIGN + PRINTER SETUP
// Both are saved on THIS computer, so each office sets up its own printer once.
// ==========================================================

const box = { border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff", marginBottom: 14 };
const row = { display: "flex", alignItems: "center", gap: 8, margin: "6px 0" };
const num = { width: 70 };

export default function BarcodeDesign() {
  const [design, setDesign] = useState(readDesign);
  const [printer, setPrinter] = useState(readPrinter);
  const [logoName, setLogoName] = useState("");

  const setD = (k, v) => setDesign(d => { const n = { ...d, [k]: v }; saveDesign(n); return n; });
  const setP = (k, v) => setPrinter(p => { const n = { ...p, [k]: v === "" ? "" : Number(v) }; savePrinter(n); return n; });

  const preview = useMemo(() =>
    sheetHtml([SAMPLE_LABEL, { ...SAMPLE_LABEL, barcode: "KF-XWK2WV", item: "10099", seriesname: "Wonder" }],
      { design, printer, test: true }).replace(/<script>[\s\S]*?<\/script>/, ""),
  [design, printer]);

  const onLogo = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoName(file.name);
    const r = new FileReader();
    r.onload = () => setD("logo", r.result);
    r.readAsDataURL(file);
  };

  // plain functions (not components) so inputs keep focus while typing
  const check = (field, label) => (
    <label key={field} style={{ display: "flex", alignItems: "center", gap: 6, margin: "4px 0" }}>
      <input type="checkbox" checked={!!design[field]} onChange={e => setD(field, e.target.checked)} />
      {label}
    </label>
  );

  const pnum = (field, label, step = 0.5, hint) => (
    <div style={row} key={field}>
      <span style={{ width: 210 }}>{label}</span>
      <input type="number" step={step} style={num} value={printer[field]} onChange={e => setP(field, e.target.value)} />
      <span style={{ color: "#777", fontSize: 12 }}>{hint || "mm"}</span>
    </div>
  );

  const sample2 = [SAMPLE_LABEL, { ...SAMPLE_LABEL, barcode: "KF-XWK2WV", item: "10099", seriesname: "Wonder" }];

  return (
    <div style={{ padding: 18, maxWidth: 1100 }}>
      <h2>Barcode Design & Printer Setup</h2>
      <p style={{ color: "#555", marginTop: -6 }}>
        Saved on <b>this computer</b> – set it up once in each office for that office's printer.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 330px" }}>
          <div style={box}>
            <h3 style={{ marginTop: 0 }}>1. What is on the label</h3>
            {check("showBrand", "Brand / logo")}
            <div style={{ ...row, marginLeft: 22 }}>
              <input type="file" accept="image/*" onChange={onLogo} />
              {design.logo && <button type="button" onClick={() => { setD("logo", ""); setLogoName(""); }}>Remove logo</button>}
            </div>
            {design.logo && (
              <div style={{ ...row, marginLeft: 22 }}>
                Logo width <input type="number" style={num} value={design.logoWidth} onChange={e => setD("logoWidth", Number(e.target.value))} /> %
                <span style={{ color: "#777", fontSize: 12 }}>{logoName}</span>
              </div>
            )}
            {check("showLocation", "Location (Jaipur / Kolkata / Ahmedabad)")}
            {check("showItem", "Design number (big)")}
            {check("showSeries", "Series")}
            {check("showCategory", "Category")}
            {check("showPurchase", "Purchase number")}
            {check("showSizes", "Sizes and pieces")}
            {check("showBarcode", "Barcode")}
            <div style={row}>Brand text <input type="number" style={num} value={design.brandSize} onChange={e => setD("brandSize", Number(e.target.value))} /> px</div>
            <div style={row}>Design number <input type="number" style={num} value={design.itemSize} onChange={e => setD("itemSize", Number(e.target.value))} /> px</div>
            <div style={row}>Other text <input type="number" style={num} value={design.bodySize} onChange={e => setD("bodySize", Number(e.target.value))} /> px</div>
            <button type="button" onClick={() => { setDesign(DEFAULT_DESIGN); saveDesign(DEFAULT_DESIGN); setLogoName(""); }}>
              Reset design
            </button>
          </div>

          <div style={box}>
            <h3 style={{ marginTop: 0 }}>2. Label roll & printer</h3>
            {pnum("labelWidth", "Label width", 0.5, undefined)}
            {pnum("labelHeight", "Label height", 0.5, undefined)}
            {pnum("columns", "Labels across", 1, "(2 for 2-up)")}
            {pnum("leftMargin", "Roll edge → first label", 0.5, undefined)}
            {pnum("gapX", "Gap between labels", 0.5, undefined)}
            {pnum("rightMargin", "Last label → roll edge", 0.5, undefined)}
            <div style={{ fontSize: 13, color: "#333", margin: "6px 0 10px" }}>
              Page size for the printer: <b>{pageWidthMm(printer)} × {printer.labelHeight} mm</b>
            </div>
            <b>Fine-tune (if the print is shifted)</b>
            {pnum("offsetX", "Move right (− = left)", 0.25, undefined)}
            {pnum("offsetY", "Move down (− = up)", 0.25, undefined)}
            {pnum("module", "Barcode bar width", 0.001, "0.25 for 203 dpi (TVS) · 0.254 for 300 dpi")}
            {pnum("barHeight", "Barcode height", 0.5, undefined)}
            <button type="button" onClick={() => { setPrinter(DEFAULT_PRINTER); savePrinter(DEFAULT_PRINTER); }}>
              Reset printer setup
            </button>
          </div>
        </div>

        <div style={{ flex: "1 1 420px" }}>
          <div style={box}>
            <h3 style={{ marginTop: 0 }}>Preview</h3>
            <iframe title="Label preview" srcDoc={preview}
              style={{ width: "100%", height: 260, border: "1px solid #ccc", background: "#ddd" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={() => printLabels(sample2, { design, printer, test: true })}>
                🖨 Print test (with outlines)
              </button>
              <button type="button" onClick={() => printLabels(sample2, { design, printer })}>
                🖨 Print sample labels
              </button>
            </div>
          </div>

          <div style={{ ...box, background: "#fffbe6", borderColor: "#f0d97a", fontSize: 14, lineHeight: 1.5 }}>
            <h3 style={{ marginTop: 0 }}>One-time printer setup (each office)</h3>
            <b>A. In Windows – printer settings</b>
            <ol style={{ marginTop: 4 }}>
              <li>Start → <i>Printers & scanners</i> → your label printer → <i>Printing preferences</i>.</li>
              <li>Paper / Stock: make a new size <b>{pageWidthMm(printer)} mm wide × {printer.labelHeight} mm high</b> and select it.</li>
              <li>Media type: <b>Labels with gaps</b> (gap about 3 mm). TVS: then press the printer's <i>Feed</i> / calibrate so it finds the gaps.</li>
              <li>Print method: <b>Thermal transfer</b> (your rolls are thermal transfer, with ribbon).</li>
            </ol>
            <b>B. In the Chrome print window (first time; Chrome remembers)</b>
            <ol style={{ marginTop: 4 }}>
              <li>Destination: the label printer.</li>
              <li>More settings → Paper size: the {pageWidthMm(printer)} × {printer.labelHeight} mm size.</li>
              <li>Margins: <b>None</b> · Scale: <b>Default / 100</b> (never "Fit") · Headers and footers: <b>off</b>.</li>
            </ol>
            <b>C. Check</b>
            <ol style={{ marginTop: 4 }}>
              <li>Print <i>test (with outlines)</i>: the dashed boxes should sit just inside both labels.</li>
              <li>Shifted? Use <i>Move right / Move down</i> above, print again. Done once per computer.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
