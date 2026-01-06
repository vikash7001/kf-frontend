import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function ViewSales({ onExit }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/sales/list");
        setRows(res.data || []);
      } catch (e) {
        console.error(e);
        setError("Failed to load sales list");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleRow = async (id) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }

    setOpenId(id);

    if (!details[id]) {
      try {
        const res = await api.get(`/sales/${id}`);
        setDetails(prev => ({
          ...prev,
          [id]: res.data
        }));
      } catch (e) {
        console.error(e);
        alert("Failed to load sales details");
      }
    }
  };

  return (
    <div style={{ padding: 18 }}>
      <h2>View Sales</h2>

      <button onClick={onExit} style={{ marginBottom: 12 }}>
        Back
      </button>

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

      {!loading && !error && (
        <table border="1" width="100%">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Total Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan="4" align="center">
                  No records found
                </td>
              </tr>
            )}

            {rows.map(r => (
              <React.Fragment key={r.ID}>
                <tr
                  style={{ cursor: "pointer", background: "#fafafa" }}
                  onClick={() => toggleRow(r.ID)}
                >
                  <td>{r.ID}</td>
                  <td>{new Date(r.Date).toLocaleDateString()}</td>
                  <td>{r.Customer}</td>
                  <td align="right">{r.TotalQty}</td>
                </tr>

                {openId === r.ID && (
                  <tr>
                    <td colSpan="4">
                      {!details[r.ID] ? (
                        <div>Loading details...</div>
                      ) : (
                        <table
                          border="1"
                          width="100%"
                          style={{ background: "#fff" }}
                        >
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Series</th>
                              <th>Category</th>
                              <th>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {details[r.ID].rows.map((d, i) => (
                              <tr key={i}>
                                <td>{d.item}</td>
                                <td>{d.series}</td>
                                <td>{d.category}</td>
                                <td align="right">{d.quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
