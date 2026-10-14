import React, { useEffect, useMemo, useState } from "react";
import { api, createBarcode } from "../services/api";
import { printLabels, toLabel, syncLabelSettings } from "../utils/barcodeLabels";

// ==========================================================
// CREATE BARCODE – bundle stock that is already in a location
// (old stock, or anything not bundled after its purchase).
// One barcode = one physical bundle of one design.
// ==========================================================

const LOCATIONS = ["Jaipur", "Kolkata", "Ahmedabad"];

export default function CreateBarcode() {
  const [location, setLocation] = useState("Jaipur");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState(null);
  const [sizeQty, setSizeQty] = useState({});
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState([]);   // bundles made in this session (for printing)

  const loadStock = async loc => {
    try {
      setLoading(true);
      setSelected(null);
      const res = await api.get(`/barcode/stock/${encodeURIComponent(loc)}`);
      setRows(res.data?.rows || []);
    } catch (e) {
      setRows([]);
      alert(e?.response?.data?.error || "Failed to load stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStock(location); setCreated([]); }, [location]);
  useEffect(() => { syncLabelSettings(); }, []);   // latest label settings of each office

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => !q || `${r.item} ${r.seriesname}`.toLowerCase().includes(q));
  }, [rows, search]);

  const limitFor = sz => selected?.sizes_tracked
    ? Number((selected.unbarcoded_sizes || []).find(x => x.size_code === sz)?.qty || 0)
    : null;

  // a new bundle starts as one "set": 1 piece of every size still without a barcode
  const oneSet = row => {
    const init = {};
    (row.size_choices || []).forEach(s => { init[s] = ""; });
    if (row.sizes_tracked) (row.unbarcoded_sizes || []).forEach(s => { if (s.qty > 0) init[s.size_code] = 1; });
    return init;
  };
  const allLeft = row => {
    const init = {};
    (row.size_choices || []).forEach(s => { init[s] = ""; });
    (row.unbarcoded_sizes || []).forEach(s => { init[s.size_code] = s.qty; });
    return init;
  };
  const open = row => {
    setSelected(row);
    setSizeQty(oneSet(row));
  };

  // full sets (1 of every size) while every size has a piece, then the rest in one bundle
  const planBundles = row => {
    const rem = Object.fromEntries((row.unbarcoded_sizes || []).filter(s => s.qty > 0).map(s => [s.size_code, s.qty]));
    const sizes = Object.keys(rem);
    if (!sizes.length) return [];
    const full = Math.min(...sizes.map(z => rem[z]));
    const plan = [];
    for (let i = 0; i < full; i++) plan.push(Object.fromEntries(sizes.map(z => [z, 1])));
    const last = Object.fromEntries(sizes.map(z => [z, rem[z] - full]).filter(([, n]) => n > 0));
    if (Object.keys(last).length) plan.push(last);
    return plan;
  };

  const makeAll = async () => {
    const plan = planBundles(selected);
    if (!plan.length) return;
    const describe = b => Object.entries(b).map(([z, n]) => (n > 1 ? `${z}×${n}` : z)).join(" ");
    const sum = b => Object.values(b).reduce((a, n) => a + n, 0);
    const extra = plan.length > 1 && describe(plan[plan.length - 1]) !== describe(plan[0]) ? 1 : 0;
    if (!window.confirm(
      `Make ${plan.length} bundle${plan.length > 1 ? "s" : ""} of ${selected.item}?\n\n` +
      `${plan.length - extra} × (${describe(plan[0])}) = ${sum(plan[0])} pcs each` +
      (extra ? `\n1 × (${describe(plan[plan.length - 1])}) = ${sum(plan[plan.length - 1])} pcs (what is left)` : "")
    )) return;
    setCreating(true);
    const made = [];
    try {
      for (const b of plan) {
        const sizes = Object.entries(b).map(([size_code, qty]) => ({ size_code, qty }));
        const res = await createBarcode({ productid: selected.productid, Location: location, incomingheaderid: null, sizes });
        made.push(res.data.barcode);
      }
    } catch (e) {
      alert(e?.response?.data?.error || "Could not create all bundles");
    } finally {
      setCreated(list => [...made.slice().reverse(), ...list]);
      setSelected(null);
      setCreating(false);
      loadStock(location);
    }
  };

  const total = Object.values(sizeQty).map(Number).filter(n => n > 0).reduce((a, b) => a + b, 0);

  const create = async () => {
    const sizes = Object.entries(sizeQty)
      .filter(([, q]) => Number(q) > 0)
      .map(([size_code, q]) => ({ size_code, qty: Number(q) }));
    if (!sizes.length) return alert("Enter how many pieces of each size are in this bundle.");
    if (total > selected.unbarcoded_qty) return alert(`Only ${selected.unbarcoded_qty} pcs are left without a barcode.`);
    for (const s of sizes) {
      const lim = limitFor(s.size_code);
      if (lim !== null && s.qty > lim) return alert(`Only ${lim} pcs of size ${s.size_code} are left without a barcode.`);
    }
    try {
      setCreating(true);
      const res = await createBarcode({ productid: selected.productid, Location: location, incomingheaderid: null, sizes });
      const b = res.data.barcode;
      setCreated(list => [b, ...list]);
      // keep the same design open for the next bundle if pieces are left
      const left = selected.unbarcoded_qty - total;
      const updated = {
        ...selected,
        barcoded_qty: selected.barcoded_qty + total,
        unbarcoded_qty: left,
        unbarcoded_sizes: (selected.unbarcoded_sizes || []).map(s => ({
          ...s, qty: s.qty - (sizes.find(x => x.size_code === s.size_code)?.qty || 0)
        })).filter(s => s.qty > 0)
      };
      setRows(rs => rs.map(r => r.productid === selected.productid ? updated : r));
      if (left > 0) open(updated); else setSelected(null);
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to create barcode");
    } finally {
      setCreating(false);
    }
  };

  const printOne = b => printLabels([toLabel(b, { location })]);
  const printAll = () => printLabels(created.slice().reverse().map(b => toLabel(b, { location })));

  return (
    <div style={{ padding: 18 }}>
      <h2>Create Barcode</h2>
      <p style={{ color: "#555", marginTop: -6 }}>
        For stock already in the shop. New purchases are bundled right after posting the purchase.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <label><b>Location</b>{" "}
          <select value={location} onChange={e => setLocation(e.target.value)}>
            {LOCATIONS.map(l => <option key={l}>{l}</option>)}
          </select>
        </label>
        <input placeholder="Search design / series" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
      </div>

      {created.length > 0 && (
        <div style={{ border: "1px solid #b7dfb9", background: "#f2fbf2", borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <b>Made just now ({created.length})</b>{" "}
          <button type="button" onClick={printAll} style={{ marginLeft: 8 }}>🖨 Print all labels</button>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {created.map(b => (
              <span key={b.barcode} style={{ background: "#fff", border: "1px solid #ccc", borderRadius: 14, padding: "3px 10px" }}>
                <b>{b.barcode}</b> · {b.item} · {b.sizes.map(s => `${s.size_code}${s.qty > 1 ? "×" + s.qty : ""}`).join(" ")}
                <button type="button" onClick={() => printOne(b)} style={{ marginLeft: 6 }} title="Print this label">🖨</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div style={{ border: "2px solid #4a7bd0", padding: 16, background: "#fff", borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>
            {selected.item} <span style={{ fontWeight: 400, color: "#555" }}>· {selected.seriesname} · {selected.categoryname}</span>
          </h3>
          <div style={{ marginBottom: 10, color: "#333" }}>
            Pieces at {location} without a barcode: <b>{selected.unbarcoded_qty}</b>
            {!selected.sizes_tracked && <span style={{ color: "#777" }}> (sizes not recorded for this design – enter what is in the bundle)</span>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <button type="button" onClick={() => setSizeQty(oneSet(selected))}>1 of each size</button>
            {selected.sizes_tracked && <button type="button" onClick={() => setSizeQty(allLeft(selected))}>All remaining</button>}
            <button type="button" onClick={() => setSizeQty(oneSet({ ...selected, sizes_tracked: false }))}>Clear</button>
            {selected.sizes_tracked && (
              <button type="button" disabled={creating} onClick={makeAll} style={{ marginLeft: "auto", fontWeight: 700 }}>
                {creating ? "Working…" : "⚡ Make all bundles for this design"}
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {(selected.size_choices || []).map(sz => {
              const lim = limitFor(sz);
              return (
                <div key={sz} style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700 }}>{sz}</div>
                  {lim !== null && <div style={{ fontSize: 11, color: "#777" }}>free: {lim}</div>}
                  <input type="number" min="0" max={lim ?? undefined} value={sizeQty[sz] ?? ""}
                    onChange={e => setSizeQty(p => ({ ...p, [sz]: e.target.value }))} style={{ width: 60 }} />
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, fontWeight: "bold" }}>Pieces in this bundle: {total}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="button" onClick={create} disabled={creating || total <= 0}>
              {creating ? "Creating…" : "Create barcode"}
            </button>
            <button type="button" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      {loading ? <div>Loading…</div> : (
        <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", background: "#fff" }}>
          <thead>
            <tr>
              <th>Design</th><th>Series</th><th>Stock</th><th>With barcode</th><th>Without barcode</th><th></th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan="6" align="center">No stock</td></tr>
            ) : shown.map(r => (
              <tr key={r.productid} style={selected?.productid === r.productid ? { background: "#eef3ff" } : null}>
                <td><b>{r.item}</b></td>
                <td>{r.seriesname}</td>
                <td align="right">{r.total_qty}</td>
                <td align="right">{r.barcoded_qty}</td>
                <td align="right">{r.unbarcoded_qty}</td>
                <td align="center">
                  <button type="button" disabled={r.unbarcoded_qty <= 0} onClick={() => open(r)}>Make bundle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
