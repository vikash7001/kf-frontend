import React, { useEffect, useState } from "react";
import {
  getAvailableLots,
  getJobWorkers,
  postFabricMovement
} from "../services/api";

export default function FabricIssue() {

  const [lots, setLots] = useState([]);
  const [jobWorkers, setJobWorkers] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    issue_date: "",
    lot_no: "",
    from_location_id: "",
    location_name: "",
    design_number: "",
    jobworker_id: "",
    quantity: "",
    due_date: "",
    remarks: ""
  });

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const l = await getAvailableLots();
      const j = await getJobWorkers();
      setLots(l.data || []);
      setJobWorkers(j.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  /* ================= HANDLE CHANGE ================= */

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "lot_no") {
      const lot = lots.find(l => l.lot_no === value);

      setSelectedLot(lot || null);

      setForm(prev => ({
        ...prev,
        lot_no: value,
        from_location_id: lot?.location_id || "",
        location_name: lot?.location_name || ""
      }));

      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  }

  /* ================= SUBMIT ================= */

  async function handleSubmit() {

    setMessage("");

    if (!form.issue_date) {
      setMessage("Select Issue Date ❌");
      return;
    }

    if (!selectedLot) {
      setMessage("Select Lot ❌");
      return;
    }

    if (!form.jobworker_id) {
      setMessage("Select Job Worker ❌");
      return;
    }

    if (!form.quantity || Number(form.quantity) <= 0) {
      setMessage("Enter valid quantity ❌");
      return;
    }

    if (Number(form.quantity) > Number(selectedLot.balance)) {
      setMessage("Quantity exceeds available balance ❌");
      return;
    }

    try {

      await postFabricMovement({
        lot_no: form.lot_no,
        design_number: form.design_number,
        jobworker_id: Number(form.jobworker_id),
        from_location_id: Number(form.from_location_id),
        uom: "MTR",
        qty_issued: Number(form.quantity),
        issue_date: form.issue_date,
        due_date: form.due_date || null,
        remarks: form.remarks || null
      });

      setMessage("Fabric issued successfully ✅");

      setForm({
        issue_date: "",
        lot_no: "",
        from_location_id: "",
        location_name: "",
        design_number: "",
        jobworker_id: "",
        quantity: "",
        due_date: "",
        remarks: ""
      });

      setSelectedLot(null);
      loadData();

    } catch (err) {
      setMessage("Error issuing fabric ❌");
      console.error(err);
    }
  }

  /* ================= UI ================= */

  return (
    <div>

      <h2>Fabric Issue</h2>

      {message && (
        <div style={{ marginBottom: 12, fontWeight: "bold" }}>
          {message}
        </div>
      )}

      <div className="form-grid">

        <input
          type="date"
          name="issue_date"
          value={form.issue_date}
          onChange={handleChange}
        />

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

        {selectedLot && (
          <div style={{ fontSize: 14 }}>
            Fabric: <b>{selectedLot.fabric_name}</b> |
            Purchased: {selectedLot.total_purchased} |
            Issued: {selectedLot.total_issued} |
            Balance: {selectedLot.balance}
          </div>
        )}

        {selectedLot && (
          <div style={{ fontSize: 14 }}>
            Location: <b>{form.location_name}</b>
          </div>
        )}

        <input
          name="design_number"
          placeholder="Design Number"
          value={form.design_number}
          onChange={handleChange}
        />

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

        <input
          name="quantity"
          placeholder="Quantity (MTR)"
          value={form.quantity}
          onChange={handleChange}
        />

        <input
          type="date"
          name="due_date"
          value={form.due_date}
          onChange={handleChange}
        />

        <textarea
          name="remarks"
          placeholder="Remarks"
          value={form.remarks}
          onChange={handleChange}
        />

      </div>

      <button onClick={handleSubmit}>Issue Fabric</button>

    </div>
  );
}
