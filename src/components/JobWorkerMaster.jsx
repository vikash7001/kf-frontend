import React, { useEffect, useState } from "react";
import {
  getJobWorkers,
  addJobWorker,
  getProcesses
} from "../services/api";

export default function JobWorkerMaster() {

  const [workers, setWorkers] = useState([]);
  const [processes, setProcesses] = useState([]);

  const [name, setName] = useState("");
  const [processId, setProcessId] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const w = await getJobWorkers();
      const p = await getProcesses();

      setWorkers(w.data || []);
      setProcesses(p.data || []);
    } catch (e) {
      console.error("Load error", e);
    }
  }

  async function save() {
    if (!name || !processId) return;

    try {
      await addJobWorker({
        jobworker_name: name,
        process_id: Number(processId)
      });

      setName("");
      setProcessId("");
      load();
    } catch (e) {
      console.error("Save error", e);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Job Worker Master</h2>

      {/* ---------- FORM ---------- */}
      <div style={{ marginBottom: 20 }}>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Job Worker Name"
          style={{ marginRight: 10, padding: 6 }}
        />

        <select
          value={processId}
          onChange={e => setProcessId(e.target.value)}
          style={{ marginRight: 10, padding: 6 }}
        >
          <option value="">Select Process</option>
          {processes.map(p => (
            <option key={p.process_id} value={p.process_id}>
              {p.process_name}
            </option>
          ))}
        </select>

        <button onClick={save}>Add</button>
      </div>

      {/* ---------- LIST ---------- */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#fff"
        }}
      >
        <thead style={{ background: "#f1f1f1" }}>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Process</th>
          </tr>
        </thead>
        <tbody>
          {workers.map(w => (
            <tr key={w.jobworker_id}>
              <td style={td}>{w.jobworker_name}</td>
              <td style={td}>{w.process_name}</td>
            </tr>
          ))}
          {workers.length === 0 && (
            <tr>
              <td colSpan="2" style={{ textAlign: "center", padding: 10 }}>
                No records
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const th = {
  padding: 8,
  borderBottom: "1px solid #ccc",
  textAlign: "left"
};

const td = {
  padding: 8,
  borderBottom: "1px solid #eee"
};
