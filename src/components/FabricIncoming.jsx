import React, { useState } from "react";

export default function FabricIncoming() {

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

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit() {
    console.log("Fabric Incoming Submit:", form);
    // API integration next step
  }

  return (
    <div>

      <h2>Fabric Incoming</h2>

      <div className="form-grid">

        <input name="entry_date" type="date" onChange={handleChange} />

        <input name="vendor_id" placeholder="Vendor ID" onChange={handleChange} />

        <input name="fabric_name" placeholder="Fabric Name" onChange={handleChange} />

        <input name="lot_no" placeholder="Lot No" onChange={handleChange} />

        <input name="quantity" placeholder="Quantity (MTR)" onChange={handleChange} />

        <input name="rate" placeholder="Rate (Optional)" onChange={handleChange} />

        <input name="fold" placeholder="Fold (Optional)" onChange={handleChange} />

        <input name="width" placeholder="Width (Optional)" onChange={handleChange} />

        <input name="location_id" placeholder="Location ID" onChange={handleChange} />

        <textarea name="remarks" placeholder="Remarks" onChange={handleChange} />

      </div>

      <button onClick={handleSubmit}>Save</button>

    </div>
  );
}
