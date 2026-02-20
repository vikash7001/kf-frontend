import React, { useEffect, useState } from "react";
import { getFabricMovementList } from "../services/api";

export default function ViewFabricIssue() {

  const [data, setData] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const r = await getFabricMovementList();
    setData(r.data);
  }

  return (
    <div>
      <h2>View Fabric Issue</h2>

      <table border="1" cellPadding="6" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Lot</th>
            <th>Fabric</th>
            <th>Design</th>
            <th>Job Worker</th>
            <th>Process</th>
            <th>Qty Issued</th>
            <th>Issue Date</th>
            <th>Due Date</th>
          </tr>
        </thead>

        <tbody>
          {data.map(row => (
            <tr key={row.fabric_movement_id}>
              <td>{row.fabric_movement_id}</td>
              <td>{row.lot_no}</td>
              <td>{row.fabric_name}</td>
              <td>{row.design_number}</td>
              <td>{row.jobworker_name}</td>
              <td>{row.process_name}</td>
              <td>{row.qty_issued}</td>
              <td>{row.issue_date?.split("T")[0]}</td>
              <td>{row.due_date?.split("T")[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
