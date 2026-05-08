import React, { useEffect, useState } from "react";
import { api } from "../services/api";

/**
 * Generic Marketplace SKU Manager
 * Custom labels implemented for karnifashion.com
 */
export default function OnlineSkuManager({ marketplace = "karnifashion.com", onExit }) {
  const [designs, setDesigns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [skuMap, setSkuMap] = useState({});

  // --------------------------------
  // LOAD ONLINE-ENABLED DESIGNS
  // --------------------------------
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/online/config");
        const rows = res.data || [];

        const map = {};
        rows.forEach(r => {
          if (!r.is_online || !r.size_code) return;

          if (!map[r.productid]) {
            map[r.productid] = {
              productid: r.productid,
              item: r.item,
              sizes: []
            };
          }

          if (!map[r.productid].sizes.includes(r.size_code)) {
            map[r.productid].sizes.push(r.size_code);
          }
        });

        setDesigns(Object.values(map));
      } catch (err) {
        console.error("Failed to load designs", err);
      }
    }
    load();
  }, []);

  // --------------------------------
  // LOAD EXISTING SKU MAPPINGS
  // --------------------------------
  useEffect(() => {
    async function loadSkus() {
      try {
        const res = await api.get(`/online/skus?marketplace=${marketplace}`);
        const existing = res.data || [];
        const m = {};
        existing.forEach(s => {
          m[`${s.productid}_${s.size_code}`] = s.sku_code;
        });
        setSkuMap(m);
      } catch (err) {
        console.error("Failed to load SKUs", err);
      }
    }
    loadSkus();
  }, [marketplace]);

  const setSku = (pid, size, val) => {
    setSkuMap(prev => ({ ...prev, [`${pid}_${size}`]: val }));
  };

  const onSave = async () => {
    if (!selected) return;
    try {
      const payload = selected.sizes.map(sz => ({
        productid: selected.productid,
        size_code: sz,
        marketplace: marketplace,
        sku_code: skuMap[`${selected.productid}_${sz}`] || ""
      }));

      await api.post("/online/skus/bulk", { mappings: payload });
      alert(`${marketplace} SKUs updated successfully!`);
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  };

  return (
    <div style={{ display: "flex", gap: 20, padding: 20 }}>
      {/* LEFT: DESIGN LIST */}
      <div style={{ width: 300, borderRight: "1px solid #ccc", pr: 20 }}>
        <h2>Online Products</h2>
        <p style={{ fontSize: '0.8em', color: '#666' }}>Select a product to map {marketplace} SKUs</p>
        {designs.map(d => (
          <div
            key={d.productid}
            onClick={() => setSelected(d)}
            style={{
              padding: 10,
              cursor: "pointer",
              borderBottom: "1px solid #eee",
              background: selected?.productid === d.productid ? "#e3f2fd" : "#fff"
            }}
          >
            <strong>{d.item}</strong> (ID: {d.productid})
          </div>
        ))}
      </div>

      {/* RIGHT: SKU ENTRY */}
      {selected && (
        <div style={{ flex: 1 }}>
          <h3>
            Mapping: {selected.item} — {marketplace}
          </h3>

          <table border="1" cellPadding="10" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th>Size Code</th>
                <th>{marketplace} SKU Code</th>
              </tr>
            </thead>
            <tbody>
              {selected.sizes.map(sz => (
                <tr key={sz}>
                  <td align="center"><strong>{sz}</strong></td>
                  <td>
                    <input
                      style={{ width: "95%", padding: "5px" }}
                      value={skuMap[`${selected.productid}_${sz}`] || ""}
                      placeholder={`Enter SKU for ${marketplace}`}
                      onChange={e => setSku(selected.productid, sz, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 20 }}>
            <button 
              onClick={onSave} 
              style={{ 
                padding: "10px 20px", 
                background: "#4CAF50", 
                color: "white", 
                border: "none", 
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Update {marketplace} SKUs
            </button>

            <button 
              onClick={onExit} 
              style={{ 
                marginLeft: 10, 
                padding: "10px 20px",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}