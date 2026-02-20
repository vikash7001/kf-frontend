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
    <div>

      <h2>Fabric Incoming</h2>

      {message && <div style={{ marginBottom: 10 }}>{message}</div>}

      <div className="form-grid">

        <input
          type="date"
          name="entry_date"
          value={form.entry_date}
          onChange={handleChange}
        />

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

        <input
          name="fabric_name"
          placeholder="Fabric Name"
          value={form.fabric_name}
          onChange={handleChange}
        />

        <input
          name="lot_no"
          placeholder="Lot No"
          value={form.lot_no}
          onChange={handleChange}
        />

        <input
          name="quantity"
          placeholder="Quantity (MTR)"
          value={form.quantity}
          onChange={handleChange}
        />

        <input
          name="rate"
          placeholder="Rate (Optional)"
          value={form.rate}
          onChange={handleChange}
        />

        <input
          name="fold"
          placeholder="Fold (Optional)"
          value={form.fold}
          onChange={handleChange}
        />

        <input
          name="width"
          placeholder="Width (Optional)"
          value={form.width}
          onChange={handleChange}
        />

        <select
          name="location_id"
          value={form.location_id}
          onChange={handleChange}
        >
          <option value="">Select Location</option>
          {locations.map(l => (
            <option key={l.locationid} value={l.locationid}>
              {l.locationname}
            </option>
          ))}
        </select>

        <textarea
          name="remarks"
          placeholder="Remarks"
          value={form.remarks}
          onChange={handleChange}
        />

      </div>

      <button onClick={handleSubmit}>Save</button>

    </div>
  );
}
