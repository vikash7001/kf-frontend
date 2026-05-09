import React, { useEffect, useState } from "react";
import { api } from "../services/api";

const ALL_SIZES = [
  "S","M","L","XL","XXL",
  "3XL","4XL","5XL","6XL","7XL"
];

const LOCATIONS = [
  {
    locationid: 1,
    locationname: "Jaipur",
    stockField: "jaipurqty"
  },
  {
    locationid: 2,
    locationname: "Kolkata",
    stockField: "kolkataqty"
  },
  {
    locationid: 3,
    locationname: "Ahmedabad",
    stockField: "ahmedabadqty"
  }
];

export default function OnlineEnablement({ onExit }) {

  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);

  const [onlineEnabled, setOnlineEnabled] =
    useState(false);

  const [enabledSizes, setEnabledSizes] =
    useState([]);

  const [sizeQty, setSizeQty] =
    useState({});

  const [availableStock, setAvailableStock] =
    useState({});

  const [enabledLocations, setEnabledLocations] =
    useState([]);

  // ------------------------------------------------
  // LOAD PRODUCTS
  // ------------------------------------------------

  useEffect(() => {

    async function load() {

      const res =
        await api.get("/online/products");

      const rows = res.data || [];

      const map = {};

      rows.forEach(r => {

        map[r.productid] = {
          productid: r.productid,
          item: r.item,
          seriesname: r.seriesname,
          categoryname: r.categoryname,
          is_online: r.is_online === true
        };

      });

      setProducts(Object.values(map));

    }

    load().catch(() => {
      alert("Failed to load products");
    });

  }, []);

  // ------------------------------------------------
  // SELECT PRODUCT
  // ------------------------------------------------

  const selectProduct = async (p) => {

    try {

      setSelected(p);

      setOnlineEnabled(p.is_online);

      // --------------------------------------------
      // LOAD ALLOCATIONS
      // --------------------------------------------

      const allocRes =
        await api.get(
          `/online/allocation/${p.productid}`
        );

      const allocRows =
        allocRes.data || [];

      const sizes = [];

      const qtyMap = {};

      const locationList = [];

      allocRows.forEach(r => {

        // ----------------------------------------
        // ENABLED SIZE
        // ----------------------------------------

        if (!sizes.includes(r.size_code)) {
          sizes.push(r.size_code);
        }

        // ----------------------------------------
        // ENABLED LOCATION
        // ----------------------------------------

        if (
          !locationList.includes(r.locationname)
        ) {
          locationList.push(r.locationname);
        }

        // ----------------------------------------
        // LOCATION GROUP
        // ----------------------------------------

        if (!qtyMap[r.locationname]) {
          qtyMap[r.locationname] = {};
        }

        // ----------------------------------------
        // SIZE QTY
        // ----------------------------------------

        qtyMap[r.locationname][r.size_code] =
          Number(r.qty);

      });

      setEnabledSizes(sizes);

      setSizeQty(qtyMap);

      setEnabledLocations(locationList);

      // --------------------------------------------
      // LOAD AVAILABLE STOCK
      // --------------------------------------------

      const stockRes =
  await api.get(
    `/online/product-stock/${p.productid}`
  );

const stock =
  stockRes.data || {};

      setAvailableStock({
        Jaipur:
          Number(stock.jaipurqty || 0),

        Kolkata:
          Number(stock.kolkataqty || 0),

        Ahmedabad:
          Number(stock.ahmedabadqty || 0)
      });

    } catch (e) {

      console.error(e);

      alert("Failed to load product");

    }
  };

  // ------------------------------------------------
  // TOGGLE SIZE
  // ------------------------------------------------

  const toggleSize = (sz) => {

    setEnabledSizes(prev =>
      prev.includes(sz)
        ? prev.filter(x => x !== sz)
        : [...prev, sz]
    );
  };

  // ------------------------------------------------
  // TOGGLE LOCATION
  // ------------------------------------------------

  const toggleLocation = (loc) => {

    setEnabledLocations(prev =>
      prev.includes(loc)
        ? prev.filter(x => x !== loc)
        : [...prev, loc]
    );
  };

  // ------------------------------------------------
  // UPDATE QTY
  // ------------------------------------------------

  const updateQty = (
    location,
    size,
    value
  ) => {

    setSizeQty(prev => ({
      ...prev,

      [location]: {
        ...(prev[location] || {}),
        [size]: Number(value)
      }
    }));
  };

  // ------------------------------------------------
  // SAVE
  // ------------------------------------------------

  const onSave = async () => {

    if (!selected) return;

    const allocations = [];

    LOCATIONS.forEach(loc => {

      const locationname =
        loc.locationname;

      if (
        !enabledLocations.includes(
          locationname
        )
      ) {
        return;
      }

      const sizes =
        sizeQty[locationname] || {};

      Object.entries(sizes)
        .forEach(([size, qty]) => {

        if (
          !enabledSizes.includes(size)
        ) {
          return;
        }

        const q =
          Number(qty || 0);

        // ----------------------------------------
        // VALIDATION
        // ----------------------------------------

        if (
          q >
          Number(
            availableStock[
              locationname
            ] || 0
          )
        ) {

          alert(
            `${locationname} allocation exceeds available stock`
          );

          throw new Error(
            "Allocation exceeds stock"
          );
        }

        if (q <= 0) return;

        allocations.push({
          locationid: loc.locationid,
          size_code: size,
          qty: q
        });

      });

    });

    await api.post(
      "/online/allocation/save",
      {
        productid:
          selected.productid,

        is_online:
          onlineEnabled,

        enabledSizes,

        allocations
      }
    );

    alert("Saved");

  };

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------

  return (

    <div
      style={{
        padding: 20,
        display: "flex",
        gap: 20
      }}
    >

      {/* -------------------------------- */}
      {/* LEFT PANEL */}
      {/* -------------------------------- */}

      <div style={{ width: 300 }}>

        <h3>Online Products</h3>

        {products.map(p => (

          <div
            key={p.productid}
            onClick={() =>
              selectProduct(p)
            }

            style={{
              padding: 6,
              cursor: "pointer",

              background:
                selected?.productid ===
                p.productid
                  ? "#eef"
                  : "#fff"
            }}
          >

            {p.item}

            {p.is_online && (
              <span
                style={{
                  color: "green"
                }}
              >
                {" "}●
              </span>
            )}

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

              onChange={e =>
                setOnlineEnabled(
                  e.target.checked
                )
              }
            />

            Enable Online

          </label>

          {/* -------------------------------- */}
          {/* SIZES */}
          {/* -------------------------------- */}

          <h4 style={{ marginTop: 20 }}>
            Enabled Sizes
          </h4>

          {ALL_SIZES.map(sz => (

            <label
              key={sz}
              style={{
                marginRight: 10
              }}
            >

              <input
                type="checkbox"

                checked={
                  enabledSizes.includes(sz)
                }

                onChange={() =>
                  toggleSize(sz)
                }
              />

              {sz}

            </label>

          ))}

          {/* -------------------------------- */}
          {/* LOCATIONS */}
          {/* -------------------------------- */}

          <div style={{ marginTop: 25 }}>

            {LOCATIONS.map(loc => {

              const locationname =
                loc.locationname;

              const enabled =
                enabledLocations.includes(
                  locationname
                );

              return (

                <div
                  key={locationname}

                  style={{
                    border: "1px solid #ddd",
                    padding: 12,
                    marginBottom: 20
                  }}
                >

                  {/* ------------------------ */}
                  {/* LOCATION HEADER */}
                  {/* ------------------------ */}

                  <div
                    style={{
                      marginBottom: 12
                    }}
                  >

                    <label>

                      <input
                        type="checkbox"

                        checked={enabled}

                        onChange={() =>
                          toggleLocation(
                            locationname
                          )
                        }
                      />

                      <b>
                        {" "}
                        {locationname}
                      </b>

                    </label>

                    <span
                      style={{
                        marginLeft: 12,
                        color: "#555"
                      }}
                    >
                      Available:
                      {" "}
                      {
                        availableStock[
                          locationname
                        ] || 0
                      }
                    </span>

                  </div>

                  {/* ------------------------ */}
                  {/* SIZE INPUTS */}
                  {/* ------------------------ */}

                  {enabled && (

                    <div>

                      {enabledSizes.map(sz => (

                        <div
                          key={`${locationname}-${sz}`}

                          style={{
                            marginBottom: 8
                          }}
                        >

                          {sz}

                          <input
                            type="number"

                            value={
                              sizeQty?.[
                                locationname
                              ]?.[sz] || ""
                            }

                            onChange={e =>
                              updateQty(
                                locationname,
                                sz,
                                e.target.value
                              )
                            }

                            style={{
                              marginLeft: 8
                            }}
                          />

                        </div>

                      ))}

                    </div>

                  )}

                </div>

              );

            })}

          </div>

          {/* -------------------------------- */}
          {/* ACTIONS */}
          {/* -------------------------------- */}

          <button onClick={onSave}>
            Save
          </button>

          <button
            onClick={onExit}
            style={{
              marginLeft: 8
            }}
          >
            Back
          </button>

        </div>

      )}

    </div>
  );
}