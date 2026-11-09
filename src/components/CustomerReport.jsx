import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";

// ==========================================================
// REPORT: what went to one customer
// Pick a customer → designs and pieces with dates.
//   Latest first : every design on every bill, newest bill on top
//   Cumulative   : one line per design – total pieces, times sent,
//                  first and last date
// Designs and pieces only (no rates).
// ==========================================================

const fmtDate = v => {
  const d = new Date(v);
  return isNaN(d) ? "" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const n = v => Number(v || 0).toLocaleString("en-IN");

export default function CustomerReport() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [openList, setOpenList] = useState(false);
  const [customer, setCustomer] = useState(null);     // { CustomerID, CustomerName }
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState("latest");         // "latest" | "cumulative"
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [designFilter, setDesignFilter] = useState("");
  const [sort, setSort] = useState({ by: "qty", dir: "desc" });   // cumulative view
  const boxRef = useRef(null);

  useEffect(() => {
    api.get("/customers")
      .then(r => setCustomers(r.data || []))
      .catch(() => setCustomers([]));
  }, []);

  // close the customer list when clicking elsewhere
  useEffect(() => {
    const off = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpenList(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, []);

  useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (from) params.from = from;
        if (to) params.to = to;
        const r = await api.get(`/reports/customer/${customer.CustomerID}`, params);
        if (!cancelled) setRows(r.data?.rows || []);
      } catch (e) {
        if (!cancelled) { setRows([]); setError(e?.response?.data?.error || "Could not load the report"); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customer, from, to]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers.slice(0, 30);
    return customers.filter(c => String(c.CustomerName || "").toLowerCase().includes(q)).slice(0, 30);
  }, [customers, search]);

  const shown = useMemo(() => {
    const q = designFilter.trim().toLowerCase();
    return q ? rows.filter(r => `${r.Item} ${r.Series || ""}`.toLowerCase().includes(q)) : rows;
  }, [rows, designFilter]);

  const totals = useMemo(() => ({
    bills: new Set(shown.map(r => r.SalesID)).size,
    pcs: shown.reduce((a, r) => a + Number(r.Qty || 0), 0),
    designs: new Set(shown.map(r => `${r.Item}|${r.Series}`)).size
  }), [shown]);

  // one line per design
  const cumulative = useMemo(() => {
    const map = new Map();
    for (const r of shown) {
      const key = `${r.Item}|${r.Series || ""}`;
      const x = map.get(key) || { Item: r.Item, Series: r.Series, Category: r.Category, qty: 0, bills: new Set(), first: null, last: null };
      x.qty += Number(r.Qty || 0);
      x.bills.add(r.SalesID);
      const d = new Date(r.Date);
      if (!x.first || d < x.first) x.first = d;
      if (!x.last || d > x.last) x.last = d;
      map.set(key, x);
    }
    const list = [...map.values()].map(x => ({ ...x, times: x.bills.size }));
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = x => ({ item: x.Item, series: x.Series || "", qty: x.qty, times: x.times, first: x.first, last: x.last })[sort.by];
    return list.sort((a, b) => {
      const p = val(a), q = val(b);
      const c = p instanceof Date ? p - q : typeof p === "number" ? p - q : String(p).localeCompare(String(q), undefined, { numeric: true });
      return c * dir || String(a.Item).localeCompare(String(b.Item), undefined, { numeric: true });
    });
  }, [shown, sort]);

  const sortBy = by => setSort(s => ({ by, dir: s.by === by && s.dir === "desc" ? "asc" : "desc" }));
  const arrow = by => (sort.by === by ? (sort.dir === "desc" ? " ▼" : " ▲") : "");

  const pick = c => {
    setCustomer(c);
    setSearch(c.CustomerName);
    setOpenList(false);
    setDesignFilter("");
  };

  const btn = active => ({
    padding: "5px 12px", border: "1px solid #4a6fb5", cursor: "pointer",
    background: active ? "#4a6fb5" : "#fff", color: active ? "#fff" : "#4a6fb5", fontWeight: 600
  });
  const th = { cursor: "pointer", whiteSpace: "nowrap" };

  return (
    <div style={{ padding: 16 }}>
      <h3>Customer Report</h3>

      {/* choose customer + dates */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <div ref={boxRef} style={{ position: "relative" }}>
          <div style={{ fontSize: 12, color: "#555" }}>Customer</div>
          <input
            value={search}
            placeholder="Type customer name"
            onChange={e => { setSearch(e.target.value); setOpenList(true); }}
            onFocus={() => setOpenList(true)}
            onKeyDown={e => { if (e.key === "Enter" && matches[0]) pick(matches[0]); }}
            style={{ width: 280, padding: "5px 8px", fontSize: 15 }}
          />
          {openList && (
            <div style={{
              position: "absolute", top: "100%", left: 0, zIndex: 20, width: 320, maxHeight: 300, overflowY: "auto",
              background: "#fff", border: "1px solid #9bb3e0", borderRadius: 6, boxShadow: "0 4px 14px #0002"
            }}>
              {matches.length === 0
                ? <div style={{ padding: 8, color: "#777" }}>No customer found</div>
                : matches.map(c => (
                  <div key={c.CustomerID}
                    onMouseDown={e => { e.preventDefault(); pick(c); }}
                    style={{ padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #eee",
                             background: customer?.CustomerID === c.CustomerID ? "#eef3ff" : "#fff" }}>
                    {c.CustomerName}
                  </div>
                ))}
            </div>
          )}
        </div>

        <label>
          <div style={{ fontSize: 12, color: "#555" }}>From</div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </label>
        <label>
          <div style={{ fontSize: 12, color: "#555" }}>To</div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </label>
        {(from || to) && <button type="button" onClick={() => { setFrom(""); setTo(""); }}>All dates</button>}
      </div>

      {!customer && <div style={{ color: "#777" }}>Choose a customer to see what was sent to them.</div>}

      {customer && (
        <>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <div>
              <button type="button" style={{ ...btn(view === "latest"), borderRadius: "6px 0 0 6px" }} onClick={() => setView("latest")}>
                Latest first
              </button>
              <button type="button" style={{ ...btn(view === "cumulative"), borderRadius: "0 6px 6px 0", borderLeft: 0 }} onClick={() => setView("cumulative")}>
                Cumulative
              </button>
            </div>
            <input
              value={designFilter}
              placeholder="Find design / series"
              onChange={e => setDesignFilter(e.target.value)}
              style={{ width: 170 }}
            />
            {!loading && (
              <span style={{ color: "#333" }}>
                <b>{customer.CustomerName}</b>: {totals.bills} bill{totals.bills === 1 ? "" : "s"} · {n(totals.pcs)} pcs · {totals.designs} design{totals.designs === 1 ? "" : "s"}
                {(from || to) && <span style={{ color: "#777" }}> ({from ? fmtDate(from) : "start"} – {to ? fmtDate(to) : "today"})</span>}
              </span>
            )}
          </div>

          {loading && <div>Loading…</div>}
          {error && <div style={{ color: "#c62828", fontWeight: 600 }}>⚠ {error}</div>}
          {!loading && !error && shown.length === 0 && <div style={{ color: "#777" }}>Nothing sent{(from || to) ? " in these dates" : " yet"}.</div>}

          {!loading && shown.length > 0 && view === "latest" && (
            <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", background: "#fff" }}>
              <thead>
                <tr style={{ background: "#f3f6fb" }}>
                  <th>Date</th><th>Bill</th><th>Office</th><th>Design</th><th>Series</th><th>Category</th><th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => {
                  const newBill = i === 0 || shown[i - 1].SalesID !== r.SalesID;
                  return (
                    <tr key={`${r.SalesID}-${r.Item}-${r.Series}-${i}`} style={newBill && i > 0 ? { borderTop: "3px solid #9bb3e0" } : null}>
                      <td style={{ whiteSpace: "nowrap" }}>{newBill ? fmtDate(r.Date) : ""}</td>
                      <td>{newBill ? (r.VoucherNo || `#${r.SalesID}`) : ""}</td>
                      <td>{newBill ? r.Location : ""}</td>
                      <td><b>{r.Item}</b></td>
                      <td>{r.Series}</td>
                      <td>{r.Category}</td>
                      <td align="right">{n(r.Qty)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!loading && shown.length > 0 && view === "cumulative" && (
            <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", background: "#fff" }}>
              <thead>
                <tr style={{ background: "#f3f6fb" }}>
                  <th style={th} onClick={() => sortBy("item")}>Design{arrow("item")}</th>
                  <th style={th} onClick={() => sortBy("series")}>Series{arrow("series")}</th>
                  <th>Category</th>
                  <th style={th} onClick={() => sortBy("qty")}>Total Qty{arrow("qty")}</th>
                  <th style={th} onClick={() => sortBy("times")}>Times sent{arrow("times")}</th>
                  <th style={th} onClick={() => sortBy("first")}>First sent{arrow("first")}</th>
                  <th style={th} onClick={() => sortBy("last")}>Last sent{arrow("last")}</th>
                </tr>
              </thead>
              <tbody>
                {cumulative.map(x => (
                  <tr key={`${x.Item}|${x.Series}`}>
                    <td><b>{x.Item}</b></td>
                    <td>{x.Series}</td>
                    <td>{x.Category}</td>
                    <td align="right"><b>{n(x.qty)}</b></td>
                    <td align="right">{x.times}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(x.first)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(x.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
