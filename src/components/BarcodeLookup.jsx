import React, { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { printLabels, toLabel, syncLabelSettings } from "../utils/barcodeLabels";
import BarcodeSuggest from "./BarcodeSuggest";

// ==========================================================
// BARCODE LOOKUP – scan any bundle: what's inside, where, sold or not,
// its history; reprint the label; take pieces out (sample / loose piece).
// Also lists the latest bundles for reprinting several labels at once.
// ==========================================================

const LOCATIONS = ["Jaipur", "Kolkata", "Ahmedabad"];
const KIND = { CREATE: "Bundle made", SALE: "Sold", REMOVE: "Taken out" };
const fmt = d => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function BarcodeLookup() {
  const [code, setCode] = useState("");
  const [rec, setRec] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [removeQty, setRemoveQty] = useState(null);   // {size: qty} when the "take out" form is open
  const [reason, setReason] = useState("Sample");

  const [location, setLocation] = useState("Jaipur");
  const [recent, setRecent] = useState([]);
  const [picked, setPicked] = useState({});
  const inputRef = useRef(null);

  const user = (() => { try { return JSON.parse(localStorage.getItem("kf_user")) || {}; } catch { return {}; } })();

  const lookup = async value => {
    const v = String(value || code).trim();
    if (!v) return;
    setBusy(true); setError(""); setRec(null); setRemoveQty(null);
    try {
      const r = await api.get(`/barcode/${encodeURIComponent(v)}`);
      setRec(r.data.barcode);
    } catch (e) {
      setError(e?.response?.data?.error || "Could not look up the barcode");
    } finally {
      setBusy(false);
      setCode("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const loadRecent = async loc => {
    try {
      const r = await api.get("/barcode/recent", { location: loc, limit: 60 });
      setRecent(r.data?.rows || []);
      setPicked({});
    } catch { setRecent([]); }
  };
  useEffect(() => { loadRecent(location); }, [location]);
  useEffect(() => { syncLabelSettings(); inputRef.current?.focus(); }, []);   // latest label settings of each office

  const reprint = b => printLabels([toLabel({ ...b, sizes: b.sizes.filter(s => Number(s.qty) > 0) })]);

  const printPicked = () => {
    const list = recent.filter(r => picked[r.barcode]);
    if (!list.length) return alert("Tick the labels to print.");
    printLabels(list.map(b => toLabel({ ...b, sizes: b.sizes.filter(s => Number(s.qty) > 0) })));
  };

  const takeOut = async () => {
    const sizes = Object.entries(removeQty || {}).filter(([, q]) => Number(q) > 0).map(([size_code, q]) => ({ size_code, qty: Number(q) }));
    if (!sizes.length) return alert("Enter how many pieces to take out.");
    if (!window.confirm(`Take ${sizes.map(s => `${s.qty} × ${s.size_code}`).join(", ")} out of ${rec.barcode}?\n(Stock is not changed – the pieces just stop being part of this bundle.)`)) return;
    try {
      await api.post(`/barcode/${encodeURIComponent(rec.barcode)}/remove`, { sizes, reason, UserName: user.username });
      await lookup(rec.barcode);
      loadRecent(location);
    } catch (e) {
      alert(e?.response?.data?.error || "Could not update the bundle");
    }
  };

  const sold = rec && !rec.is_active;

  return (
    <div style={{ padding: 18, maxWidth: 1000 }}>
      <h2>Barcode Lookup</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <BarcodeSuggest
          inputRef={inputRef}
          value={code}
          onChange={setCode}
          onSubmit={v => lookup(v)}
          all
          placeholder="Scan a barcode (or type 340…)"
          style={{ fontSize: 18, padding: "8px 10px", width: 320 }}
        />
        <button type="button" onClick={() => lookup()} disabled={busy}>Look up</button>
      </div>

      {error && <div style={{ color: "#b00020", fontWeight: 600, marginBottom: 12 }}>⚠ {error}</div>}

      {rec && (
        <div style={{ border: `2px solid ${sold ? "#c62828" : "#2e7d32"}`, borderRadius: 8, padding: 16, background: "#fff", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{rec.barcode}</div>
              <div style={{ fontSize: 18 }}><b>{rec.item}</b> · {rec.seriesname} · {rec.categoryname}</div>
              <div style={{ color: "#555" }}>
                {rec.location}{rec.incomingheaderid ? ` · Purchase #${rec.incomingheaderid}` : " · from old stock"} · made {fmt(rec.created_at)}
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: sold ? "#c62828" : "#2e7d32" }}>
              {sold ? (rec.closed_salesid ? `SOLD (sale #${rec.closed_salesid})` : "EMPTY") : `IN STOCK · ${rec.total} pcs`}
            </div>
          </div>

          <table border="1" cellPadding="5" style={{ borderCollapse: "collapse", marginTop: 12 }}>
            <thead><tr><th>Size</th><th>On label</th><th>In bundle now</th>{removeQty && <th>Take out</th>}</tr></thead>
            <tbody>
              {rec.sizes.map(s => (
                <tr key={s.size_code}>
                  <td><b>{s.size_code}</b></td>
                  <td align="right">{s.orig_qty}</td>
                  <td align="right" style={{ color: s.qty < s.orig_qty ? "#c62828" : undefined }}>{s.qty}</td>
                  {removeQty && (
                    <td><input type="number" min="0" max={s.qty} disabled={s.qty <= 0} style={{ width: 60 }}
                      value={removeQty[s.size_code] ?? ""} onChange={e => setRemoveQty(p => ({ ...p, [s.size_code]: e.target.value }))} /></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            {!sold && <button type="button" onClick={() => reprint(rec)}>🖨 Reprint label{rec.total < rec.orig_total ? " (with current sizes)" : ""}</button>}
            {!sold && !removeQty && <button type="button" onClick={() => setRemoveQty({})}>Take pieces out…</button>}
            {removeQty && (
              <>
                <select value={reason} onChange={e => setReason(e.target.value)}>
                  <option>Sample</option><option>Sold loose</option><option>Damaged</option><option>Other</option>
                </select>
                <button type="button" onClick={takeOut}>Confirm take out</button>
                <button type="button" onClick={() => setRemoveQty(null)}>Cancel</button>
              </>
            )}
          </div>

          {rec.history?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <b>History</b>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {rec.history.map((h, i) => (
                  <li key={i}>
                    {fmt(h.created_at)} – {KIND[h.kind] || h.kind}
                    {h.size_code ? ` ${h.qty} × ${h.size_code}` : h.note ? ` (${h.note})` : ""}
                    {h.salesid ? ` · sale #${h.salesid}${h.customer ? " – " + h.customer : ""}` : ""}
                    {h.kind === "REMOVE" && h.note ? ` · ${h.note}` : ""}
                    {h.username ? ` · ${h.username}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <h3>Latest bundles</h3>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
        <select value={location} onChange={e => setLocation(e.target.value)}>
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>
        <button type="button" onClick={printPicked}>🖨 Print ticked labels</button>
      </div>
      <table border="1" cellPadding="5" style={{ borderCollapse: "collapse", width: "100%", background: "#fff" }}>
        <thead><tr><th></th><th>Barcode</th><th>Design</th><th>Sizes now</th><th>Purchase</th><th>Made</th><th>Status</th></tr></thead>
        <tbody>
          {recent.length === 0 ? <tr><td colSpan="7" align="center">No bundles yet</td></tr> : recent.map(r => {
            const now = r.sizes.filter(s => Number(s.qty) > 0);
            return (
              <tr key={r.barcode} style={!r.is_active ? { color: "#999" } : null}>
                <td align="center">
                  <input type="checkbox" disabled={!r.is_active} checked={!!picked[r.barcode]}
                    onChange={e => setPicked(p => ({ ...p, [r.barcode]: e.target.checked }))} />
                </td>
                <td><a href="#lookup" onClick={e => { e.preventDefault(); lookup(r.barcode); }}>{r.barcode}</a></td>
                <td><b>{r.item}</b> · {r.seriesname}</td>
                <td>{now.map(s => `${s.size_code}${Number(s.qty) > 1 ? "×" + s.qty : ""}`).join(" ") || "–"}</td>
                <td>{r.incomingheaderid || "old stock"}</td>
                <td>{fmt(r.created_at)}</td>
                <td>{r.is_active ? "In stock" : "Sold"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
