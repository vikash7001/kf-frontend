import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function OnlineStockView({ onExit }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function load() {

      const res = await api.get("/online/allocation/list");
      const rows = res.data || [];

      const map = {};

      rows.forEach(r => {

        if (!map[r.productid]) {
          map[r.productid] = {
            productid: r.productid,
            item: r.item,
            seriesname: r.seriesname,
            categoryname: r.categoryname,
            locations: {}
          };
        }

        // -----------------------------------
        // LOCATION GROUP
        // -----------------------------------

        if (!map[r.productid].locations[r.locationname]) {
          map[r.productid].locations[r.locationname] = {};
        }

        // -----------------------------------
        // SIZE QTY
        // -----------------------------------

        map[r.productid]
          .locations[r.locationname][r.size_code] = Number(r.qty);

      });

      setItems(Object.values(map));

    }

    load().catch(() => alert("Failed to load online stock"));

  }, []);

  return (
    <div style={{ padding: 20 }}>

      <h3>Online Variant Stock</h3>

      {items.map(p => (

        <div
          key={p.productid}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 12
          }}
        >

          <div style={{ marginBottom: 10 }}>
            <b>{p.item}</b> — {p.seriesname} / {p.categoryname}
          </div>

          {/* -------------------------------- */}
          {/* LOCATIONS */}
          {/* -------------------------------- */}

          {Object.entries(p.locations).map(([location, sizes]) => (

            <div
              key={location}
              style={{
                marginBottom: 12,
                padding: 10,
                background: "#fafafa"
              }}
            >

              <div style={{ marginBottom: 6 }}>
                <b>{location}</b>
              </div>

              <table
                border="1"
                cellPadding="6"
                style={{
                  borderCollapse: "collapse"
                }}
              >

                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Qty</th>
                  </tr>
                </thead>

                <tbody>

                  {Object.entries(sizes).map(([sz, qty]) => (

                    <tr key={sz}>
                      <td>{sz}</td>
                      <td>{qty}</td>
                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          ))}

        </div>

      ))}

      <button onClick={onExit}>
        Back
      </button>

    </div>
  );
}