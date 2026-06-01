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

const [expandedOrder, setExpandedOrder] =
  useState(null);

const [selectedOrders, setSelectedOrders] =
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
const selectedLocation =
  selectedOrders.length === 0
    ? null
    : orders.find(
        o =>
          o.id === selectedOrders[0]
      )?.dispatch_location;
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
<div
  style={{
    marginBottom: 10,
    fontWeight: "bold"
  }}
>
  Selected Orders:
  {" "}
  {selectedOrders.length}
{selectedLocation && (

  <div
    style={{
      marginTop: 5,
      color: "green",
      fontWeight: "bold"
    }}
  >
    Location Locked:
    {" "}
    {selectedLocation}
  </div>

)}
</div>
<table
  className="modern-table"
>
  <thead>
<tr>
  <th>Select</th>
  <th>Order No</th>
  <th>Customer</th>
  <th>Location</th>
  <th>Pieces</th>
  <th>Details</th>
</tr>
  </thead>

<tbody>

{filteredOrders.map(order => (

  <React.Fragment key={order.id}>

  <tr>

    <td>
      <input
  type="checkbox"

  disabled={
    selectedLocation &&
    selectedLocation !==
      order.dispatch_location &&
    !selectedOrders.includes(
      order.id
    )
  }

  checked={
    selectedOrders.includes(
      order.id
    )
  }

  onChange={() => {

    if (
      selectedOrders.includes(
        order.id
      )
    ) {

      const newSelection =
        selectedOrders.filter(
          x => x !== order.id
        );

      setSelectedOrders(
        newSelection
      );

    } else {

      setSelectedOrders([
        ...selectedOrders,
        order.id
      ]);

    }

  }}
/>
    </td>

    <td>
      {order.order_number}
    </td>

    <td>
      {order.addresses?.full_name}
    </td>

    <td>
      {order.dispatch_location}
    </td>

    <td>
      {order.order_items?.reduce(
        (a, b) =>
          a + Number(b.qty || 0),
        0
      )}
    </td>

    <td>

      <button
        onClick={() =>
          setExpandedOrder(
            expandedOrder === order.id
              ? null
              : order.id
          )
        }
      >
        {expandedOrder === order.id
          ? "Hide"
          : "View"}
      </button>

    </td>

  </tr>

  {expandedOrder === order.id && (
    <tr>

      <td colSpan="6">

        <table
          className="modern-table"
          style={{
            marginTop: 10
          }}
        >

          <thead>
            <tr>
              <th>Design</th>
              <th>Product</th>
              <th>Size</th>
              <th>Qty</th>
            </tr>
          </thead>

          <tbody>

            {order.order_items.map(
              item => (

                <tr key={item.id}>

                  <td>
                    {item.design_no}
                  </td>

                  <td>
                    {item.product_name}
                  </td>

                  <td>
                    {item.size}
                  </td>

                  <td>
                    {item.qty}
                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </td>

    </tr>
  )}

</React.Fragment>

))}

</tbody>

</table>

    </div>

  );
}