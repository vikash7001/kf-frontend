import React, { useEffect, useState } from "react";
import { api, postSales } from "../services/api";

export default function ItemDetails({ onExit }) {

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [ledger, setLedger] = useState([]);

  /* ---------- LOAD PRODUCTS ---------- */
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const res = await axios.get('/products');
    setProducts(res.data || []);
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

    setFiltered(f.slice(0, 10));
  }, [search, products]);

  const selectProduct = async (p) => {
    setSelectedProduct(p);
    setSearch(p.Item);
    setFiltered([]);

    // 🔹 FETCH LEDGER FOR ITEM
    const res = await axios.get(`/stockledger/${p.ProductID}`);
    setLedger(res.data || []);
  };

  /* ---------- SPLIT IN / OUT ---------- */
  const incoming = ledger.filter(r => r.movementtype === 'Incoming');
  const outgoing = ledger.filter(r => r.movementtype === 'OUT');

  return (
    <div style={{ padding: 20, background: '#f8f8f8', minHeight: '80vh' }}>
      <h2>Item Details</h2>

      {/* ---------- ITEM SEARCH ---------- */}
      <div style={{ position: 'relative', width: 300 }}>
        <label>Item</label>
        <input
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setSelectedProduct(null);
            setLedger([]);
          }}
          placeholder="Search item..."
          style={{ width: '100%', padding: 6 }}
        />

        {filtered.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ccc',
            zIndex: 10
          }}>
            {filtered.map(p => (
              <div
                key={p.ProductID}
                onClick={() => selectProduct(p)}
                style={{ padding: 6, cursor: 'pointer' }}
              >
                {p.Item}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- INCOMING ---------- */}
      {selectedProduct && (
        <>
          <h3 style={{ marginTop: 20 }}>Incoming</h3>
          <LedgerTable rows={incoming} />

          <h3 style={{ marginTop: 20 }}>Sales</h3>
          <LedgerTable rows={outgoing} />
        </>
      )}

      <button onClick={onExit} style={{ marginTop: 30 }}>
        Back
      </button>
    </div>
  );
}

/* ---------- TABLE ---------- */
function LedgerTable({ rows }) {
  return (
    <table border="1" cellPadding="6" style={{ width: '100%', background: '#fff' }}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Ref ID</th>
          <th>Qty</th>
          <th>Location</th>
          <th>User</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.ledgerid}>
            <td>{new Date(r.movementdate).toLocaleString()}</td>
            <td>{r.referenceid}</td>
            <td>{r.quantity}</td>
            <td>{r.locationname}</td>
            <td>{r.username}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan="5" align="center">No records</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
