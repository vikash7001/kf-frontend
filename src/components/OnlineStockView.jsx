import React, { useEffect, useState } from "react";
import { api } from "../services/api";

const SIZE_ORDER = [
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
  "7XL",
  "N/A"
];

const LOCATIONS = [
  {
    name: "Jaipur",
    color: "#fff176"
  },
  {
    name: "Kolkata",
    color: "#90caf9"
  },
  {
    name: "Ahmedabad",
    color: "#aed581"
  }
];

export default function OnlineStockView({ onExit }) {

  const [items, setItems] = useState([]);

  useEffect(() => {

    async function load() {

      try {

        const res = await api.get("/online/allocation/list");
        const rows = res.data || [];

        const map = {};

        rows.forEach(r => {

          if (!map[r.productid]) {

            map[r.productid] = {
  productid: r.productid,
  item: r.item,
  series: r.series,
  stock: {}
};

          }

          if (!map[r.productid].stock[r.locationname]) {
            map[r.productid].stock[r.locationname] = {};
          }

          map[r.productid]
            .stock[r.locationname][r.size_code] = Number(r.qty);

        });

        setItems(Object.values(map));

      } catch (e) {

        console.error(e);
        alert("Failed to load online stock");

      }

    }

    load();

  }, []);

  return (

    <div style={{ padding: 10 }}>

      <h2 style={{ marginBottom: 10 }}>
        Online Variant Stock
      </h2>

      <div
        style={{
          overflow: "auto",
          maxHeight: "82vh",
          border: "1px solid #999",
          background: "#fff"
        }}
      >

        <table
          style={{
            borderCollapse: "collapse",
            minWidth: 980
          }}
        >

          <thead>

            {/* ================================= */}
            {/* HEADER ROW 1 */}
            {/* ================================= */}

            <tr>

              <th
                rowSpan="2"
                style={{
                  position: "sticky",
                  left: 0,
                  top: 0,
                  zIndex: 10,
                  background: "#f5f5f5",
                  border: "1px solid #666",
                  padding: 4,
                  minWidth: 70,
                  width: 70,
                  fontSize: 12
                }}
              >
                Design
              </th>

              {LOCATIONS.map(loc => (

                <th
                  key={loc.name}
                  colSpan={SIZE_ORDER.length}
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 9,
                    background: loc.color,
                    border: "1px solid #666",
                    padding: 4,
                    textAlign: "center",
                    fontSize: 12
                  }}
                >
                  {loc.name.toUpperCase()}
                </th>

              ))}

            </tr>

            {/* ================================= */}
            {/* HEADER ROW 2 */}
            {/* ================================= */}

            <tr>

              {LOCATIONS.map(loc => (

                SIZE_ORDER.map(sz => (

                  <th
                    key={`${loc.name}-${sz}`}
                    style={{
                      position: "sticky",
                      top: 28,
                      zIndex: 8,
                      background: loc.color,
                      border: "1px solid #666",
                      padding: 2,
                      minWidth: 28,
                      width: 28,
                      textAlign: "center",
                      fontSize: 10
                    }}
                  >
                    {sz}
                  </th>

                ))

              ))}

            </tr>

          </thead>

          {/* ================================= */}
          {/* BODY */}
          {/* ================================= */}

          <tbody>

            {items.map((p, idx) => (

              <tr key={p.productid}>

                {/* DESIGN COLUMN */}

                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 7,
                    background: idx % 2 === 0 ? "#fff" : "#f8f8f8",
                    border: "1px solid #ccc",
                    padding: 3,
                    fontWeight: "bold",
                    fontSize: 12
                  }}
                >
                  {p.series} - {p.item}
                </td>

                {/* STOCK CELLS */}

                {LOCATIONS.map(loc => (

                  SIZE_ORDER.map(sz => {

                    const qty =
                      p.stock?.[loc.name]?.[sz];

                    return (

                      <td
                        key={`${p.productid}-${loc.name}-${sz}`}
                        style={{
                          border: "1px solid #ddd",
                          padding: 2,
                          textAlign: "center",
                          background: loc.color,
                          fontSize: 11
                        }}
                      >
                        {qty > 0 ? qty : "-"}
                      </td>

                    );

                  })

                ))}

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      <button
        onClick={onExit}
        style={{
          marginTop: 12
        }}
      >
        Back
      </button>

    </div>

  );

}