import React, { useEffect, useState } from "react";
import {
  getProductionDashboard,
  getProductionHistory
} from "../services/api";
import { api } from "../services/api";

export default function ProductionDashboard() {

  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobWorkers, setJobWorkers] = useState([]);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    to_jobworker_id: "",
    quantity: "",
    uom: "",
    convert_pcs: "",
    movement_date: "",
    due_date: "",
    jobworker_rate: "",
    remarks: ""
  });

  useEffect(() => {
    load();
    loadWorkers();
  }, []);

  async function load() {
    const res = await getProductionDashboard();
    setJobs(res.data || []);
  }

  async function loadWorkers() {
    const res = await api.get("/jobworkers");
    setJobWorkers(res.data || []);
  }

  async function selectJob(job) {
    setSelectedJob(job);
    setMessage("");

    const res = await getProductionHistory(job.job_id);
    setHistory(res.data || []);

    setForm({
      to_jobworker_id: "",
      quantity: "",
      uom: job.converted_pcs ? "PCS" : "MTR",
      convert_pcs: "",
      movement_date: "",
      due_date: "",
      jobworker_rate: "",
      remarks: ""
    });
  }

  async function moveNext() {

    if (!selectedJob) return;

    if (selectedJob.status === "COMPLETED") {
      setMessage("Job already completed ❌");
      return;
    }

    if (!form.to_jobworker_id || !form.quantity || !form.movement_date) {
      setMessage("Fill required fields ❌");
      return;
    }

    // Conversion validation
    const lastStage = selectedJob.process_name;

    if (
      lastStage === "STITCHING" &&
      !selectedJob.converted_pcs &&
      !form.convert_pcs
    ) {
      setMessage("Conversion to PCS required ❌");
      return;
    }

    try {

      await api.post("/production/move-next", {
        job_id: selectedJob.job_id,
        to_jobworker_id: Number(form.to_jobworker_id),
        quantity: Number(form.quantity),
        uom: selectedJob.converted_pcs ? "PCS" : "MTR",
        movement_date: form.movement_date,
        due_date: form.due_date || null,
        jobworker_rate: form.jobworker_rate
          ? Number(form.jobworker_rate)
          : null,
        remarks: form.remarks || null,
        convert_pcs: form.convert_pcs
          ? Number(form.convert_pcs)
          : null
      });

      setMessage("Moved successfully ✅");

      setSelectedJob(null);
      load();

    } catch (err) {
      console.error(err);
      setMessage("Move failed ❌");
    }
  }

  return (
    <div>
      <h2>Production Dashboard</h2>

      {message && (
        <div style={{ marginBottom: 10 }}>
          {message}
        </div>
      )}

      {/* JOB TABLE */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Job</th>
            <th>Lot</th>
            <th>Design</th>
            <th>Stage</th>
            <th>Worker</th>
            <th>MTR</th>
            <th>PCS</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(j => (
            <tr
              key={j.job_id}
              onClick={() => selectJob(j)}
              style={{
                cursor: "pointer",
                background:
                  j.live_status === "OVERDUE"
                    ? "#ffe6e6"
                    : j.live_status === "COMPLETED"
                    ? "#e6ffe6"
                    : "transparent"
              }}
            >
              <td>{j.job_id}</td>
              <td>{j.lot_no}</td>
              <td>{j.design_number}</td>
              <td>{j.process_name || j.current_stage}</td>
              <td>{j.jobworker_name || "-"}</td>
              <td>{j.initial_mtr}</td>
              <td>{j.converted_pcs || "-"}</td>
              <td>{j.live_status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MOVE PANEL */}
      {selectedJob && selectedJob.status !== "COMPLETED" && (
        <div style={{
          marginTop: 30,
          padding: 20,
          background: "#f4f4f4",
          border: "1px solid #ddd"
        }}>

          <h3>Move Job #{selectedJob.job_id}</h3>

          <select
            value={form.to_jobworker_id}
            onChange={e =>
              setForm({ ...form, to_jobworker_id: e.target.value })
            }
          >
            <option value="">Select Next Worker</option>
            <option value="0">Return To Factory (Complete)</option>

            {jobWorkers.map(w => (
              <option key={w.jobworker_id} value={w.jobworker_id}>
                {w.jobworker_name} ({w.process_name})
              </option>
            ))}
          </select>

          <input
            placeholder={`Quantity (${selectedJob.converted_pcs ? "PCS" : "MTR"})`}
            value={form.quantity}
            onChange={e =>
              setForm({ ...form, quantity: e.target.value })
            }
          />

          {/* CONVERSION FIELD */}
          {!selectedJob.converted_pcs &&
            selectedJob.process_name === "STITCHING" && (
              <input
                placeholder="Convert to PCS"
                value={form.convert_pcs}
                onChange={e =>
                  setForm({ ...form, convert_pcs: e.target.value })
                }
              />
            )}

          <input
            type="date"
            value={form.movement_date}
            onChange={e =>
              setForm({ ...form, movement_date: e.target.value })
            }
          />

          <input
            type="date"
            value={form.due_date}
            onChange={e =>
              setForm({ ...form, due_date: e.target.value })
            }
          />

          <input
            placeholder="Rate"
            value={form.jobworker_rate}
            onChange={e =>
              setForm({ ...form, jobworker_rate: e.target.value })
            }
          />

          <textarea
            placeholder="Remarks"
            value={form.remarks}
            onChange={e =>
              setForm({ ...form, remarks: e.target.value })
            }
          />

          <button onClick={moveNext}>
            Move To Next Stage
          </button>

        </div>
      )}

      {/* HISTORY PANEL */}
      {selectedJob && (
        <div style={{
          marginTop: 30,
          padding: 20,
          background: "#ffffff",
          border: "1px solid #ddd"
        }}>
          <h3>Stage History</h3>

          {history.map(h => (
            <div
              key={h.movement_id}
              style={{
                padding: 10,
                marginBottom: 10,
                borderLeft: "4px solid #007bff",
                background: "#f9f9f9"
              }}
            >
              <strong>{h.movement_date}</strong><br />
              {h.from_worker || "Factory"} → {h.to_worker || "Factory"}<br />
              Stage: {h.process_name || h.to_stage}<br />
              Qty: {h.quantity} {h.uom}<br />
              Rate: {h.jobworker_rate || "-"}<br />
              Due: {h.due_date || "-"}<br />
              Remarks: {h.remarks || "-"}
            </div>
          ))}

          {history.length === 0 && (
            <div>No movement history</div>
          )}
        </div>
      )}

    </div>
  );
}