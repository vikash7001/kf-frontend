import React, { useEffect, useState, useRef } from "react";
import { api, postSales } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata"];

export default function SalesVoucher() {
  const user = JSON.parse(localStorage.getItem("kf_user"));

  // lookups
  const [products, setProducts] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);

  // header
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [customer, setCustomer] = useState("");
  const [voucherNo, setVoucherNo] = useState("");

  // row
  const [item, setItem] = useState("");
  const [series, setSeries] = useState("");
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState("");

  const [rows, setRows] = useState([]);

  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [seriesSuggestions, setSeriesSuggestions] = useState([]);
  const [showItemSug, setShowItemSug] = useState(false);
  const [showSeriesSug, setShowSeriesSug] = useState(false);

  const itemRef = useRef();
  const seriesRef = useRef();

  // --------------------------------------------------
  // LOAD LOOKUPS (SAFE)
  // --------------------------------------------------
  useEffect(() => {
    async function load() {
      const p = await api.get("/products");
      const s = await api.get("/series");
      const c = await api.get("/categories");
      const cu = await api.get("/customers");

      setProducts(p.data || []);
      setSeriesList((s.data || []).map(r => r.SeriesName));
      setCategories((c.data || []).map(r => r.CategoryName));
      setCustomers(cu.data || []);
    }
    load().catch(err => {
      console.error("LOOKUP ERROR:", err);
      alert("Failed to load sales lookups");
    });
  }, []);

  // --------------------------------------------------
  // ITEM
  // --------------------------------------------------
  const onItemChange = (val) => {
    setItem(val);
    setSeries("");
    setCategory("");

    if (!val) return setShowItemSug(false);

    const q = val.toLowerCase();
    const matches = products
      .filter(p => p.Item.toLowerCase().includes(q))
      .slice(0, 10);

    setItemSuggestions(matches);
    setShowItemSug(matches.length > 0);
  };

  const selectProduct = (p) => {
    setItem(p.Item);
    setSeries(p.SeriesName);
    setCategory(p.CategoryName);
    setShowItemSug(false);
  };

  // --------------------------------------------------
  // SERIES
  // --------------------------------------------------
  const onSeriesChange = (val) => {
    setSeries(val);
    setCategory("");

    if (!val) return setShowSeriesSug(false);

    const q = val.toLowerCase();
    const matches = seriesList.filter(s => s.toLowerCase().startsWith(q));
    setSeriesSuggestions(matches);
    setShowSeriesSug(matches.length > 0);

    const prod = products.find(p => p.SeriesName === val);
    if (prod) setCategory(prod.CategoryName);
  };

  const selectSeries = (s) => {
    setSeries(s);
    setShowSeriesSug(false);

    const prod = products.find(p => p.SeriesName === s);
    if (prod) setCategory(prod.CategoryName);
  };

  // --------------------------------------------------
  // ADD ROW
  // --------------------------------------------------
  const onAddRow = () => {
    if (!item || !qty) return alert("Enter item & qty");

    setRows(r => [...r, {
      Item: item,
      SeriesName: series,
      CategoryName: category,
      Quantity: Number(qty)
    }]);

    setItem("");
    setSeries("");
    setCategory("");
    setQty("");
  };

  const removeRow = i => setRows(rows.filter((_, x) => x !== i));

  // --------------------------------------------------
  // SUBMIT
  // --------------------------------------------------
  const onSubmit = async () => {
    if (!rows.length) return alert("No rows");

    const payload = {
      UserName: user.Username,
      UserID: user.userid,
      Location: location,
      Customer: customer,
      VoucherNo: voucherNo,
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
    } catch (e) {
      console.error(e);
      alert("Sales failed");
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <div style={{ padding: 18 }}>
      <h2>Sales Voucher</h2>

      <div style={{ marginBottom: 12 }}>
        <select value={location} onChange={e => setLocation(e.target.value)}>
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>

        <input
          list="customerList"
          placeholder="Customer"
          value={customer}
          onChange={e => setCustomer(e.target.value)}
          style={{ marginLeft: 8 }}
        />
        <datalist id="customerList">
          {customers.map(c =>
            <option key={c.CustomerID} value={c.CustomerName} />
          )}
        </datalist>

        <input
          placeholder="Voucher No"
          value={voucherNo}
          onChange={e => setVoucherNo(e.target.value)}
          style={{ marginLeft: 8 }}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div ref={itemRef} style={{ position: "relative" }}>
          <input value={item} onChange={e => onItemChange(e.target.value)} placeholder="Item" />
          {showItemSug && itemSuggestions.map((p,i) =>
            <div key={i} onClick={() => selectProduct(p)}>{p.Item}</div>
          )}
        </div>

        <div ref={seriesRef} style={{ position: "relative" }}>
          <input value={series} onChange={e => onSeriesChange(e.target.value)} placeholder="Series" />
          {showSeriesSug && seriesSuggestions.map((s,i) =>
            <div key={i} onClick={() => selectSeries(s)}>{s}</div>
          )}
        </div>

        <input value={category} placeholder="Category" readOnly />
        <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty" />
        <button onClick={onAddRow}>Add</button>
      </div>

      <table border="1" width="100%" style={{ marginTop: 12 }}>
        <tbody>
          {rows.map((r,i) =>
            <tr key={i}>
              <td>{r.Item}</td>
              <td>{r.SeriesName}</td>
              <td>{r.CategoryName}</td>
              <td>{r.Quantity}</td>
              <td><button onClick={() => removeRow(i)}>X</button></td>
            </tr>
          )}
        </tbody>
      </table>

      <button onClick={onSubmit} style={{ marginTop: 12 }}>Submit Sales</button>
    </div>
  );
}
