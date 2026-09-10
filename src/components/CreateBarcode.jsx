import React, { useEffect, useState } from "react";
import { api, createBarcode } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata", "Ahmedabad"];

export default function CreateBarcode() {
  const [location, setLocation] = useState("Jaipur");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [sizeQty, setSizeQty] = useState({});
  const [creating, setCreating] = useState(false);
  const [lastBarcode, setLastBarcode] = useState("");

  const loadStock = async (loc) => {
    try {
      setLoading(true);
      setSelected(null);
      setLastBarcode("");

      const res = await api.get(`/barcode/stock/${encodeURIComponent(loc)}`);
      setRows(res.data?.rows || []);
    } catch (e) {
      console.error(e);
      setRows([]);
      alert(e?.response?.data?.error || "Failed to load barcode stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock(location);
  }, [location]);

  const openComposer = (row) => {
    const initial = {};
    (row.unbarcoded_sizes || []).forEach(s => {
      initial[s.size_code] = 0;
    });

    setSelected(row);
    setSizeQty(initial);
    setLastBarcode("");
  };

  const totalSelected = Object.values(sizeQty)
    .map(Number)
    .reduce((a, b) => a + b, 0);

  const create = async () => {
    if (!selected) return;

    const sizes = Object.entries(sizeQty)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([size_code, qty]) => ({
        size_code,
        qty: Number(qty)
      }));

    if (!sizes.length) {
      alert("Select at least one size quantity.");
      return;
    }

    for (const s of sizes) {
      const available =
        Number(
          (selected.unbarcoded_sizes || []).find(
            x => x.size_code === s.size_code
          )?.qty || 0
        );

      if (s.qty > available) {
        alert(`Only ${available} pieces are unbarcoded for size ${s.size_code}.`);
        return;
      }
    }

    try {
      setCreating(true);

      const res = await createBarcode({
        productid: selected.productid,
        Location: location,
        incomingheaderid: null,
        sizes
      });

      const barcode = res.data?.barcode?.barcode || "";
      setLastBarcode(barcode);

      alert(`Barcode created: ${barcode}`);

      await loadStock(location);
      setSelected(null);
      setSizeQty({});
    } catch (e) {
      console.error(e);
      alert(
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        "Failed to create barcode"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ padding: 18 }}>
      <h2>Create Barcode</h2>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: "bold", marginRight: 8 }}>
          Select Location
        </label>
        <select
          value={location}
          onChange={e => setLocation(e.target.value)}
        >
          {LOCATIONS.map(loc => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {loading && <div>Loading...</div>}

      {!loading && (
        <table
          border="1"
          cellPadding="6"
          style={{
            borderCollapse: "collapse",
            width: "100%"
          }}
        >
          <thead>
            <tr>
              <th>Design</th>
              <th>Total</th>
              <th>Barcoded Stock</th>
              <th>Unbarcoded Stock</th>
              <th>Create Barcode</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="5" align="center">
                  No stock available
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.productid}>
                  <td>{row.item}</td>
                  <td align="right">{row.total_qty}</td>
                  <td align="right">{row.barcoded_qty}</td>
                  <td align="right">{row.unbarcoded_qty}</td>
                  <td align="center">
                    <button
                      type="button"
                      disabled={Number(row.unbarcoded_qty) <= 0}
                      onClick={() => openComposer(row)}
                    >
                      CREATE BARCODE
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {selected && (
        <div
          style={{
            marginTop: 18,
            border: "1px solid #ccc",
            padding: 16,
            background: "#fff"
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            {selected.item} — {selected.seriesname}
          </h3>

          <div style={{ marginBottom: 12 }}>
            {selected.categoryname}
          </div>

          <table
            border="1"
            cellPadding="6"
            style={{
              borderCollapse: "collapse",
              minWidth: 420
            }}
          >
            <thead>
              <tr>
                <th>Size</th>
                <th>Unbarcoded</th>
                <th>Select Qty</th>
              </tr>
            </thead>
            <tbody>
              {(selected.unbarcoded_sizes || []).map(s => (
                <tr key={s.size_code}>
                  <td>{s.size_code}</td>
                  <td align="right">{s.qty}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max={s.qty}
                      value={sizeQty[s.size_code] ?? 0}
                      onChange={e =>
                        setSizeQty(prev => ({
                          ...prev,
                          [s.size_code]: e.target.value
                        }))
                      }
                      style={{ width: 90 }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 12, fontWeight: "bold" }}>
            Bundle Quantity: {totalSelected}
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              onClick={create}
              disabled={creating || totalSelected <= 0}
              style={{ marginRight: 8 }}
            >
              {creating ? "Creating..." : "Create Barcode"}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setSizeQty({});
              }}
            >
              Cancel
            </button>
          </div>

          {lastBarcode && (
            <div style={{ marginTop: 12, fontWeight: "bold" }}>
              Created: {lastBarcode}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
