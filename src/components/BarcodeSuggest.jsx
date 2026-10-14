import React, { useEffect, useRef, useState } from "react";
import { api } from "../services/api";

// ==========================================================
// BARCODE BOX WITH SUGGESTIONS
// Type part of a number ("340") → a list of matching bundles appears;
// pick one with the mouse, or ↑ ↓ and Enter.
// A USB scanner still works as before: it types the full code + Enter,
// and Enter without picking from the list uses exactly what was typed.
//
// props: value, onChange(text), onSubmit(code), location (only that office),
//        all (include sold bundles), exclude (codes to hide), inputRef,
//        placeholder, disabled, style
// ==========================================================

const key = v => {
  const s = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = s.match(/^[A-Z]{0,3}(\d+)$/);
  return m ? m[1] : s;
};

export default function BarcodeSuggest({
  value, onChange, onSubmit, location, all = false, exclude = [],
  inputRef, placeholder, disabled, style
}) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);          // highlighted row (-1 = none)
  const ownRef = useRef(null);
  const ref = inputRef || ownRef;
  const asked = useRef(0);

  useEffect(() => {
    const q = String(value || "").trim();
    if (q.replace(/[^A-Za-z0-9]/g, "").length < 2) { setList([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      const n = ++asked.current;
      try {
        const params = { q, limit: 12 };
        if (location) params.location = location;
        if (all) params.all = "1";
        const r = await api.get("/barcode/search", params);
        if (n !== asked.current) return;                 // an older answer – ignore
        const skip = new Set(exclude.map(key));
        setList((r.data?.rows || []).filter(x => !skip.has(key(x.barcode))));
        setHi(-1);
        setOpen(true);
      } catch {
        setList([]);
      }
    }, 250);
    return () => clearTimeout(t);
    // exclude changes with every voucher row; the typed text is what matters
  }, [value, location, all]);

  const pick = code => {
    setOpen(false); setList([]); setHi(-1);
    onSubmit(code);
  };

  const onKeyDown = e => {
    if (e.key === "ArrowDown" && open && list.length) {
      e.preventDefault(); setHi(h => Math.min(list.length - 1, h + 1));
    } else if (e.key === "ArrowUp" && open && list.length) {
      e.preventDefault(); setHi(h => Math.max(-1, h - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = open && hi >= 0 ? list[hi]?.barcode : null;
      asked.current++;                                  // drop any answer still on its way
      setOpen(false); setList([]); setHi(-1);
      onSubmit(chosen || String(value || "").trim());
    }
  };

  const sizesText = sz => (sz || []).map(s => `${s.size_code}${Number(s.qty) > 1 ? "×" + s.qty : ""}`).join(" ");

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <input
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => { if (list.length) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        style={style}
      />
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 50, minWidth: "100%", width: 430,
          maxHeight: 330, overflowY: "auto", background: "#fff", border: "1px solid #9bb3e0",
          borderRadius: 6, boxShadow: "0 4px 14px #0002", marginTop: 2
        }}>
          {list.length === 0 ? (
            <div style={{ padding: "8px 10px", color: "#777" }}>
              No {all ? "" : "available "}bundle starts with “{value}”{location && !all ? ` at ${location}` : ""}
            </div>
          ) : list.map((b, i) => (
            <div
              key={b.barcode}
              onMouseDown={e => { e.preventDefault(); pick(b.barcode); }}
              onMouseEnter={() => setHi(i)}
              style={{
                padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #eee",
                background: i === hi ? "#e3ecff" : "#fff", color: b.is_active ? "#000" : "#999",
                display: "flex", gap: 10, alignItems: "baseline"
              }}
            >
              <b style={{ minWidth: 78 }}>{b.barcode}</b>
              <span style={{ minWidth: 90 }}><b>{b.item}</b> {b.seriesname}</span>
              <span style={{ color: b.is_active ? "#444" : "#999", fontSize: 13 }}>
                {b.is_active ? `${sizesText(b.sizes)} · ${b.total} pcs` : "sold"}
                {all && b.location ? ` · ${b.location}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
