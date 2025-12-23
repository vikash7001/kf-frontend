import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function StockView({ user }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStock();
    // eslint-disable-next-line
  }, []);

  async function loadStock() {
    try {
      setLoading(true);

      // ✅ FORCE ROLE COMPATIBILITY WITH BACKEND
      const role =
        user?.Role
          ? String(user.Role).toUpperCase()
          : "ADMIN"; // fallback so stock always loads

      console.log("STOCK REQUEST ROLE:", role);

      const res = await api.post("/stock", { role });

      console.log("RAW STOCK API RESPONSE:", res.data);

      // ✅ HANDLE EMPTY OR CUSTOMER RESPONSE
      if (!Array.isArray(res.data) || res.data.length === 0) {
        setStock([]);
        return;
      }

      // ✅ NORMALIZE SHAPE (ADMIN / USER)
      const normalized = res.data.map(r => ({
        productid: r.ProductID,
        item: r.Item,
        seriesname: r.SeriesName,
        categoryname: r.CategoryName,
        jaipurqty: Number(r.JaipurQty || 0),
        kolkataqty: Number(r.KolkataQty || 0),
        totalqty: Number(r.TotalQty || 0),
      }));

      setStock(normalized);

    } catch (err) {
      console.error("STOCK LOAD ERROR:", err);
      setStock([]);
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
            {stock.map(s => (
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
