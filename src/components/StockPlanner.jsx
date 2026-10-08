import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

/* =====================================================
   STOCK PLANNER  (read-only)
   Suggests what to send where: replace what a city sold
   since stock last arrived there, from a city that can
   spare it. Recalculated every time the page is opened,
   so any sale, purchase or transfer shows up by itself.
===================================================== */

const SHORT = { Jaipur: "JPR", Kolkata: "CCU", Ahmedabad: "AMD" };
const ROUTE_ORDER = [
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

const box = {
  background: "#fff", border: "1px solid #e3e6ea", borderRadius: 8,
  marginBottom: 16, overflow: "hidden"
};
const th = {
  textAlign: "left", padding: "8px 10px", fontSize: 12, color: "#555",
  background: "#f6f7f9", borderBottom: "1px solid #e3e6ea", whiteSpace: "nowrap"
};
const td = { padding: "8px 10px", borderBottom: "1px solid #f0f1f3", fontSize: 14, verticalAlign: "top" };

export default function StockPlanner() {
  const [keep, setKeep] = useState(5);
  const [keepInput, setKeepInput] = useState("5");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [route, setRoute] = useState("ALL");

  const load = useCallback(async (k) => {
    setLoading(true);
    setError("");
    try {
      const r = await api.get("/planner/transfers", { params: { keep: k } });
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

  const matches = useCallback((x) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return `${x.item} ${x.series || ""} ${x.category || ""}`.toLowerCase().includes(s);
  }, [q]);

  const groups = useMemo(() => {
    const g = {};
    ROUTE_ORDER.forEach(k => { g[k] = []; });
    (data?.suggestions || []).forEach(s => {
      const k = `${s.from}>${s.to}`;
      (g[k] = g[k] || []).push(s);
    });
    return g;
  }, [data]);

  const unfilled = useMemo(
    () => (data?.unfilled || []).filter(matches),
    [data, matches]
  );

  const shownRoutes = ROUTE_ORDER.filter(k => route === "ALL" || route === k);

  return (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <h2 style={{ margin: "0 0 4px" }}>Stock Planner</h2>
      <div style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
        Suggested transfers: send what a city has sold since stock last reached it,
        from a city that can spare it. Only a guide — updates by itself after every
        sale, purchase or transfer.
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <label style={{ fontSize: 14 }}>
          Each city keeps at least{" "}
          <input
            type="number" min="0" value={keepInput}
            onChange={e => setKeepInput(e.target.value)}
            style={{ width: 60, padding: "5px 6px" }}
          />{" "}pcs
        </label>
        <input
          placeholder="Search design / series"
          value={q} onChange={e => setQ(e.target.value)}
          style={{ padding: "6px 8px", width: 220 }}
        />
        <button onClick={() => load(keep)} disabled={loading} style={{ padding: "6px 14px" }}>
          {loading ? "Calculating…" : "Refresh"}
        </button>
        {data && !loading && (
          <span style={{ fontSize: 12, color: "#888" }}>Updated {fmtTime(data.generatedAt)}</span>
        )}
      </div>

      {/* Route chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <Chip active={route === "ALL"} onClick={() => setRoute("ALL")}>All routes</Chip>
        {ROUTE_ORDER.map(k => {
          const list = (groups[k] || []).filter(matches);
          const pcs = list.reduce((a, s) => a + s.qty, 0);
          const [f, t] = k.split(">");
          return (
            <Chip key={k} active={route === k} muted={!list.length} onClick={() => setRoute(k)}>
              {SHORT[f]} → {SHORT[t]} · {pcs} pcs
            </Chip>
          );
        })}
      </div>

      {error && <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>}
      {!data && loading && <div>Calculating…</div>}

      {data && shownRoutes.map(k => {
        const list = (groups[k] || []).filter(matches);
        if (!list.length) return null;
        const [from, to] = k.split(">");
        const pcs = list.reduce((a, s) => a + s.qty, 0);
        return (
          <div key={k} style={box}>
            <div style={{ padding: "10px 12px", fontWeight: 600, background: "#eef4ff" }}>
              {from} → {to}
              <span style={{ fontWeight: 400, color: "#555", marginLeft: 8 }}>
                {list.length} design{list.length === 1 ? "" : "s"} · {pcs} pcs
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Design</th>
                    <th style={th}>Series</th>
                    <th style={{ ...th, textAlign: "right" }}>Send</th>
                    <th style={th}>Why</th>
                    <th style={{ ...th, textAlign: "right" }}>{from} has</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s, i) => (
                    <tr key={`${s.productId}-${i}`}>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {s.item}
                        {s.origin === from && <span title="Made here" style={tag}>origin</span>}
                      </td>
                      <td style={td}>{s.series}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700, fontSize: 16 }}>{s.qty}</td>
                      <td style={{ ...td, color: "#444" }}>
                        {to} sold <b>{s.toSold}</b>
                        {s.toSince ? ` since stock arrived ${fmtDate(s.toSince)}` : ""}
                        {" · "}has {s.toStock} left
                        {s.fromSold > 0 ? ` · ${from} sold ${s.fromSold}` : ""}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>{s.fromStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {data && shownRoutes.every(k => !(groups[k] || []).filter(matches).length) && (
        <div style={{ ...box, padding: 16, color: "#555" }}>
          No transfers to suggest{q ? " for this search" : ""} right now.
        </div>
      )}

      {data && route === "ALL" && unfilled.length > 0 && (
        <div style={{ ...box, marginTop: 24 }}>
          <div style={{ padding: "10px 12px", fontWeight: 600, background: "#fff4e5" }}>
            Selling, but no city can spare more
            <span style={{ fontWeight: 400, color: "#555", marginLeft: 8 }}>
              (other cities are at or below {keep} pcs — consider making more)
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Design</th>
                  <th style={th}>Series</th>
                  <th style={th}>City</th>
                  <th style={{ ...th, textAlign: "right" }}>Still short</th>
                  <th style={th}>Why</th>
                  <th style={th}>Stock JPR / CCU / AMD</th>
                </tr>
              </thead>
              <tbody>
                {unfilled.map((u, i) => (
                  <tr key={`${u.productId}-${u.city}-${i}`}>
                    <td style={{ ...td, fontWeight: 600 }}>{u.item}</td>
                    <td style={td}>{u.series}</td>
                    <td style={td}>{u.city}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{u.short}</td>
                    <td style={{ ...td, color: "#444" }}>
                      sold {u.sold}{u.since ? ` since ${fmtDate(u.since)}` : ""}
                      {u.origin ? ` · made in ${u.origin}` : ""}
                    </td>
                    <td style={td}>
                      {u.stock.Jaipur} / {u.stock.Kolkata} / {u.stock.Ahmedabad}
                    </td>
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
