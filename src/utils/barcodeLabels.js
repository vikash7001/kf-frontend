// ==========================================================
// BARCODE LABELS – one place that draws and prints all labels
// (Purchase Voucher, Create Barcode, Barcode Lookup, Barcode Design).
//
// Label roll: 38 x 38 mm, 2 across ("2-up"), ~82 mm wide.
// Each printed PAGE = one row of labels across the roll.
//
// Two settings, both saved on THIS computer (each office tunes its own printer):
//   kf_barcode_design   what is on the label (logo, fields, text sizes)
//   kf_label_printer    where the labels are on the roll (gaps, nudges)
//
// Barcode numbers look like ADM-3401 (series letters + running number).
// The bars hold only the number (3401) so they are short and sharp; the text
// under them shows ADM-3401. (Older test codes KF-A7K92M still print/scan.) Bars are drawn in whole
// printer dots (0.25 mm = 2 dots on a 203 dpi thermal printer).
// ==========================================================

export const DEFAULT_DESIGN = {
  logo: "",
  logoWidth: 60,
  showBrand: true,
  showLocation: false,
  showItem: true,
  showSeries: true,
  showCategory: false,
  showPurchase: false,
  showSizes: true,
  showBarcode: true,
  brandSize: 11,      // px
  itemSize: 17,       // px – the design number, big and bold
  seriesSize: 12,     // px – series, bold
  bodySize: 8,        // px – category / purchase (if shown)
  codeTextSize: 10    // px – KF-XXXXXX under the barcode
};

// Page 76 x 38 mm (same page as the TechnoRiver template used in every office).
// The labels on the roll are ~40 mm apart (38 mm label + ~2 mm gap), so the
// second label starts 39 mm in; each printed label area is 36.5 mm wide.
export const DEFAULT_PRINTER = {
  labelWidth: 36.5,   // mm
  labelHeight: 38,    // mm (= page height)
  columns: 2,         // labels across
  leftMargin: 0,      // mm, page edge → first label
  gapX: 2.5,          // mm between labels across
  rightMargin: 0.5,   // mm  → page width 76 mm
  offsetX: 0,         // mm nudge (+ right)
  offsetY: 0,         // mm nudge (+ down)
  module: 0.25,       // mm per barcode bar unit (0.25 = 2 dots @203dpi, 0.254 = 3 dots @300dpi)
  barHeight: 10       // mm
};

function readJson(key, defaults) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}
export const readDesign = () => readJson("kf_barcode_design_v2", DEFAULT_DESIGN);
export const readPrinter = () => readJson("kf_label_printer_v2", DEFAULT_PRINTER);
export const saveDesign = d => { try { localStorage.setItem("kf_barcode_design_v2", JSON.stringify(d)); } catch { /* ignore */ } };
export const savePrinter = p => { try { localStorage.setItem("kf_label_printer_v2", JSON.stringify(p)); } catch { /* ignore */ } };

export const pageWidthMm = p =>
  Number(p.leftMargin) + Number(p.columns) * Number(p.labelWidth) +
  (Number(p.columns) - 1) * Number(p.gapX) + Number(p.rightMargin);

// ---------------- Code 128-B ----------------
const PATTERNS = [
  "11011001100", "11001101100", "11001100110", "10010011000", "10010001100", "10001001100", "10011001000",
  "10011000100", "10001100100", "11001001000", "11001000100", "11000100100", "10110011100", "10011011100",
  "10011001110", "10111001100", "10011101100", "10011100110", "11001110010", "11001011100", "11001001110",
  "11011100100", "11001110100", "11101101110", "11101001100", "11100101100", "11100100110", "11101100100",
  "11100110100", "11100110010", "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
  "10001000110", "10110001000", "10001101000", "10001100010", "11010001000", "11000101000", "11000100010",
  "10110111000", "10110001110", "10001101110", "10111011000", "10111000110", "10001110110", "11101110110",
  "11010001110", "11000101110", "11011101000", "11011100010", "11011101110", "11101011000", "11101000110",
  "11100010110", "11101101000", "11101100010", "11100011010", "11101111010", "11001000010", "11110001010",
  "10100110000", "10100001100", "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
  "10110000100", "10011010000", "10011000010", "10000110100", "10000110010", "11000010010", "11001010000",
  "11110111010", "11000010100", "10001111010", "10100111100", "10010111100", "10010011110", "10111100100",
  "10011110100", "10011110010", "11110100100", "11110010100", "11110010010", "11011011110", "11011110110",
  "11110110110", "10101111000", "10100011110", "10001011110", "10111101000", "10111100010", "11110101000",
  "11110100010", "10111011110", "10111101110", "11101011110", "11110101110", "11010000100", "11010010000",
  "11010011100", "1100011101011"
];

