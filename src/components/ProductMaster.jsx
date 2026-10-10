import React, { useEffect, useState } from "react";
import { api } from "../services/api";

// Same size list as Online Enablement
const ALL_SIZES = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "N/A"];
const LAST_SIZES_KEY = "kf_last_online_sizes";

function lastSizes() {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_SIZES_KEY));
    return Array.isArray(v) && v.length ? v : ["M", "L", "XL", "XXL", "3XL"];
  } catch {
    return ["M", "L", "XL", "XXL", "3XL"];
  }
}

export default function ProductMaster({ onExit }) {
  const [item, setItem] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [origin, setOrigin] = useState("");
const [totalPcs, setTotalPcs] = useState("");
  const [seriesList, setSeriesList] = useState([]);
  const [list, setList] = useState([]);
  const [lastCreated, setLastCreated] = useState("");
  const [editingId, setEditingId] = useState(null);

  // "Sell online?" box shown right after a new design is created
  const [onlineBox, setOnlineBox] = useState(null);   // { productid, item, series }
  const [onlineOn, setOnlineOn] = useState(true);
  const [onlineSizes, setOnlineSizes] = useState([]);
  const [onlineSaving, setOnlineSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const s = await api.get("/series");
    const p = await api.get("/products");
    setSeriesList(s.data || []);

    setList(p.data || []);
  };

  const onSeriesChange = (val) => {
    setSeriesName(val);
    const s = seriesList.find(x => x.SeriesName === val);
    setCategoryName(s?.CategoryName || "");
  };

const save = async () => {
  if (!item || !seriesName || !categoryName || !origin) {
    alert("Item, Series, Category and Origin required");
    return;
  }

  const payload = {
    Item: item,
    SeriesName: seriesName,
    CategoryName: categoryName,
    Origin: origin,
    TotalPcs: totalPcs
  };

  if (editingId) {
    await api.put("/products", {
      ProductID: editingId,
      ...payload
    });
  } else {
    const r = await api.post("/products", payload);
    setLastCreated(item);
    if (r.data?.ProductID) {
      setOnlineBox({ productid: r.data.ProductID, item, series: seriesName });
      setOnlineOn(true);
      setOnlineSizes(lastSizes());
    }
  }

  setItem("");
  setSeriesName("");
  setCategoryName("");
  setOrigin("");
  setTotalPcs("");
  setEditingId(null);

  load();
};
  const toggleSize = sz =>
    setOnlineSizes(prev => prev.includes(sz) ? prev.filter(x => x !== sz) : [...prev, sz]);

  const saveOnline = async () => {
    if (!onlineBox) return;
    if (onlineOn && onlineSizes.length === 0) {
      alert("Select at least one size, or switch off online selling");
      return;
    }
    setOnlineSaving(true);
    try {
      const sizes = ALL_SIZES.filter(sz => onlineSizes.includes(sz));   // keep size order
      await api.post("/online/allocation/save", {
        productid: onlineBox.productid,
        is_online: onlineOn,
        enabledSizes: onlineOn ? sizes : [],
        allocations: []      // quantities per location are set once stock arrives
      });
      if (onlineOn) {
        try { localStorage.setItem(LAST_SIZES_KEY, JSON.stringify(sizes)); } catch {}
      }
      setOnlineBox(null);
    } catch (e) {
      alert(e.response?.data?.error || "Could not save online settings");
    } finally {
      setOnlineSaving(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>Product Master</h3>

      {onlineBox && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
          display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80
        }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: 20, width: 460, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <h3 style={{ marginTop: 0 }}>
              {onlineBox.item} · {onlineBox.series}
            </h3>
            <div style={{ color: "#555", marginBottom: 12 }}>Design created. Sell it online?</div>

            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
              <input type="checkbox" checked={onlineOn} onChange={e => setOnlineOn(e.target.checked)} />
              Enable for online
            </label>

            {onlineOn && (
              <>
                <div style={{ marginTop: 14, fontWeight: 600 }}>Sizes</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {ALL_SIZES.map(sz => (
                    <label key={sz} style={{
                      border: "1px solid " + (onlineSizes.includes(sz) ? "#1a5fd0" : "#ccd"),
                      background: onlineSizes.includes(sz) ? "#e8f0fe" : "#fff",
                      borderRadius: 6, padding: "4px 10px", cursor: "pointer"
                    }}>
                      <input type="checkbox" checked={onlineSizes.includes(sz)} onChange={() => toggleSize(sz)}
                             style={{ marginRight: 4 }} />
                      {sz}
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#777", marginTop: 10 }}>
                  Quantities per location (Jaipur / Kolkata / Ahmedabad) can only be set once stock
                  arrives – do that later in Online Enablement. Your size choice is remembered for the next design.
                </div>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button onClick={() => setOnlineBox(null)} disabled={onlineSaving}>Skip</button>
              <button onClick={saveOnline} disabled={onlineSaving}
                      style={{ background: "#1a5fd0", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px" }}>
                {onlineSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        placeholder="Item"
        value={item}
        onChange={e => setItem(e.target.value)}
      />

      <select
        value={seriesName}
        onChange={e => onSeriesChange(e.target.value)}
      >
        <option value="">Select Series</option>
        {seriesList.map(s => (
          <option key={s.SeriesName} value={s.SeriesName}>
            {s.SeriesName}
          </option>
        ))}
      </select>

      <input
        value={categoryName}
        readOnly
        placeholder="Category"
        style={{ background: "#f0f0f0" }}
      />

      {/* ORIGIN DROPDOWN */}
      <select
        value={origin}
        onChange={e => setOrigin(e.target.value)}
      >
        <option value="">Select Origin</option>
        <option value="Jaipur">Jaipur</option>
        <option value="Kolkata">Kolkata</option>
        <option value="Ahmedabad">Ahmedabad</option>
      </select>
<input
  type="number"
  placeholder="Total PCS"
  value={totalPcs}
  onChange={e => setTotalPcs(e.target.value)}
  style={{ width: 120, marginLeft: 8 }}
/>
      <br /><br />

      <button onClick={save}>
  {editingId ? "Update" : "Save"}
</button>
      <button onClick={onExit} style={{ marginLeft: 8 }}>Back</button>

      {lastCreated && (
        <span style={{ marginLeft: 16, fontWeight: "bold" }}>
          Last Created: {lastCreated}
        </span>
      )}

      <hr />

      <ul>
        {list.map(p => (
          <li key={p.ProductID}>
  {p.Item} ({p.SeriesName}) - {p.Origin} - PCS: {p.TotalPcs || 0}

  <button
    style={{ marginLeft: 8 }}
    onClick={() => {
      setEditingId(p.ProductID);
      setItem(p.Item || "");
      setSeriesName(p.SeriesName || "");
      setCategoryName(p.CategoryName || "");
      setOrigin(p.Origin || "");
      setTotalPcs(p.TotalPcs || "");
    }}
  >
    Edit
  </button>
</li>
        ))}
      </ul>
    </div>
  );
}
