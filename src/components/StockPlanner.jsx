import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

/* =====================================================
   STOCK PLANNER  (read-only)
   One table of suggested transfers: replace what a city
   sold since stock last arrived there, from a city that
   can spare it. Recalculated every time the page opens,
   so any sale, purchase or transfer shows up by itself.
===================================================== */

const CITIES = ["Jaipur", "Kolkata", "Ahmedabad"];
const SHORT = { Jaipur: "JPR", Kolkata: "CCU", Ahmedabad: "AMD" };
const ROUTES = [
  "Jaipur>Kolkata", "Jaipur>Ahmedabad",
  "Kolkata>Jaipur", "Kolkata>Ahmedabad",
  "Ahmedabad>Jaipur", "Ahmedabad>Kolkata"
];

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}

function fmtTime(v) {
  if (!v) return "";
  return new Date(v).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

// stock of one city for a suggestion (works with older backend replies too)
function stockOf(s, city) {
  if (s.stock && s.stock[city] !== undefined) return s.stock[city];
  if (s.from === city) return s.fromStock;
  if (s.to === city) return s.toStock;
  return null;
}

function designKey(item) {
  const n = parseInt(item, 10);
  return Number.isFinite(n) && String(n) === String(item).trim() ? n : String(item || "");
}

const COLUMNS = [
  { key: "item",   label: "Design",  get: s => designKey(s.item) },
  { key: "series", label: "Series",  get: s => (s.series || "").toLowerCase() },
  { key: "from",   label: "From",    get: s => s.from },
  { key: "to",     label: "To",      get: s => s.to },
  { key: "qty",    label: "Send",    get: s => s.qty, num: true },
  { key: "toSold", label: "Sold at To", get: s => s.toSold, num: true, title: "Pcs the receiving city sold since stock last arrived there" },
  { key: "since",  label: "Since",   get: s => (s.toSince ? new Date(s.toSince).getTime() : 0) },
  ...CITIES.map(c => ({ key: c, label: `${SHORT[c]} stock`, get: s => stockOf(s, c) ?? -1, num: true, city: c })),
];

const th = {
  textAlign: "left", padding: "8px 10px", fontSize: 12, color: "#444",
  background: "#f1f3f6", borderBottom: "2px solid #dde1e6", whiteSpace: "nowrap",
  position: "sticky", top: 0, cursor: "pointer", userSelect: "none", zIndex: 1
};
const td = { padding: "7px 10px", borderBottom: "1px solid #eef0f2", fontSize: 14, whiteSpace: "nowrap" };
const num = { textAlign: "right" };

export default function StockPlanner() {
  const [keep, setKeep] = useState(5);
  const [keepInput, setKeepInput] = useState("5");
  const [minSend, setMinSend] = useState("5");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [route, setRoute] = useState("ALL");
  const [sort, setSort] = useState({ key: "qty", dir: -1 });

  const load = useCallback(async (k) => {
    setLoading(true);
    setError("");
    try {
      const r = await api.get("/planner/transfers", { keep: k });
      setData(r.data);
    } catch (e) {
      setError(e?.response?.data?.error || "Could not load suggestions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(keep); }, [keep, load]);

  // apply the "keep" box after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => {
      const n = parseInt(keepInput, 10);
      if (Number.isFinite(n) && n >= 0 && n !== keep) setKeep(n);
    }, 600);
    return () => clearTimeout(t);
  }, [keepInput, keep]);

  const minQty = Math.max(0, parseInt(minSend, 10) || 0);

  const matches = useCallback((x) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return `${x.item} ${x.series || ""} ${x.category || ""}`.toLowerCase().includes(s);
  }, [q]);

  // everything that passes search + minimum, before the route filter
  const base = useMemo(
    () => (data?.suggestions || []).filter(s => s.qty >= minQty && matches(s)),
    [data, minQty, matches]
  );

  const routeTotals = useMemo(() => {
    const t = {};
    ROUTES.forEach(r => { t[r] = { n: 0, pcs: 0 }; });
    base.forEach(s => {
      const r = t[`${s.from}>${s.to}`];
      if (r) { r.n += 1; r.pcs += s.qty; }
    });
    return t;
  }, [base]);

  const rows = useMemo(() => {
    const list = base.filter(s => route === "ALL" || `${s.from}>${s.to}` === route);
    const col = COLUMNS.find(c => c.key === sort.key) || COLUMNS[4];
    return [...list].sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      if (x === y) return b.qty - a.qty;
      if (typeof x === "number" && typeof y === "number") return (x - y) * sort.dir;
      return String(x).localeCompare(String(y)) * sort.dir;
    });
  }, [base, route, sort]);

  const totalPcs = rows.reduce((a, s) => a + s.qty, 0);

  const unfilled = useMemo(
    () => (data?.unfilled || []).filter(u => u.short >= minQty && matches(u)),
    [data, minQty, matches]
  );

  const clickSort = (key) => {
    setSort(s => s.key === key ? { key, dir: -s.dir } : { key, dir: COLUMNS.find(c => c.key === key)?.num ? -1 : 1 });
  };

  return (
    <div style={{ padding: 20, maxWidth: 1200 }}>
      <h2 style={{ margin: "0 0 4px" }}>Stock Planner</h2>
      <div style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
        Suggested transfers: send what a city has sold since stock last reached it,
        from a city that can spare it. Only a guide — updates by itself after every
        sale, purchase or transfer.
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", marginBottom: 14, fontSize: 14 }}>
        <label>
          Each city keeps at least{" "}
          <input type="number" min="0" value={keepInput}
            onChange={e => setKeepInput(e.target.value)}
            style={{ width: 56, padding: "5px 6px" }} /> pcs
        </label>
        <label>
          Hide transfers below{" "}
          <input type="number" min="0" value={minSend}
            onChange={e => setMinSend(e.target.value)}
            style={{ width: 56, padding: "5px 6px" }} /> pcs
        </label>
        <input
          placeholder="Search design / series"
          value={q} onChange={e => setQ(e.target.value)}
          style={{ padding: "6px 8px", width: 200 }}
        />
        <button onClick={() => load(keep)} disabled={loading} style={{ padding: "6px 14px" }}>
          {loading ? "Calculating…" : "Refresh"}
        </button>
        {data && !loading && (
          <span style={{ fontSize: 12, color: "#888" }}>Updated {fmtTime(data.generatedAt)}</span>
        )}
      </div>

      {/* Route filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Chip active={route === "ALL"} onClick={() => setRoute("ALL")}>
          All routes · {base.reduce((a, s) => a + s.qty, 0)} pcs
        </Chip>
        {ROUTES.map(r => {
          const [f, t] = r.split(">");
          const x = routeTotals[r];
          return (
            <Chip key={r} active={route === r} muted={!x.n} onClick={() => setRoute(r)}>
              {SHORT[f]} → {SHORT[t]} · {x.pcs} pcs
            </Chip>
          );
        })}
      </div>

      {error && <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>}
      {!data && loading && <div>Calculating…</div>}

      {data && (
        <div style={{ border: "1px solid #dde1e6", borderRadius: 8, overflow: "auto", maxHeight: "70vh", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {COLUMNS.map(c => (
                  <th key={c.key} title={c.title || "Click to sort"}
                    onClick={() => clickSort(c.key)}
                    style={{ ...th, ...(c.num ? num : {}) }}>
                    {c.label}{sort.key === c.key ? (sort.dir < 0 ? " ▼" : " ▲") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={`${s.productId}-${s.from}-${s.to}-${i}`} style={{ background: i % 2 ? "#fafbfc" : "#fff" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{s.item}</td>
                  <td style={td}>{s.series}</td>
                  <td style={td}>
                    {s.from}
                    {s.origin === s.from && <span title="Made here" style={tag}>origin</span>}
                  </td>
                  <td style={td}>{s.to}</td>
                  <td style={{ ...td, ...num, fontWeight: 700, fontSize: 15 }}>{s.qty}</td>
                  <td style={{ ...td, ...num }}>{s.toSold}</td>
                  <td style={{ ...td, color: "#555" }}>{fmtDate(s.toSince)}</td>
                  {CITIES.map(c => {
                    const v = stockOf(s, c);
                    const role = c === s.from ? "from" : c === s.to ? "to" : "";
                    return (
                      <td key={c} style={{
                        ...td, ...num,
                        color: v < 0 ? "#b00020" : role ? "#111" : "#888",
                        fontWeight: role ? 600 : 400,
                        background: role === "from" ? "#eef7ee" : role === "to" ? "#eef3fd" : undefined
                      }}>
                        {v === null ? "—" : v}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={COLUMNS.length} style={{ ...td, color: "#666", padding: 16 }}>
                  No transfers to suggest{q ? " for this search" : ""} right now.
                </td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td style={{ ...td, fontWeight: 600 }} colSpan={4}>{rows.length} design{rows.length === 1 ? "" : "s"}</td>
                  <td style={{ ...td, ...num, fontWeight: 700 }}>{totalPcs}</td>
                  <td colSpan={COLUMNS.length - 5} style={td}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {data && (
        <div style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
          Green = sending city, blue = receiving city. Click a column heading to sort.
        </div>
      )}

      {data && route === "ALL" && unfilled.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Selling, but no city can spare more
            <span style={{ fontWeight: 400, color: "#666", marginLeft: 8, fontSize: 13 }}>
              (other cities are at or below {keep} pcs — consider making more)
            </span>
          </div>
          <div style={{ border: "1px solid #f0d9b5", borderRadius: 8, overflow: "auto", maxHeight: "50vh", background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Design", "Series", "City", "Still short", "Sold", "Since", "Made in", "JPR stock", "CCU stock", "AMD stock"].map((h, i) => (
                    <th key={h} style={{ ...th, cursor: "default", background: "#fff4e5", ...(i === 3 || i === 4 || i > 6 ? num : {}) }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unfilled.map((u, i) => (
                  <tr key={`${u.productId}-${u.city}-${i}`}>
                    <td style={{ ...td, fontWeight: 600 }}>{u.item}</td>
                    <td style={td}>{u.series}</td>
                    <td style={td}>{u.city}</td>
                    <td style={{ ...td, ...num, fontWeight: 700 }}>{u.short}</td>
                    <td style={{ ...td, ...num }}>{u.sold}</td>
                    <td style={{ ...td, color: "#555" }}>{fmtDate(u.since)}</td>
                    <td style={td}>{u.origin || "—"}</td>
                    {CITIES.map(c => (
                      <td key={c} style={{ ...td, ...num, color: u.stock[c] < 0 ? "#b00020" : undefined }}>{u.stock[c]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const tag = {
  marginLeft: 6, fontSize: 10, fontWeight: 500, color: "#2a6",
  border: "1px solid #2a6", borderRadius: 4, padding: "0 4px", verticalAlign: "middle"
};

function Chip({ active, muted, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px", borderRadius: 16, cursor: "pointer", fontSize: 13,
        border: active ? "1px solid #1a5fd0" : "1px solid #ccd",
        background: active ? "#1a5fd0" : "#fff",
        color: active ? "#fff" : muted ? "#999" : "#222"
      }}
    >
      {children}
    </button>
  );
}