export function code128B(value) {
  const START_B = 104, STOP = 106;
  const vals = [START_B];
  for (const ch of String(value)) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 126) throw new Error("Unsupported character in barcode");
    vals.push(c - 32);
  }
  let sum = START_B;
  for (let i = 1; i < vals.length; i++) sum += vals[i] * i;
  vals.push(sum % 103, STOP);
  return vals.map(v => PATTERNS[v]).join("");
}

/** what the bars hold: ADM-3401 → "3401"; older KF-A7K92M → "A7K92M" */
export const scanValue = barcode => {
  const s = String(barcode || "").toUpperCase();
  const m = s.match(/^[A-Z]{1,3}-?(\d+)$/);
  return m ? m[1] : s.replace(/^KF-?/, "");
};

const esc = v => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function barcodeSvg(barcode, p) {
  const bits = code128B(scanValue(barcode));
  const quiet = 10;
  const all = "0".repeat(quiet) + bits + "0".repeat(quiet);
  const mod = Number(p.module) || 0.25;
  // merge neighbouring black modules into one bar (sharper, smaller file)
  let rects = "", i = 0;
  while (i < all.length) {
    if (all[i] === "1") {
      let j = i;
      while (j < all.length && all[j] === "1") j++;
      rects += `<rect x="${i}" y="0" width="${j - i}" height="1"/>`;
      i = j;
    } else i++;
  }
  return `<svg class="bc" xmlns="http://www.w3.org/2000/svg" width="${(all.length * mod).toFixed(3)}mm"
    height="${Number(p.barHeight) || 8}mm" viewBox="0 0 ${all.length} 1" preserveAspectRatio="none"
    shape-rendering="crispEdges"><rect width="${all.length}" height="1" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
}

/**
 * label = { barcode, item, seriesname, categoryname, location, purchase, sizes:[{size_code, qty}] }
 */
export function labelHtml(label, design = readDesign(), printer = readPrinter()) {
  const d = { ...DEFAULT_DESIGN, ...design };
  const sizes = (label.sizes || []).filter(s => Number(s.qty) > 0);
  const parts = [];
  if (d.showBrand) {
    parts.push(`<div class="brand" style="font-size:${Number(d.brandSize)}px">${
      d.logo ? `<img src="${d.logo}" style="max-width:${Number(d.logoWidth)}%">` : "KARNI FASHIONS"}</div>`);
  }
  if (d.showLocation && label.location) parts.push(`<div class="loc">${esc(String(label.location).toUpperCase())}</div>`);
  if (d.showItem) parts.push(`<div class="item" style="font-size:${Number(d.itemSize)}px">${esc(label.item)}</div>`);
  if (d.showSeries && label.seriesname) {
    parts.push(`<div class="series" style="font-size:${Number(d.seriesSize) || 11}px">${esc(String(label.seriesname).toUpperCase())}</div>`);
  }
  const lines = [];
  if (d.showCategory && label.categoryname) lines.push(`<div><b>CAT:</b> ${esc(label.categoryname)}</div>`);
  if (d.showPurchase && label.purchase) lines.push(`<div><b>PUR:</b> ${esc(label.purchase)}</div>`);
  if (lines.length) parts.push(`<div class="lines" style="font-size:${Number(d.bodySize)}px">${lines.join("")}</div>`);
  if (d.showSizes && sizes.length) {
    const cols = `grid-template-columns:repeat(${sizes.length},1fr)`;
    parts.push(`<div class="sizes"><div class="sr" style="${cols}">${sizes.map(s => `<div>${esc(s.size_code)}</div>`).join("")}</div>` +
      `<div class="sr q" style="${cols}">${sizes.map(s => `<div>${Number(s.qty)}</div>`).join("")}</div></div>`);
  }
  if (d.showBarcode && label.barcode) {
    parts.push(`<div class="bcbox">${barcodeSvg(label.barcode, printer)}<div class="bct" style="font-size:${Number(d.codeTextSize) || 10}px">${esc(label.barcode)}</div></div>`);
  }
  return `<div class="label">${parts.join("")}</div>`;
}

export function labelCss(p = readPrinter()) {
  return `
  .label { width:${p.labelWidth}mm; height:${p.labelHeight}mm; padding:1mm 1.2mm 0.8mm; box-sizing:border-box;
           overflow:hidden; font-family: Arial, Helvetica, sans-serif; color:#000; display:flex; flex-direction:column; }
  .brand { text-align:center; font-weight:800; line-height:1; white-space:nowrap; overflow:hidden; height:3.6mm;
           border-bottom:0.25mm solid #000; padding-bottom:0.5mm; box-sizing:content-box; }
  .brand img { max-height:3.6mm; display:block; margin:0 auto; object-fit:contain; }
  .loc { text-align:center; font-size:6.5px; font-weight:700; letter-spacing:.6px; line-height:1;
         border-bottom:0.25mm solid #000; padding:0.4mm 0 0.6mm; }
  .item { text-align:center; font-weight:900; line-height:1; margin-top:0.9mm; letter-spacing:.3px; }
  .series { text-align:center; font-weight:700; line-height:1.1; margin-top:0.6mm; letter-spacing:.4px;
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .lines { line-height:1.15; margin-top:0.5mm; }
  .lines > div { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sizes { border:0.25mm solid #000; margin-top:0.7mm; font-size:7px; line-height:1; }
  .sr { display:grid; } .sr > div { text-align:center; padding:0.35mm 0; border-right:0.25mm solid #000; overflow:hidden; }
  .sr > div:last-child { border-right:0; } .sr.q { border-top:0.25mm solid #000; font-weight:700; }
  .bcbox { margin-top:auto; text-align:center; }
  .bc { display:block; margin:0 auto; }
  .bct { font-weight:800; letter-spacing:1px; line-height:1; margin-top:0.4mm; }`;
}

/** Full printable HTML: one page per row of labels across the roll. */
export function sheetHtml(labels, { design = readDesign(), printer = readPrinter(), test = false } = {}) {
  const p = { ...DEFAULT_PRINTER, ...printer };
  const pw = pageWidthMm(p), ph = Number(p.labelHeight);
  const cols = Math.max(1, Number(p.columns));
  const rows = [];
  for (let i = 0; i < labels.length; i += cols) rows.push(labels.slice(i, i + cols));
  if (!rows.length) rows.push([]);
  const pages = rows.map(row => {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      const x = Number(p.leftMargin) + c * (Number(p.labelWidth) + Number(p.gapX)) + Number(p.offsetX);
      const lab = row[c];
      cells.push(`<div class="slot${test ? " test" : ""}" style="left:${x}mm;top:${Number(p.offsetY)}mm">${
        lab ? labelHtml(lab, design, p) : ""}</div>`);
    }
    return `<div class="page">${cells.join("")}</div>`;
  });
  return `<!doctype html><html><head><meta charset="utf-8"><title>Karni Fashions – labels</title><style>
  @page { size:${pw}mm ${ph}mm; margin:0; }
  * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  html, body { margin:0; padding:0; background:#fff; }
  .page { position:relative; width:${pw}mm; height:${ph}mm; overflow:hidden; page-break-after:always; break-after:page; }
  .page:last-child { page-break-after:auto; break-after:auto; }
  .slot { position:absolute; width:${p.labelWidth}mm; height:${p.labelHeight}mm; }
  .slot.test { outline:0.25mm dashed #000; outline-offset:-0.6mm; }
  @media screen { body { background:#ddd; padding:10px; } .page { background:#fff; margin:0 auto 6px; box-shadow:0 1px 4px #0003; } }
  ${labelCss(p)}
  </style></head><body>${pages.join("")}
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script></body></html>`;
}

/** Opens the print window. Returns false if pop-ups are blocked. */
export function printLabels(labels, opts = {}) {
  const w = window.open("", "_blank", "width=820,height=600");
  if (!w) { alert("Please allow pop-ups for this site to print labels."); return false; }
  w.document.open();
  w.document.write(sheetHtml(labels, opts));
  w.document.close();
  return true;
}

/** bundle from the server → label */
export function toLabel(b, extra = {}) {
  return {
    barcode: b.barcode,
    item: b.item,
    seriesname: b.seriesname || b.series || "",
    categoryname: b.categoryname || b.category || "",
    location: b.location || extra.location || "",
    purchase: b.incomingheaderid || extra.purchase || "",
    sizes: (b.sizes || []).map(s => ({ size_code: s.size_code, qty: Number(s.qty) }))
  };
}

export const SAMPLE_LABEL = {
  barcode: "ADM-3401", item: "11050", seriesname: "Admire", categoryname: "Women Fancy Kurti",
  location: "Jaipur", purchase: "727",
  sizes: [{ size_code: "M", qty: 1 }, { size_code: "L", qty: 1 }, { size_code: "XL", qty: 1 }, { size_code: "XXL", qty: 1 }]
};
