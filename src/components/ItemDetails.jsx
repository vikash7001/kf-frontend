import React, { useEffect, useState } from "react";
import { api } from "../services/api";

/* ---------- BASIC STYLES ---------- */
const box = {
  background: "#fff",
  padding: 12,
  borderRadius: 6,
  border: "1px solid #ddd",
  marginTop: 12
};

const sectionTitle = {
  marginTop: 20,
  marginBottom: 8,
  fontWeight: "bold",
  borderBottom: "2px solid #ddd",
  paddingBottom: 4
};

export default function ItemDetails({ onExit }) {

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [ledger, setLedger] = useState([]);

  /* ---------- LOAD PRODUCTS ---------- */
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await api.get("/products");
      setProducts(res.data || []);
    } catch (e) {
      console.error("Failed to load products", e);
    }
  };

  /* ---------- AUTOCOMPLETE ---------- */
  useEffect(() => {
    if (!search) {
      setFiltered([]);
      return;
    }

    const f = products.filter(p =>
      p.Item.toLowerCase().includes(search.toLowerCase())
    );

    setFiltered(f); // show ALL matches
  }, [search, products]);

  const selectProduct = async (p) => {
    setSelectedProduct(p);
    setSearch(p.Item);
    setFiltered([]);

    try {
      const res = await api.get(`/stockledger/${p.Item}`);
      setLedger(res.data || []);
    } catch (e) {
      console.error("Failed to load ledger", e);
      setLedger([]);
    }
  };

  /* ---------- SPLIT IN / OUT ---------- */
  const incoming = ledger.filter(r => r.movementtype === "Incoming");
  const outgoing = ledger.filter(r => r.movementtype === "OUT");

  /* ---------- SUMMARY ---------- */
  const totalIn = incoming.reduce((s, r) => s + Number(r.quantity), 0);
  const totalOut = outgoing.reduce((s, r) => s + Number(r.quantity), 0);
  const balance = totalIn - totalOut;

  return (
    <div style={{ padding: 20, background: "#f4f4f4", minHeight: "80vh" }}>
      <h2>Item Details</h2>

      {/* ---------- ITEM SEARCH ---------- */}
      <div style={{ ...box, maxWidth: 420 }}>
        <label style={{ fontWeight: "bold" }}>Item</label>
        <input
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setSelectedProduct(null);
            setLedger([]);
          }}
          placeholder="Type item code or name..."
          style={{
            width: "100%",
            padding: 8,
            marginTop: 6,
            fontSize: 14
          }}
        />

        {filtered.length > 0 && (
          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              border: "1px solid #ccc",
              marginTop: 4
            }}
          >
            {filtered.map(p => (
              <div
                key={p.ProductID}
                onClick={() => selectProduct(p)}
                style={{
                  padding: 8,
                  cursor: "pointer",
                  borderBottom: "1px solid #eee"
                }}
              >
                <strong>{p.Item}</strong>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {p.SeriesName} | {p.CategoryName}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- SUMMARY ---------- */}
      {selectedProduct && (
        <div style={{ ...box, maxWidth: 300 }}>
          <div><strong>Item:</strong> {selectedProduct.Item}</div>
          <div>Total IN: <strong>{totalIn}</strong></div>
          <div>Total OUT: <strong>{totalOut}</strong></div>
          <div>
            Balance:{" "}
            <strong style={{ color: balance < 0 ? "red" : "green" }}>
              {balance}
            </strong>
          </div>
        </div>
      )}

      {/* ---------- INCOMING ---------- */}
      {selectedProduct && (
        <>
          <h3 style={{ ...sectionTitle, color: "green" }}>
            Incoming Stock
          </h3>
          <LedgerTable rows={incoming} />

          <h3 style={{ ...sectionTitle, color: "red" }}>
            Sales (Outgoing)
          </h3>
          <LedgerTable rows={outgoing} />
        </>
      )}

      <button onClick={onExit} style={{ marginTop: 30 }}>
        Back
      </button>
    </div>
  );
}

/* ---------- LEDGER TABLE ---------- */
function LedgerTable({ rows }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        background: "#fff"
      }}
    >
      <thead style={{ background: "#f1f1f1" }}>
        <tr>
          <th style={th}>Date</th>
          <th style={th}>Ref</th>
          <th style={th}>Qty</th>
          <th style={th}>Location</th>
          <th style={th}>User</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.ledgerid}>
            <td style={td}>{new Date(r.movementdate).toLocaleString()}</td>
            <td style={td}>{r.referenceid}</td>
            <td style={td}>{r.quantity}</td>
            <td style={td}>{r.locationname}</td>
            <td style={td}>{r.username}</td>
          </tr>
        ))}

        {rows.length === 0 && (
          <tr>
            <td colSpan="5" style={{ textAlign: "center", padding: 10 }}>
              No records
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

const th = {
  padding: 6,
  borderBottom: "1px solid #ccc",
  textAlign: "left"
};

const td = {
  padding: 6,
  borderBottom: "1px solid #eee"
};
