import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_DESIGN, DEFAULT_PRINTER, OFFICES, readDesign, readPrinter, myOffice, setMyOffice,
  syncLabelSettings, saveLabelSettings, sheetHtml, printLabels, pageWidthMm, SAMPLE_LABEL
} from "../utils/barcodeLabels";

// ==========================================================
// BARCODE DESIGN + PRINTER SETUP
// Saved in the ERP once PER OFFICE. Every computer in that office then prints
// with the same settings – nobody has to adjust again.
// ==========================================================

const box = { border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff", marginBottom: 14 };
const row = { display: "flex", alignItems: "center", gap: 8, margin: "6px 0" };
const num = { width: 70 };

export default function BarcodeDesign() {
  const [office, setOffice] = useState(myOffice);
  const [design, setDesign] = useState(() => readDesign(myOffice()));
  const [printer, setPrinter] = useState(() => readPrinter(myOffice()));
  const [logoName, setLogoName] = useState("");
  const [status, setStatus] = useState("");          // "", "saving", "saved", "error"
  const dirty = useRef(false);

  // bring the latest saved settings of every office from the ERP
  useEffect(() => {
    syncLabelSettings().then(() => {
      if (dirty.current) return;
      setDesign(readDesign(office));
      setPrinter(readPrinter(office));
    });
  }, []);

  const pickOffice = o => {
    setOffice(o); setMyOffice(o);
    dirty.current = false;
    setDesign(readDesign(o)); setPrinter(readPrinter(o)); setStatus("");
  };

  // save to the ERP a moment after the last change
  useEffect(() => {
    if (!dirty.current) return;
    setStatus("saving");
    const t = setTimeout(() => {
      saveLabelSettings(office, design, printer)
        .then(() => setStatus("saved"))
        .catch(e => setStatus(e?.response?.data?.error || "error"));
    }, 700);
    return () => clearTimeout(t);
  }, [design, printer, office]);

  const setD = (k, v) => { dirty.current = true; setDesign(d => ({ ...d, [k]: v })); };
  const setP = (k, v) => { dirty.current = true; setPrinter(p => ({ ...p, [k]: v === "" ? "" : Number(v) })); };

  const sample2 = [
    { ...SAMPLE_LABEL, location: office },
    { ...SAMPLE_LABEL, location: office, barcode: "WON-3402", item: "10099", seriesname: "Wonder",
      sizes: [{ size_code: "M", qty: 2 }, { size_code: "L", qty: 2 }, { size_code: "XL", qty: 2 }] }
  ];

  const preview = useMemo(() =>
    sheetHtml(sample2, { design, printer, test: true }).replace(/<script>[\s\S]*?<\/script>/, ""),
  [design, printer, office]);

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

  return (
    <div style={{ padding: 18, maxWidth: 1100 }}>
      <h2>Barcode Design & Printer Setup</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "-4px 0 14px",
                    padding: "10px 12px", background: "#eef3ff", border: "1px solid #c5d5f5", borderRadius: 8 }}>
        <b>Office</b>
        <select value={office} onChange={e => pickOffice(e.target.value)} style={{ fontSize: 15 }}>
          {OFFICES.map(o => <option key={o}>{o}</option>)}
        </select>
        <span style={{ color: "#444" }}>
          Set up once – every computer in <b>{office}</b> prints {office} labels with these settings.
        </span>
        <span style={{ marginLeft: "auto", fontWeight: 600,
                       color: status === "saved" ? "#2e7d32" : status === "saving" ? "#777" : "#b00020" }}>
          {status === "saved" ? `✓ Saved for ${office}` : status === "saving" ? "Saving…" : status ? `⚠ Not saved: ${status}` : ""}
        </span>
      </div>

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
            {check("showTotal", "Total pieces in the bundle (PCS)")}
            {check("showBarcode", "Barcode")}
            <div style={row}>Brand text <input type="number" style={num} value={design.brandSize} onChange={e => setD("brandSize", Number(e.target.value))} /> px</div>
            <div style={row}>Design number <input type="number" style={num} value={design.itemSize} onChange={e => setD("itemSize", Number(e.target.value))} /> px</div>
            <div style={row}>Series <input type="number" style={num} value={design.seriesSize} onChange={e => setD("seriesSize", Number(e.target.value))} /> px</div>
            <div style={row}>Text under barcode <input type="number" style={num} value={design.codeTextSize} onChange={e => setD("codeTextSize", Number(e.target.value))} /> px</div>
            <div style={row}>Category / purchase <input type="number" style={num} value={design.bodySize} onChange={e => setD("bodySize", Number(e.target.value))} /> px</div>
            <button type="button" onClick={() => { dirty.current = true; setDesign(DEFAULT_DESIGN); setLogoName(""); }}>
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
            <button type="button" onClick={() => { dirty.current = true; setPrinter(DEFAULT_PRINTER); }}>
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
              <li>Shifted? Use <i>Move right / Move down</i> above, print again. Saved for the whole office.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
