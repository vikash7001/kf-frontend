import React, { useEffect, useState } from "react";
import { api, postSales } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata"];

export default function SalesVoucher() {
  const user = JSON.parse(localStorage.getItem("kf_user"));

  // lookups
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // header
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [customer, setCustomer] = useState("");
  const [voucherNo, setVoucherNo] = useState("");

  // row
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("");
  const [series, setSeries] = useState("");
  const [category, setCategory] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rows, setRows] = useState([]);

  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showItemSug, setShowItemSug] = useState(false);

  // --------------------------------------------------
  // LOAD LOOKUPS
  // --------------------------------------------------
  useEffect(() => {
    async function load() {
      const p = await api.get("/products");
      const cu = await api.get("/customers");
      setProducts(p.data || []);
      setCustomers(cu.data || []);
    }
    load().catch(() => alert("Failed to load sales data"));
  }, []);

  // --------------------------------------------------
  // ITEM SEARCH
  // --------------------------------------------------
  const onItemChange = (val) => {
    setItem(val);
    setQty("");
    setSeries("");
    setCategory("");
    setSelectedProduct(null);

    if (!val) {
      setShowItemSug(false);
      return;
    }

    const q = val.toLowerCase();
    const matches = products
      .filter(p => p.Item.toLowerCase().includes(q))
      .slice(0, 10);

    setItemSuggestions(matches);
    setShowItemSug(matches.length > 0);
  };

  const selectProduct = (p) => {
    setSelectedProduct(p);
    setItem(p.Item);
    setSeries(p.SeriesName);
    setCategory(p.CategoryName);
    setShowItemSug(false);
  };

  // --------------------------------------------------
  // ADD ROW
  // --------------------------------------------------
  const onAddRow = () => {
    if (!selectedProduct || !qty) {
      alert("Select item and quantity");
      return;
    }

    setRows(r => [
      ...r,
      {
        ProductID: selectedProduct.ProductID,
        Item: selectedProduct.Item,
        Series: selectedProduct.SeriesName,
        Category: selectedProduct.CategoryName,
        Quantity: Number(qty)
      }
    ]);

    setItem("");
    setQty("");
    setSeries("");
    setCategory("");
    setSelectedProduct(null);
  };

  const removeRow = (i) =>
    setRows(rows.filter((_, x) => x !== i));

  // --------------------------------------------------
  // SUBMIT
  // --------------------------------------------------
  const onSubmit = async () => {
    if (!rows.length) {
      alert("No items added");
      return;
    }

    const payload = {
      UserName: user.Username,
      UserID: user.userid,
      Location: location,
      Customer: customer,
      VoucherNo: voucherNo || null,
      Rows: rows
    };

    try {
      const res = await postSales(payload);
      if (res.data?.success) {
        alert("Sales saved");
        setRows([]);
        setCustomer("");
        setVoucherNo("");
      }
    } catch {
      alert("Sales failed");
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div style={{ padding: 18 }}>
      <h2>Sales Voucher</h2>

      {/* HEADER */}
      <div style={{ marginBottom: 12 }}>
        <select value={location} onChange={e => setLocation(e.target.value)}>
          {LOCATIONS.map(l => (
            <option key={l}>{l}</option>
          ))}
        </select>

        <input
          list="customerList"
          placeholder="Customer"
          value={customer}
          onChange={e => setCustomer(e.target.value)}
          style={{ marginLeft: 8 }}
        />
        <datalist id="customerList">
          {customers.map(c => (
            <option key={c.CustomerID} value={c.CustomerName} />
          ))}
        </datalist>

        <input
          placeholder="Voucher No"
          value={voucherNo}
          onChange={e => setVoucherNo(e.target.value)}
          style={{ marginLeft: 8 }}
        />
      </div>

      {/* ROW ENTRY */}
      <div style={{ marginTop: 10 }}>

        {/* LINE 1 */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <input
              value={item}
              onChange={e => onItemChange(e.target.value)}
              placeholder="Item"
            />
            {showItemSug &&
              itemSuggestions.map((p, i) => (
                <div
                  key={i}
                  onClick={() => selectProduct(p)}
                  style={{ cursor: "pointer", background: "#eee" }}
                >
                  {p.Item}
                </div>
              ))}
          </div>

          <input
            type="number"
            value={qty}
            onChange={e => setQty(e.target.value)}
            placeholder="Qty"
          />

          <button onClick={onAddRow}>Add</button>
        </div>


      </div>

      {/* ROWS */}
      <table border="1" width="100%" style={{ marginTop: 12 }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.Item}</td>
              <td>{r.Series}</td>
              <td>{r.Category}</td>
              <td>{r.Quantity}</td>
              <td>
                <button onClick={() => removeRow(i)}>X</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={onSubmit} style={{ marginTop: 12 }}>
        Submit Sales
      </button>
    </div>
  );
}
