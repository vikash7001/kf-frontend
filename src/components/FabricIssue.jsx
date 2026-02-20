import React, { useState } from "react";

export default function FabricIssue() {

  const [form, setForm] = useState({
    issue_date: "",
    lot_no: "",
    design_number: "",
    jobworker_id: "",
    quantity: "",
    due_date: "",
    remarks: ""
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit() {
    console.log("Fabric Issue Submit:", form);
    // API integration next step
  }

  return (
    <div>

      <h2>Fabric Issue</h2>

      <div className="form-grid">

        <input name="issue_date" type="date" onChange={handleChange} />

        <input name="lot_no" placeholder="Lot No" onChange={handleChange} />

        <input name="design_number" placeholder="Design Number" onChange={handleChange} />

        <input name="jobworker_id" placeholder="Job Worker ID" onChange={handleChange} />

        <input name="quantity" placeholder="Quantity (MTR)" onChange={handleChange} />

        <input name="due_date" type="date" onChange={handleChange} />

        <textarea name="remarks" placeholder="Remarks" onChange={handleChange} />

      </div>

      <button onClick={handleSubmit}>Issue Fabric</button>

    </div>
  );
}
