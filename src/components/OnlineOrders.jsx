import React, {
  useEffect,
  useState
} from "react";

import {
  getOnlineOrders
} from "../services/api";

export default function OnlineOrders() {

  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

const [location, setLocation] =
  useState("All");

  async function loadOrders() {

    try {

      setLoading(true);

      const res =
        await getOnlineOrders();

      setOrders(
        res.data?.orders || []
      );

    } catch (err) {

      console.error(err);

      alert(
        "Failed to load online orders"
      );

    } finally {

      setLoading(false);

    }
  }

  useEffect(() => {

    loadOrders();

  }, []);
const filteredOrders =
  location === "All"
    ? orders
    : orders.filter(
        o =>
          o.dispatch_location ===
          location
      );

const locations = [
  "All",
  ...new Set(
    orders.map(
      o => o.dispatch_location
    )
  )
];
  return (

    <div>

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          marginBottom: 15
        }}
      >

        <h2>
          Online Orders
        </h2>

        <button
          onClick={
            loadOrders
          }
        >
          Refresh
        </button>

      </div>

      {loading && (
        <div>
          Loading...
        </div>
      )}

      <div
  style={{
    marginBottom: 15
  }}
>
  <select
    value={location}
    onChange={e =>
      setLocation(
        e.target.value
      )
    }
  >
    {locations.map(l => (
      <option
        key={l}
        value={l}
      >
        {l}
      </option>
    ))}
  </select>
</div>

<table
  className="modern-table"
>
  <thead>
    <tr>
      <th>
        Order No
      </th>

      <th>
        Customer
      </th>

      <th>
        Location
      </th>

      <th>
        Pieces
      </th>
    </tr>
  </thead>

  <tbody>

    {filteredOrders.map(
      order => (

      <tr
        key={order.id}
      >

        <td>
          {
            order.order_number
          }
        </td>

        <td>
          {
            order
              .addresses
              ?.full_name
          }
        </td>

        <td>
          {
            order
              .dispatch_location
          }
        </td>

        <td>
          {
            order
              .order_items
              ?.reduce(
                (
                  a,
                  b
                ) =>
                  a +
                  Number(
                    b.qty || 0
                  ),
                0
              )
          }
        </td>

      </tr>
    ))}

  </tbody>

</table>

    </div>

  );
}