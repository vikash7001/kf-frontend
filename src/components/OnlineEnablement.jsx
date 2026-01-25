import React, { useEffect, useState } from "react";
import { api } from "../services/api";

const ALL_SIZES = ["S","M","L","XL","XXL","3XL","4XL","5XL","6XL","7XL"];

export default function OnlineEnablement({ onExit }) {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);

  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [enabledSizes, setEnabledSizes] = useState([]);
  const [sizeQty, setSizeQty] = useState({});
  const [jaipurQty, setJaipurQty] = useState(0);

  // -----------------------------
  // LOAD FROM vw_online_config
  // -----------------------------
  useEffect(() => {
    async function load() {
      const res = await api.get("/online/config");
      const rows = res.data || [];

      const map = {};
      rows.forEach(r => {
        if (!map[r.productid]) {
          map[r.productid] = {
            productid: r.productid,
            item: r.item,
            seriesname: r.seriesname,
            categoryname: r.categoryname,
            jaipurqty: r.jaipurqty,
            is_online: r.is_online,
            enabledSizes: [],
            sizeQty: {}
          };
        }
        if (r.size_code) {
          map[r.productid].enabledSizes.push(r.size_code);
          map[r.productid].sizeQty[r.size_code] = r.qty;
        }
      });

      setProducts(Object.values(map));
    }

    load().catch(() => alert("Failed to load online config"));
  }, []);

  // -----------------------------
  // SELECT PRODUCT
  // -----------------------------
  const selectProduct = (p) => {
    setSelected(p);
    setOnlineEnabled(p.is_online);
    setEnabledSizes(p.enabledSizes || []);
    setSizeQty(p.sizeQty || {});
    setJaipurQty(Number(p.jaipurqty));
  };

  // -----------------------------
  // SIZE TOGGLE
  // -----------------------------
  const toggleSize = (sz) => {
    setEnabledSizes(prev =>
      prev.includes(sz)
        ? prev.filter(x => x !== sz)
        : [...prev, sz]
    );
  };

  const totalSizeQty = Object.values(sizeQty)
  .map(Number)
  .reduce((a,b) => a + b, 0);


  // -----------------------------
  // SAVE
  // -----------------------------
  const onSave = async () => {
    if (!selected) return;

    if (onlineEnabled) {
      if (!enabledSizes.length) {
        alert("Select at least one size");
        return;
      }
      if (totalSizeQty !== jaipurQty) {
        alert("Size total must equal Jaipur stock");
        return;
      }
    }

    await api.post("/online/config", {
      productid: selected.productid,
      is_online: onlineEnabled,
      enabledSizes,
      sizeQty
    });

    alert("Saved");
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div style={{ padding: 20, display: "flex", gap: 20 }}>
      <div style={{ width: 300 }}>
        <h3>Designs</h3>
        {products.map(p => (
          <div
            key={p.productid}
            onClick={() => selectProduct(p)}
            style={{
              padding: 6,
              cursor: "pointer",
              background: selected?.productid === p.productid ? "#eef" : "#fff"
            }}
          >
            {p.item}
            {p.is_online && <span style={{ color: "green" }}> ● online</span>}
          </div>
        ))}
      </div>

      {selected && (
        <div style={{ flex: 1 }}>
          <h3>{selected.item}</h3>
          <div><b>Jaipur Stock:</b> {jaipurQty}</div>

          <label>
            <input
              type="checkbox"
              checked={onlineEnabled}
              onChange={e => setOnlineEnabled(e.target.checked)}
            />
            Enable Online
          </label>

          {onlineEnabled && (
            <>
              <h4>Sizes</h4>
              {ALL_SIZES.map(sz => (
                <label key={sz} style={{ marginRight: 8 }}>
                  <input
                    type="checkbox"
                    checked={enabledSizes.includes(sz)}
                    onChange={() => toggleSize(sz)}
                  />
                  {sz}
                </label>
              ))}

              <h4>Jaipur Size Stock</h4>
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
                  />
                </div>
              ))}

              <div>
                <b>Total:</b> {totalSizeQty} / {jaipurQty}
              </div>
            </>
          )}

          <button onClick={onSave} style={{ marginTop: 12 }}>
            Save
          </button>
          <button onClick={onExit} style={{ marginLeft: 8 }}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}
