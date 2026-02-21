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
      setVendors(v.data || []);
      setLocations(l.data || []);
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
          Fabric Incoming
        </h2>

        {message && (
          <div style={{ marginBottom: 15, fontWeight: 600 }}>
            {message}
          </div>
        )}

        {/* Entry Date */}
        <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <label>Entry Date</label>
          <input
            type="date"
            name="entry_date"
            value={form.entry_date}
            onChange={handleChange}
          />
        </div>

        {/* Vendor */}
        <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <label>Select Vendor</label>
          <select
            name="vendor_id"
            value={form.vendor_id}
            onChange={handleChange}
          >
            <option value="">Select Vendor</option>
            {vendors.map(v => (
              <option key={v.vendor_id} value={v.vendor_id}>
                {v.vendor_name}
              </option>
            ))}
          </select>
        </div>

        {/* Fabric Name */}
        <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <label>Fabric Name</label>
          <input
            name="fabric_name"
            placeholder="Enter Fabric Name"
            value={form.fabric_name}
            onChange={handleChange}
          />
        </div>

        {/* Lot No */}
        <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <label>Lot No</label>
          <input
            name="lot_no"
            placeholder="Enter Lot No"
            value={form.lot_no}
            onChange={handleChange}
          />
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

        {/* Rate */}
        <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <label>Rate (Optional)</label>
          <input
            name="rate"
            placeholder="Enter Rate"
            value={form.rate}
            onChange={handleChange}
          />
        </div>

        {/* Fold */}
        <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <label>Fold (Optional)</label>
          <input
            name="fold"
            placeholder="Enter Fold"
            value={form.fold}
            onChange={handleChange}
          />
        </div>

        {/* Width */}
        <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <label>Width (Optional)</label>
          <input
            name="width"
            placeholder="Enter Width"
            value={form.width}
            onChange={handleChange}
          />
        </div>

        {/* Location */}
        <div className="row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <label>Select Location</label>
          <select
            name="location_id"
            value={form.location_id}
            onChange={handleChange}
          >
            <option value="">Select Location</option>
            {locations.map(l => (
              <option key={l.location_id} value={l.location_id}>
                {l.location_name}
              </option>
            ))}
          </select>
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

        {/* Save Button */}
        <div style={{ marginTop: 20 }}>
          <button onClick={handleSubmit}>
            Save Fabric Incoming
          </button>
        </div>

      </div>
    </div>
  );
}