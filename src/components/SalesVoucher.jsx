import React, { useEffect, useState } from "react";
import { api, postSales } from "../services/api";

const LOCATIONS = ["Jaipur", "Kolkata", "Ahmedabad"];

export default function SalesVoucher() {
  const user = JSON.parse(localStorage.getItem("kf_user"));

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // header
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [customer, setCustomer] = useState("");
  const [voucherNo, setVoucherNo] = useState("");

  // row input
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rows, setRows] = useState([]);

  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showItemSug, setShowItemSug] = useState(false);

  // 🔹 online size logic
  const [isOnlineEnabled, setIsOnlineEnabled] = useState(false);
  const [enabledSizes, setEnabledSizes] = useState([]);
  const [sizeQty, setSizeQty] = useState({});

  // 🔒 loading freeze state
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------
  // LOAD LOOKUPS
  // --------------------------------------------------
  useEffect(() => {
    async function load() {
      const p = await api.get("/products");
      const cu = await api.get("/customers");

      setProducts(
        (p.data || []).map(r => ({
          item: r.Item,
          seriesname: r.SeriesName,
          categoryname: r.CategoryName
        }))
      );

      setCustomers(cu.data || []);
    }

    load().catch(() => alert("Failed to load data"));
  }, []);

  // --------------------------------------------------
  // ITEM SEARCH
  // --------------------------------------------------
  const onItemChange = (val) => {
    setItem(val);
    setSelectedProduct(null);
    setIsOnlineEnabled(false);
    setEnabledSizes([]);
    setSizeQty({});

    if (!val) {
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

  // --------------------------------------------------
  // SELECT PRODUCT
  // --------------------------------------------------
  const selectProduct = async (p) => {
    setSelectedProduct(p);
    setItem(p.item);
    setShowItemSug(false);

    try {
      const res = await api.get(`/online/status-by-item/${p.item}`);
      if (res.data?.is_online && location === "Jaipur") {
        setIsOnlineEnabled(true);
        setEnabledSizes(res.data.sizes || []);
        setSizeQty({});
      } else {
        setIsOnlineEnabled(false);
        setEnabledSizes([]);
        setSizeQty({});
      }
    } catch {
      setIsOnlineEnabled(false);
      setEnabledSizes([]);
      setSizeQty({});
    }
  };

  // --------------------------------------------------
  // SIZE TOTAL
  // --------------------------------------------------
  const totalSizeQty = Object.values(sizeQty)
    .map(Number)
    .reduce((a, b) => a + b, 0);

  // --------------------------------------------------
  // ADD ROW
  // --------------------------------------------------
  const onAddRow = () => {
    if (!selectedProduct || !qty) {
      alert("Select item and quantity");
      return;
    }

    if (isOnlineEnabled && location === "Jaipur") {
      if (!enabledSizes.length) {
        alert("Size details required");
        return;
      }
      if (totalSizeQty !== Number(qty)) {
        alert("Size total must equal quantity");
        return;
      }
    }

    setRows(r => [
      ...r,
      {
        Item: selectedProduct.item,
        SeriesName: selectedProduct.seriesname,
        CategoryName: selectedProduct.categoryname,
        Quantity: Number(qty),
        SizeQty: isOnlineEnabled ? sizeQty : null
      }
    ]);

    setItem("");
    setQty("");
    setSelectedProduct(null);
    setIsOnlineEnabled(false);
    setEnabledSizes([]);
    setSizeQty({});
  };

  const removeRow = (i) =>
    setRows(rows.filter((_, x) => x !== i));

  // --------------------------------------------------
  // SUBMIT (FREEZE SCREEN)
  // --------------------------------------------------
  const onSubmit = async () => {
    if (!rows.length) {
      alert("No items added");
      return;
    }

    const payload = {
      UserName: user.username,
      Location: location,
      Customer: customer,
      VoucherNo: voucherNo || null,
      Rows: rows
    };

    try {
      setLoading(true); // 🔒 freeze UI

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
      console.error(e);
      alert("Sales failed");
    } finally {
      setLoading(false); // 🔓 unfreeze UI
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
        <select
          value={location}
          onChange={e => setLocation(e.target.value)}
          disabled={loading}
        >
          {LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>

        <input
          list="customerList"
          placeholder="Customer"
          value={customer}
          onChange={e => setCustomer(e.target.value)}
          style={{ marginLeft: 8 }}
          disabled={loading}
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
          disabled={loading}
        />
      </div>

      {/* ROW ENTRY */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <input
            value={item}
            onChange={e => onItemChange(e.target.value)}
            placeholder="Item"
            disabled={loading}
          />
          {showItemSug &&
            itemSuggestions.map((p, i) => (
              <div
                key={i}
                onClick={() => selectProduct(p)}
                style={{ cursor: "pointer", background: "#eee" }}
              >
                {p.item}
              </div>
            ))}
        </div>

        <input
          type="number"
          value={qty}
          onChange={e => setQty(e.target.value)}
          placeholder="Qty"
          disabled={loading}
        />

        <button onClick={onAddRow} disabled={loading}>
          Add
        </button>
      </div>

      {/* SIZE INPUT */}
      {isOnlineEnabled && location === "Jaipur" && (
        <div style={{ marginTop: 12 }}>
          <b>Size-wise Quantity (Jaipur)</b>
          {enabledSizes.map(sz => (
            <div key={sz}>
              {sz}
              <input
                type="number"
                value={sizeQty[sz] || ""}
                onChange={e =>
                  setSizeQty({ ...sizeQty, [sz]: Number(e.target.value) })
                }
                style={{ marginLeft: 8 }}
                disabled={loading}
              />
            </div>
          ))}
          <div>
            <b>Total:</b> {totalSizeQty} / {qty || 0}
          </div>
        </div>
      )}

      {/* ROWS */}
      <table border="1" width="100%" style={{ marginTop: 12 }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.Item}</td>
              <td>{r.SeriesName}</td>
              <td>{r.CategoryName}</td>
              <td>{r.Quantity}</td>
              <td>
                <button onClick={() => removeRow(i)} disabled={loading}>
                  X
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={onSubmit} style={{ marginTop: 12 }} disabled={loading}>
        {loading ? "Posting..." : "Submit Sales"}
      </button>

      {/* 🔒 FULL SCREEN FREEZE OVERLAY */}
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            color: "#fff",
            fontSize: 22,
            fontWeight: "bold"
          }}
        >
          Posting... Please wait
        </div>
      )}
    </div>
  );
}
