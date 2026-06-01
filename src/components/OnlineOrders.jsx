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

      <pre
        style={{
          whiteSpace:
            "pre-wrap",
          fontSize: 12
        }}
      >
        {
          JSON.stringify(
            orders,
            null,
            2
          )
        }
      </pre>

    </div>

  );
}