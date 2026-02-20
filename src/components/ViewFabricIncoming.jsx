import React, { useEffect, useState } from "react";
import { getFabricIncomingList } from "../services/api";

export default function ViewFabricIncoming() {

  const [data, setData] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const r = await getFabricIncomingList();
    setData(r.data);
  }

  return (
    <div>
      <h2>View Fabric Incoming</h2>

      <table border="1" cellPadding="6" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Lot No</th>
            <th>Fabric</th>
            <th>Quantity</th>
            <th>Date</th>
          </tr>
        </thead>

        <tbody>
          {data.map(row => (
            <tr key={row.fabric_incoming_id}>
              <td>{row.fabric_incoming_id}</td>
              <td>{row.lot_no}</td>
              <td>{row.fabric_name}</td>
              <td>{row.quantity}</td>
              <td>{row.created_at?.split("T")[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
