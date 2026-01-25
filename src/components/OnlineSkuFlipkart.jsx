import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function OnlineSkuFlipkart({ onExit }) {
  const [designs, setDesigns] = useState([]);
  const [selected, setSelected] = useState(null);

  // skuMap key format: productid_size
  const [skuMap, setSkuMap] = useState({});

  // --------------------------------
  // LOAD ONLINE-ENABLED DESIGNS
  // --------------------------------
  useEffect(() => {
    async function load() {
      // 1️⃣ Load online-enabled designs + sizes
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

      // 2️⃣ Load existing Flipkart SKUs
      const skuRes = await api.get("/online/sku/flipkart");
      const skuRows = skuRes.data || [];

      const skuTemp = {};
      skuRows.forEach(r => {
        skuTemp[`${r.productid}_${r.size_code}`] = r.sku_code;
      });

      setSkuMap(skuTemp);
    }

    load().catch(() => alert("Failed to load Flipkart SKU data"));
  }, []);

  // --------------------------------
  // HANDLE SKU INPUT
  // --------------------------------
  const setSku = (pid, size, val) => {
    setSkuMap(prev => ({
      ...prev,
      [`${pid}_${size}`]: val
    }));
  };

  // --------------------------------
  // SAVE TO SUPABASE
  // --------------------------------
  const onSave = async () => {
    if (!selected) return;

    const rows = selected.sizes.map(sz => ({
      productid: selected.productid,
      size_code: sz,
      sku_code: skuMap[`${selected.productid}_${sz}`] || null
    }));

    await api.post("/online/sku/flipkart", rows);
    alert("Flipkart SKU saved");
  };

  // --------------------------------
  // RENDER
  // --------------------------------
  return (
    <div style={{ padding: 20, display: "flex", gap: 20 }}>
      {/* LEFT: DESIGN LIST */}
      <div style={{ width: 300 }}>
        <h3>Online Designs</h3>
        {designs.map(d => (
          <div
            key={d.productid}
            onClick={() => setSelected(d)}
            style={{
              padding: 6,
              cursor: "pointer",
              background:
                selected?.productid === d.productid ? "#eef" : "#fff"
            }}
          >
            {d.item}
          </div>
        ))}
      </div>

      {/* RIGHT: SKU ENTRY */}
      {selected && (
        <div style={{ flex: 1 }}>
          <h3>{selected.item} — Flipkart SKU</h3>

          <table border="1" cellPadding="6">
            <thead>
              <tr>
                <th>Size</th>
                <th>Flipkart SKU</th>
              </tr>
            </thead>
            <tbody>
              {selected.sizes.map(sz => (
                <tr key={sz}>
                  <td>{sz}</td>
                  <td>
                    <input
                      value={
                        skuMap[`${selected.productid}_${sz}`] || ""
                      }
                      placeholder="Enter Flipkart SKU"
                      onChange={e =>
                        setSku(selected.productid, sz, e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={onSave} style={{ marginTop: 12 }}>
            Save
          </button>

          <button onClick={onExit} style={{ marginLeft: 8 }}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}
