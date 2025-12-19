import React, { useEffect, useState, useRef } from "react";
import { api, postSales } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata"];

export default function SalesVoucher() {
  const user = JSON.parse(localStorage.getItem("kf_user"));

  // -----------------------------
  // lookups (normalized)
  // -----------------------------
  const [products, setProducts] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);

  // header
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [customer, setCustomer] = useState("");
  const [voucherNo, setVoucherNo] = useState("");

  // row inputs
  const [item, setItem] = useState("");
  const [series, setSeries] = useState("");
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState("");

  const [rows, setRows] = useState([]);

  // suggestions
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [seriesSuggestions, setSeriesSuggestions] = useState([]);
  const [showItemSug, setShowItemSug] = useState(false);
  const [showSeriesSug, setShowSeriesSug] = useState(false);

  const itemRef = useRef(null);
  const seriesRef = useRef(null);

  // --------------------------------------------------
  // LOAD LOOKUPS (NORMALIZED)
  // --------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const p = await api.get("/products");
        const s = await api.get("/series");
        const c = await api.get("/categories");
        const cu = await api.get("/customers");

        const normalizedProducts = (p.data || []).map(r => ({
          productid: r.ProductID,
          item: r.Item,
          seriesname: r.SeriesName,
          categoryname: r.CategoryName
        }));

        const normalizedCustomers = (cu.data || []).map(r => ({
          customerid: r.CustomerID,
          customername: r.CustomerName
        }));

        setProducts(normalizedProducts);
        setSeriesList((s.data || []).map(r => r.SeriesName));
        setCategories((c.data || []).map(r => r.CategoryName));
        setCustomers(normalizedCustomers);

        console.log("SALES LOOKUPS LOADED", {
          products: normalizedProducts.length,
          customers: normalizedCustomers.length
        });

      } catch (err) {
        console.error("LOOKUP ERROR:", err);
        alert("Failed to load sales lookups");
      }
    })();
  }, []);

  // --------------------------------------------------
  // ITEM INPUT
  // --------------------------------------------------
  const onItemChange = (val) => {
    setItem(val);
    setSeries("");
    setCategory("");

    if (!val.trim()) {
      setShowItemSug(false);
      return;
    }

    const q = val.toLowerCase();
    const matches = products
      .filter(p => p.item.toLowerCase().includes(q))
      .slice(0, 10);

    setItemSuggestions(matches);
    setShowItemSug(matches.length > 0);
  };

  const selectProduct = (p) => {
    setItem(p.item);
    setSeries(p.seriesname);
    setCategory(p.categoryname);
    setShowItemSug(false);
  };

  // --------------------------------------------------
  // SERIES INPUT
  // --------------------------------------------------
  const onSeriesChange = (val) => {
    setSeries(val);
    setCategory("");

    if (!val.trim()) {
      setShowSeriesSug(false);
      return;
    }

    const q = val.toLowerCase();
    const matches = seriesList.filter(s => s.toLowerCase().startsWith(q));
    setSeriesSuggestions(matches);
    setShowSeriesSug(matches.length > 0);

    const prod = products.find(p => p.seriesname === val);
    if (prod) setCategory(prod.categoryname);
  };

  const selectSeries = (s) => {
    setSeries(s);
    setShowSeriesSug(false);

    const prod = products.find(p => p.seriesname === s);
    if (prod) setCategory(prod.categoryname);
  };

  // --------------------------------------------------
  // ADD ROW
  // --------------------------------------------------
  const onAddRow = () => {
    if (!item || !qty) {
      alert("Enter Item and Quantity");
      return;
    }

    setRows(r => [
      ...r,
      {
        Item: item,
        SeriesName: series,
        CategoryName: category,
        Quantity: Number(qty)
      }
    ]);

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
    if (!rows.length) {
      alert("No rows");
      return;
    }

    const payload = {
      UserID: user.userid,
      UserName: user.username,
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
      } else {
        alert("Sales failed");
      }
    } catch (e) {
      console.error(e.response?.data || e);
      alert("Sales failed — check console");
    }
  };

  const small = { padding: "6px 8px" };

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
          style={{ marginLeft: 8, ...small }}
        />
        <datalist id="customerList">
          {customers.map(c =>
            <option key={c.customerid} value={c.customername} />
          )}
        </datalist>

        <input
          placeholder="Voucher No"
          value={voucherNo}
          onChange={e => setVoucherNo(e.target.value)}
          style={{ marginLeft: 8, ...small }}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div ref={itemRef} style={{ position: "relative" }}>
          <input
            value={item}
            onChange={e => onItemChange(e.target.value)}
            placeholder="Item"
          />
          {showItemSug && (
            <div style={{ position: "absolute", background: "#fff", border: "1px solid #ccc" }}>
              {itemSuggestions.map((p, i) =>
                <div key={i} onClick={() => selectProduct(p)} style={{ padding: 6, cursor: "pointer" }}>
                  {p.item} — {p.seriesname}
                </div>
              )}
            </div>
          )}
        </div>

        <div ref={seriesRef} style={{ position: "relative" }}>
          <input
            value={series}
            onChange={e => onSeriesChange(e.target.value)}
            placeholder="Series"
          />
          {showSeriesSug && (
            <div style={{ position: "absolute", background: "#fff", border: "1px solid #ccc" }}>
              {seriesSuggestions.map((s, i) =>
                <div key={i} onClick={() => selectSeries(s)} style={{ padding: 6, cursor: "pointer" }}>
                  {s}
                </div>
              )}
            </div>
          )}
        </div>

        <input value={category} placeholder="Category" readOnly />
        <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty" />
        <button onClick={onAddRow}>Add</button>
      </div>

      <table border="1" width="100%" style={{ marginTop: 12 }}>
        <tbody>
          {rows.map((r, i) =>
            <tr key={i}>
              <td>{r.Item}</td>
              <td>{r.SeriesName}</td>
              <td>{r.CategoryName}</td>
              <td align="right">{r.Quantity}</td>
              <td><button onClick={() => removeRow(i)}>X</button></td>
            </tr>
          )}
        </tbody>
      </table>

      <button onClick={onSubmit} style={{ marginTop: 12 }}>
        Submit Sales
      </button>
    </div>
  );
}
