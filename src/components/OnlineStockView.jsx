import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function OnlineStockView({ onExit }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await api.get("/online/config");
      const rows = res.data || [];

      const map = {};
      rows.forEach(r => {
        if (!r.is_online) return;

        if (!map[r.productid]) {
          map[r.productid] = {
            productid: r.productid,
            item: r.item,
            seriesname: r.seriesname,
            categoryname: r.categoryname,
            jaipurqty: Number(r.jaipurqty),
            sizes: {}
          };
        }

        if (r.size_code) {
          map[r.productid].sizes[r.size_code] = Number(r.qty);
        }
      });

      setItems(Object.values(map));
    }

    load().catch(() => alert("Failed to load online stock"));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h3>Online-Enabled Stock (Jaipur)</h3>

      {items.map(p => (
        <div
          key={p.productid}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 12
          }}
        >
          <div>
            <b>{p.item}</b> — {p.seriesname} / {p.categoryname}
          </div>

          <table border="1" cellPadding="6" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Size</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(p.sizes).map(([sz, qty]) => (
                <tr key={sz}>
                  <td>{sz}</td>
                  <td>{qty}</td>
                </tr>
              ))}
              <tr>
                <td><b>Total</b></td>
                <td><b>{p.jaipurqty}</b></td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      <button onClick={onExit}>Back</button>
    </div>
  );
}
