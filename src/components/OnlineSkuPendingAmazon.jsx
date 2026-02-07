import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function OnlineSkuPendingAmazon({ onExit }) {
  const [pending, setPending] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [productid, setProductid] = useState("");
  const [size, setSize] = useState("");

  // -----------------------------
  // LOAD PENDING AMAZON SKUs
  // -----------------------------
  useEffect(() => {
    async function load() {
      const p = await api.get("/online/sku/pending/AMAZON");
      setPending(p.data || []);

      const d = await api.get("/online/config");
      setDesigns(d.data || []);
    }

    load().catch(() => alert("Failed to load pending SKUs"));
  }, []);

  // -----------------------------
  // CONFIRM SKU
  // -----------------------------
  const confirmSku = async () => {
    if (!selected || !productid || !size) {
      alert("Select design and size");
      return;
    }

    await api.post("/online/sku/confirm", {
      pending_id: selected.id,
      marketplace: "AMAZON",
      productid,
      size_code: size
    });

    alert("SKU mapped successfully");

    setPending(pending.filter(p => p.id !== selected.id));
    setSelected(null);
    setProductid("");
    setSize("");
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div style={{ padding: 20, display: "flex", gap: 20 }}>
      {/* LEFT: PENDING SKU LIST */}
      <div style={{ width: 320 }}>
        <h3>Pending Amazon SKUs</h3>
        {pending.map(p => (
          <div
            key={p.id}
            onClick={() => setSelected(p)}
            style={{
              padding: 6,
              cursor: "pointer",
              background:
                selected?.id === p.id ? "#fee" : "#fff",
              borderBottom: "1px solid #ddd"
            }}
          >
            <b>{p.sku_code}</b>
            <div style={{ fontSize: 12 }}>{p.name}</div>
          </div>
        ))}
      </div>

      {/* RIGHT: MAP SKU */}
      {selected && (
        <div style={{ flex: 1 }}>
          <h3>Map Amazon SKU</h3>

          <p>
            <b>SKU:</b> {selected.sku_code}<br />
            <b>ASIN:</b> {selected.asin}
          </p>

          {/* DESIGN SELECT */}
          <div style={{ marginBottom: 8 }}>
            <label>Design</label><br />
            <select
              value={productid}
              onChange={e => setProductid(e.target.value)}
            >
              <option value="">-- Select Design --</option>
              {designs.map(d => (
                <option key={d.productid} value={d.productid}>
                  {d.productid} — {d.item}
                </option>
              ))}
            </select>
          </div>

          {/* SIZE INPUT */}
          <div style={{ marginBottom: 8 }}>
            <label>Size</label><br />
            <input
              value={size}
              placeholder="M / L / FREE"
              onChange={e => setSize(e.target.value.toUpperCase())}
            />
          </div>

          <button onClick={confirmSku}>
            Confirm Mapping
          </button>

          <button onClick={onExit} style={{ marginLeft: 8 }}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}
