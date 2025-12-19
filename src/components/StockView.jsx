import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function StockView({ user }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStock();
  }, []);

  async function loadStock() {
    try {
      setLoading(true);

      const res = await api.post("/stock", {
        role: user.Role,
        customerType: user.CustomerType,
      });

      console.log("STOCK API RESPONSE:", res.data); // 🔴 KEEP THIS

      setStock(res.data || []);
    } catch (err) {
      console.error("STOCK LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h3>Stock Summary</h3>

      {loading && <div>Loading...</div>}

      {!loading && stock.length === 0 && (
        <div>No stock available</div>
      )}

      {!loading && stock.length > 0 && (
        <table
          border="1"
          cellPadding="6"
          style={{ borderCollapse: "collapse", width: "100%" }}
        >
          <thead>
            <tr>
              <th>Product</th>
              <th>Series</th>
              <th>Category</th>
              <th>Jaipur</th>
              <th>Kolkata</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {stock.map((s) => (
              <tr key={s.productid}>
                <td>{s.item}</td>
                <td>{s.seriesname}</td>
                <td>{s.categoryname}</td>
                <td style={{ textAlign: "right" }}>{s.jaipurqty}</td>
                <td style={{ textAlign: "right" }}>{s.kolkataqty}</td>
                <td style={{ textAlign: "right" }}>{s.totalqty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
