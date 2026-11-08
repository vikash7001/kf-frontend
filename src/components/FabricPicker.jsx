import React, { useEffect, useRef, useState } from "react";
import { api } from "../services/api";

// ==========================================================
// FABRIC DROPDOWN – one shared list, always in CAPITALS.
// Pick an existing fabric, or "➕ Add new fabric…" and type it.
// Choosing saves straight away (only the fabric changes: no
// photo change, no notification, no leads).
//
// props: productId, value, onSaved(newFabric), disabled, style
// ==========================================================

export const cleanFabric = v => String(v ?? "").toUpperCase().replace(/\s+/g, " ").trim();

// shared list for every picker on the page
let fabricList = null;
let loading = null;
const listeners = new Set();
const tell = () => listeners.forEach(fn => fn(fabricList || []));

export function loadFabrics(force = false) {
  if (fabricList && !force) return Promise.resolve(fabricList);
  if (!loading || force) {
    loading = api.get("/fabrics")
      .then(r => { fabricList = (r.data || []).map(cleanFabric).filter(Boolean); tell(); return fabricList; })
      .catch(() => { fabricList = fabricList || []; tell(); return fabricList; })
      .finally(() => { loading = null; });
  }
  return loading;
}
function addFabric(f) {
  if (!f) return;
  fabricList = [...new Set([...(fabricList || []), f])].sort();
  tell();
}
export function useFabrics() {
  const [list, setList] = useState(fabricList || []);
  useEffect(() => {
    listeners.add(setList);
    loadFabrics();
    return () => listeners.delete(setList);
  }, []);
  return list;
}

export default function FabricPicker({ productId, value, onSaved, disabled, style }) {
  const list = useFabrics();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);
  const current = cleanFabric(value);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  async function save(next) {
    next = cleanFabric(next);
    if (next === current) return;
    setSaving(true);
    setErr("");
    try {
      const r = await api.post("/image/fabric", { ProductID: productId, Fabric: next });
      const saved = cleanFabric(r.data?.Fabric ?? next);
      addFabric(saved);
      onSaved && onSaved(saved);
    } catch (e) {
      setErr(e?.response?.data?.error || "Not saved");
    } finally {
      setSaving(false);
    }
  }

  function confirmNew() {
    const f = cleanFabric(text);
    setAdding(false);
    setText("");
    if (!f) return;
    // "rayon" typed while "RAYON" exists → use the existing one
    const existing = list.find(x => x === f);
    save(existing || f);
  }

  if (adding) {
    return (
      <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
        <input
          ref={inputRef}
          value={text}
          placeholder="NEW FABRIC"
          maxLength={40}
          onChange={e => setText(e.target.value.toUpperCase())}
          onKeyDown={e => {
            if (e.key === "Enter") confirmNew();
            if (e.key === "Escape") { setAdding(false); setText(""); }
          }}
          style={{ width: 110, textTransform: "uppercase", ...style }}
        />
        <button type="button" onClick={confirmNew} title="Save">✓</button>
        <button type="button" onClick={() => { setAdding(false); setText(""); }} title="Cancel">✕</button>
      </span>
    );
  }

  // the saved value is always in the list, even before the list loads
  const options = [...new Set([...(current ? [current] : []), ...list])].sort();

  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      <select
        value={current}
        disabled={disabled || saving}
        onChange={e => {
          if (e.target.value === "__add") setAdding(true);
          else save(e.target.value);
        }}
        style={{ maxWidth: 150, ...style }}
        title={err || undefined}
      >
        <option value="">—</option>
        {options.map(f => <option key={f} value={f}>{f}</option>)}
        <option value="__add">➕ Add new fabric…</option>
      </select>
      {saving && <span style={{ fontSize: 12, color: "#777" }}>…</span>}
      {err && <span style={{ fontSize: 12, color: "#c62828" }} title={err}>⚠</span>}
    </span>
  );
}
