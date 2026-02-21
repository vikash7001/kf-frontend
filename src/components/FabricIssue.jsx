import React, { useEffect, useState } from "react";
import {
  getAvailableLots,
  getJobWorkers,
  createProductionJob
} from "../services/api";

export default function FabricIssue() {

  const [lots, setLots] = useState([]);
  const [jobWorkers, setJobWorkers] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    issue_date: "",
    lot_no: "",
    design_number: "",
    jobworker_id: "",
    quantity: "",
    due_date: "",
    jobworker_rate: "",
    remarks: ""
  });

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

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "lot_no") {
      const lot = lots.find(l => l.lot_no === value);
      setSelectedLot(lot);
    }

    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit() {

    if (!selectedLot) {
      setMessage("Select lot ❌");
      return;
    }

    if (!form.design_number) {
      setMessage("Enter design number ❌");
      return;
    }

    if (!form.jobworker_id) {
      setMessage("Select job worker ❌");
      return;
    }

    if (Number(form.quantity) > Number(selectedLot.balance)) {
      setMessage("Quantity exceeds available balance ❌");
      return;
    }

    try {

      await createProductionJob({
        lot_no: form.lot_no,
        design_number: form.design_number,
        initial_mtr: Number(form.quantity),
        to_jobworker_id: Number(form.jobworker_id),
        movement_date: form.issue_date,
        due_date: form.due_date,
        jobworker_rate: Number(form.jobworker_rate) || null,
        remarks: form.remarks
      });

      setMessage("Production job created successfully ✅");

      setForm({
        issue_date: "",
        lot_no: "",
        design_number: "",
        jobworker_id: "",
        quantity: "",
        due_date: "",
        jobworker_rate: "",
        remarks: ""
      });

      setSelectedLot(null);
      loadData();

    } catch (err) {
      console.error(err);
      setMessage("Error creating production job ❌");
    }
  }

  return (
    <div>

      <h2>Create Production Job</h2>

      {message && (
        <div style={{ marginBottom: 10 }}>
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
            Location: {selectedLot.location_name} |
            Balance: {selectedLot.balance}
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
          name="jobworker_rate"
          placeholder="Job Worker Rate"
          value={form.jobworker_rate}
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

      <button onClick={handleSubmit}>
        Create Job
      </button>

    </div>
  );
}