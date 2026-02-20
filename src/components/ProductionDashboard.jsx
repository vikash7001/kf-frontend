import React, { useEffect, useState } from "react";
import { getFabricDashboard } from "../services/api";

export default function ProductionDashboard() {

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const r = await getFabricDashboard();
      setData(r.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  function statusColor(status) {
    if (status === "OVERDUE") return { color: "red", fontWeight: "bold" };
    if (status === "IN PROCESS") return { color: "orange" };
    return { color: "green" };
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>

      <h2>Production Dashboard</h2>

      <table className="erp-table" border="1" cellPadding="6" style={{ width: "100%", marginTop: 10 }}>

        <thead>
          <tr>
            <th>Lot</th>
            <th>Fabric</th>
            <th>Vendor</th>
            <th>Purchased</th>
            <th>Issued</th>
            <th>Balance</th>
            <th>Design</th>
            <th>Job Worker</th>
            <th>Process</th>
            <th>Issue Date</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td>{row.lot_no}</td>
              <td>{row.fabric_name}</td>
              <td>{row.vendor_name}</td>
              <td>{row.total_purchased}</td>
              <td>{row.total_issued}</td>
              <td>{row.balance}</td>
              <td>{row.design_number || "-"}</td>
              <td>{row.jobworker_name || "-"}</td>
              <td>{row.process_name || "-"}</td>
              <td>{row.issue_date ? row.issue_date.split("T")[0] : "-"}</td>
              <td>{row.due_date ? row.due_date.split("T")[0] : "-"}</td>
              <td style={statusColor(row.status)}>
                {row.status}
              </td>
            </tr>
          ))}
        </tbody>

      </table>

    </div>
  );
}
