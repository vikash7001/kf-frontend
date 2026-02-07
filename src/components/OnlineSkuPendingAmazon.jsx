import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function OnlineSkuPendingAmazon({ onExit }) {
  const [rows, setRows] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [mapping, setMapping] = useState({});

  // -------------------------------
  // LOAD DATA
  // -------------------------------
  useEffect(() => {
    loadPending();
    loadDesigns();
  }, []);

  const loadPending = async () => {
    try {
      const res = await api.get("/online/sku/pending/amazon");
      setRows(res.data || []);
    } catch {
      alert("Failed to load pending SKUs");
    }
  };

  const loadDesigns = async () => {
    const res = await api.get("/online/config");
    setDesigns(res.data || []);
  };

  // -------------------------------
  // HANDLE SELECT
  // -------------------------------
  const setMap = (id, key, val) => {
    setMapping(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [key]: val
      }
    }));
  };

  // -------------------------------
  // APPROVE SKU
  // -------------------------------
  const approve = async row => {
    const map = mapping[row.id];
    if (!map?.productid || !map?.size_code) {
      return alert("Select design and size");
    }

    await api.post("/online/sku/pending/amazon/approve", {
      pending_id: row.id,
      productid: map.productid,
      size_code: map.size_code,
      sku_code: row.sku_code
    });

    loadPending();
  };

  // -------------------------------
  // RENDER
  // -------------------------------
  return (
    <div style={{ padding: 20 }}>
      <h3>Pending Amazon SKUs</h3>

      <table border="1" cellPadding="6" width="100%">
        <thead>
          <tr>
            <th>SKU</th>
            <th>ASIN</th>
            <th>Name</th>
            <th>Design</th>
            <th>Size</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.sku_code}</td>
              <td>{r.asin}</td>
              <td style={{ maxWidth: 300 }}>{r.name}</td>

              {/* DESIGN */}
              <td>
                <select
                  onChange={e =>
                    setMap(r.id, "productid", e.target.value)
                  }
                >
                  <option value="">Select</option>
                  {designs.map(d => (
                    <option key={d.productid} value={d.productid}>
                      {d.item}
                    </option>
                  ))}
                </select>
              </td>

              {/* SIZE */}
              <td>
                <select
                  onChange={e =>
                    setMap(r.id, "size_code", e.target.value)
                  }
                >
                  <option value="">Select</option>
                  {["XS","S","M","L","XL","XXL","3XL"].map(sz => (
                    <option key={sz}>{sz}</option>
                  ))}
                </select>
              </td>

              {/* ACTION */}
              <td>
                <button onClick={() => approve(r)}>
                  Approve
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={onExit} style={{ marginTop: 12 }}>
        Back
      </button>
    </div>
  );
}
