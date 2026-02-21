import React, { useEffect, useState } from "react";
import { getVendors, getLocations, postFabricIncoming } from "../services/api";

export default function FabricIncoming() {

  const [vendors, setVendors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    entry_date: "",
    vendor_id: "",
    fabric_name: "",
    lot_no: "",
    quantity: "",
    rate: "",
    fold: "",
    width: "",
    location_id: "",
    remarks: ""
  });

  useEffect(() => {
    loadMasters();
  }, []);

  async function loadMasters() {
    try {
      const v = await getVendors();
      const l = await getLocations();
      setVendors(v.data);
      setLocations(l.data);
    } catch (err) {
      console.error(err);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit() {
    try {
      await postFabricIncoming({
        ...form,
        quantity: Number(form.quantity),
        rate: form.rate ? Number(form.rate) : null
      });

      setMessage("Saved successfully ✅");

      setForm({
        entry_date: "",
        vendor_id: "",
        fabric_name: "",
        lot_no: "",
        quantity: "",
        rate: "",
        fold: "",
        width: "",
        location_id: "",
        remarks: ""
      });

    } catch (err) {
      setMessage("Error saving ❌");
      console.error(err);
    }
  }

return (
  <div className="container">
    <div className="panel">

      <h2 style={{ marginTop: 0, marginBottom: 20 }}>
        Fabric Issue
      </h2>

      {message && (
        <div style={{ marginBottom: 15, fontWeight: 600 }}>
          {message}
        </div>
      )}

      {/* Issue Date */}
      <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <label>Issue Date</label>
        <input
          type="date"
          name="issue_date"
          value={form.issue_date}
          onChange={handleChange}
        />
      </div>

      {/* Lot Selection */}
      <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <label>Select Lot</label>
        <select
          name="lot_no"
          value={form.lot_no}
          onChange={handleChange}
        >
          <option value="">Select Lot</option>
          {lots.map(l => (
            <option key={l.lot_no} value={l.lot_no}>
              {l.lot_no} (Bal: {l.balance})
            </option>
          ))}
        </select>
      </div>

      {/* Lot Info Box */}
      {selectedLot && (
        <div
          style={{
            background: "#f1f5f9",
            padding: 12,
            borderLeft: "4px solid #2563eb",
            marginBottom: 15,
            fontSize: 13
          }}
        >
          <div><b>Fabric:</b> {selectedLot.fabric_name}</div>
          <div><b>Location:</b> {selectedLot.location_name}</div>
          <div><b>Available Balance:</b> {selectedLot.balance} MTR</div>
        </div>
      )}

      {/* Design Number */}
      <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <label>Design Number</label>
        <input
          name="design_number"
          placeholder="Enter Design Number"
          value={form.design_number}
          onChange={handleChange}
        />
      </div>

      {/* Job Worker */}
      <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <label>Job Worker</label>
        <select
          name="jobworker_id"
          value={form.jobworker_id}
          onChange={handleChange}
        >
          <option value="">Select Job Worker</option>
          {jobWorkers.map(j => (
            <option key={j.jobworker_id} value={j.jobworker_id}>
              {j.jobworker_name} ({j.process_name})
            </option>
          ))}
        </select>
      </div>

      {/* Quantity */}
      <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <label>Quantity (MTR)</label>
        <input
          name="quantity"
          placeholder="Enter Quantity"
          value={form.quantity}
          onChange={handleChange}
        />
      </div>

      {/* Job Worker Rate */}
      <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <label>Job Worker Rate (Optional)</label>
        <input
          name="jobworker_rate"
          placeholder="Enter Rate"
          value={form.jobworker_rate}
          onChange={handleChange}
        />
      </div>

      {/* Due Date */}
      <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <label>Due Date</label>
        <input
          type="date"
          name="due_date"
          value={form.due_date}
          onChange={handleChange}
        />
      </div>

      {/* Remarks */}
      <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <label>Remarks</label>
        <textarea
          name="remarks"
          rows="3"
          style={{ width: "100%", padding: "8px" }}
          value={form.remarks}
          onChange={handleChange}
        />
      </div>

      {/* Button */}
      <div style={{ marginTop: 20 }}>
        <button onClick={handleSubmit}>
          Save Fabric Issue
        </button>
      </div>

    </div>
  </div>
);
}
