import React, { useEffect, useState } from "react";
import { api } from "../services/api";

const ALL_SIZES = ["S","M","L","XL","XXL","3XL","4XL","5XL","6XL","7XL"];

export default function OnlineEnablement({ onExit }) {

  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);

  const [onlineEnabled, setOnlineEnabled] = useState(false);

  const [enabledSizes, setEnabledSizes] = useState([]);

  // --------------------------------------
  // STRUCTURE:
  // {
  //   Jaipur: { M: 5, L: 3 },
  //   Kolkata: { XL: 4 }
  // }
  // --------------------------------------
  const [sizeQty, setSizeQty] = useState({});

  // --------------------------------------
  // LOAD ONLINE ALLOCATION
  // --------------------------------------
  useEffect(() => {

    async function load() {

const res = await api.get("/online/products");
      const rows = res.data || [];

      const map = {};

rows.forEach(r => {

  map[r.productid] = {
    productid: r.productid,
    item: r.item,
    seriesname: r.seriesname,
    categoryname: r.categoryname,
    is_online: r.is_online === true,
    enabledSizes: [],
    sizeQty: {}
  };

});

      setProducts(Object.values(map));

    }

    load().catch(() => {
      alert("Failed to load online allocation");
    });

  }, []);

  // --------------------------------------
  // SELECT PRODUCT
  // --------------------------------------
const selectProduct = async (p) => {

  try {

    setSelected(p);

    setOnlineEnabled(p.is_online);

    // --------------------------------
    // LOAD PRODUCT ALLOCATIONS
    // --------------------------------

    const res = await api.get(
      `/online/allocation/${p.productid}`
    );

    const rows = res.data || [];

    const sizes = [];
    const qtyMap = {};

    rows.forEach(r => {

      // ------------------------------
      // ENABLED SIZE
      // ------------------------------

      if (!sizes.includes(r.size_code)) {
        sizes.push(r.size_code);
      }

      // ------------------------------
      // LOCATION GROUP
      // ------------------------------

      if (!qtyMap[r.locationname]) {
        qtyMap[r.locationname] = {};
      }

      // ------------------------------
      // SIZE QTY
      // ------------------------------

      qtyMap[r.locationname][r.size_code] =
        Number(r.qty);

    });

    setEnabledSizes(sizes);

    setSizeQty(qtyMap);

  } catch (e) {

    console.error(e);

    alert("Failed to load allocation");

  }
};

  // --------------------------------------
  // TOGGLE SIZE
  // --------------------------------------
  const toggleSize = (sz) => {

    setEnabledSizes(prev =>
      prev.includes(sz)
        ? prev.filter(x => x !== sz)
        : [...prev, sz]
    );
  };

  // --------------------------------------
  // SAVE
  // --------------------------------------
  const onSave = async () => {

    if (!selected) return;

    const allocations = [];

    Object.entries(sizeQty).forEach(([locationname, sizes]) => {

const locationMap = {
  Jaipur: 1,
  Kolkata: 2,
  Ahmedabad: 3
};

const locationid = locationMap[locationname];

      if (!locationid) return;

      Object.entries(sizes).forEach(([size, qty]) => {

        if (!enabledSizes.includes(size)) return;

        const q = Number(qty || 0);

        if (q <= 0) return;

        allocations.push({
          locationid,
          size_code: size,
          qty: q
        });

      });

    });

    await api.post("/online/allocation/save", {
  productid: selected.productid,
  is_online: onlineEnabled,
  enabledSizes,
  allocations
});

    alert("Saved");
  };

  // --------------------------------------
  // UPDATE SIZE QTY
  // --------------------------------------
  const updateQty = (location, size, value) => {

    setSizeQty(prev => ({
      ...prev,
      [location]: {
        ...(prev[location] || {}),
        [size]: Number(value)
      }
    }));
  };

  // --------------------------------------
  // RENDER
  // --------------------------------------
  return (

    <div style={{ padding: 20, display: "flex", gap: 20 }}>

      {/* -------------------------------- */}
      {/* LEFT PANEL */}
      {/* -------------------------------- */}

      <div style={{ width: 300 }}>

        <h3>Online Products</h3>

        {products.map(p => (

          <div
            key={p.productid}
            onClick={() => selectProduct(p)}
            style={{
              padding: 6,
              cursor: "pointer",
              background:
                selected?.productid === p.productid
                  ? "#eef"
                  : "#fff"
            }}
          >
            {p.item}
          </div>

        ))}

      </div>

      {/* -------------------------------- */}
      {/* RIGHT PANEL */}
      {/* -------------------------------- */}

      {selected && (

        <div style={{ flex: 1 }}>

          <h3>
            {selected.item}
          </h3>

          <label>
            <input
              type="checkbox"
              checked={onlineEnabled}
              onChange={e => setOnlineEnabled(e.target.checked)}
            />

            Enable Online
          </label>

          {/* -------------------------------- */}
          {/* SIZES */}
          {/* -------------------------------- */}

          <h4>Enabled Sizes</h4>

          {ALL_SIZES.map(sz => (

            <label
              key={sz}
              style={{ marginRight: 8 }}
            >
              <input
                type="checkbox"
                checked={enabledSizes.includes(sz)}
                onChange={() => toggleSize(sz)}
              />

              {sz}

            </label>

          ))}

          {/* -------------------------------- */}
          {/* JAIPUR */}
          {/* -------------------------------- */}

          <div style={{ marginTop: 20 }}>

            <h4>Jaipur</h4>

            {enabledSizes.map(sz => (

              <div key={`J-${sz}`} style={{ marginBottom: 6 }}>

                {sz}

                <input
                  type="number"
                  value={sizeQty?.Jaipur?.[sz] || ""}
                  onChange={e =>
                    updateQty("Jaipur", sz, e.target.value)
                  }
                  style={{ marginLeft: 8 }}
                />

              </div>

            ))}

          </div>

          {/* -------------------------------- */}
          {/* KOLKATA */}
          {/* -------------------------------- */}

          <div style={{ marginTop: 20 }}>

            <h4>Kolkata</h4>

            {enabledSizes.map(sz => (

              <div key={`K-${sz}`} style={{ marginBottom: 6 }}>

                {sz}

                <input
                  type="number"
                  value={sizeQty?.Kolkata?.[sz] || ""}
                  onChange={e =>
                    updateQty("Kolkata", sz, e.target.value)
                  }
                  style={{ marginLeft: 8 }}
                />

              </div>

            ))}

          </div>

          {/* -------------------------------- */}
          {/* ACTIONS */}
          {/* -------------------------------- */}

          <button
            onClick={onSave}
            style={{ marginTop: 20 }}
          >
            Save
          </button>

          <button
            onClick={onExit}
            style={{ marginLeft: 8 }}
          >
            Back
          </button>

        </div>

      )}

    </div>
  );
}