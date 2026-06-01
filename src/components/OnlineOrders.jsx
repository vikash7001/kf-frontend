import React, {
  useEffect,
  useState
} from "react";

import {
  getOnlineOrders,
  importOnlineOrders
} from "../services/api";

export default function OnlineOrders() {

  const [orders, setOrders] =
    useState([]);

const [expandedOrder, setExpandedOrder] =
  useState(null);

const [selectedOrders, setSelectedOrders] =
  useState([]);

const [isImporting, setIsImporting] =
  useState(false);

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

    {isImporting && (

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "rgba(0,0,0,0.5)",
          zIndex: 9999,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: "bold"
        }}
      >
        Importing Orders...
        Please Wait
      </div>

    )}

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
  disabled={isImporting}
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
  disabled={isImporting}

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
  isImporting ||
  (
    selectedOrders.length > 0 &&
    !selectedOrders.includes(
      order.id
    )
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

    setSelectedOrders([]);

  } else {

    setSelectedOrders([
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
  disabled={isImporting}

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
<button
  disabled={
    isImporting ||
    selectedOrders.length === 0
  }

  onClick={async () => {

    try {
setIsImporting(true);
      const user =
        JSON.parse(
          localStorage.getItem(
            "kf_user"
          )
        );
console.log(user);
      const res =
        await importOnlineOrders({

          orderIds:
            selectedOrders,

          userName:
user?.username
        });

      console.log(
        res.data
      );
setIsImporting(false);
      alert(
        JSON.stringify(
          res.data,
          null,
          2
        )
      );
setSelectedOrders([]);

loadOrders();
} catch (err) {

  setIsImporting(false);

      console.error(err);

      alert(
        err.response?.data?.error ||
        err.message
      );

    }

  }}
>
  Import Selected Orders
</button>
    </div>

  );
}