import React, { useEffect, useState } from "react";
import { getJobWorkers, addJobWorker } from "../services/api";

export default function JobWorkerMaster() {

  const [workers, setWorkers] = useState([]);
  const [name, setName] = useState("");
  const [processId, setProcessId] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const r = await getJobWorkers();
    setWorkers(r.data);
  }

  async function save() {
    if (!name || !processId) return;
    await addJobWorker({
      jobworker_name: name,
      process_id: Number(processId)
    });
    setName("");
    setProcessId("");
    load();
  }

  return (
    <div>
      <h2>Job Worker Master</h2>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Job Worker Name"
      />

      <input
        value={processId}
        onChange={e => setProcessId(e.target.value)}
        placeholder="Process ID"
      />

      <button onClick={save}>Add</button>

      <ul>
        {workers.map(w => (
          <li key={w.jobworker_id}>
            {w.jobworker_name} ({w.process_name})
          </li>
        ))}
      </ul>
    </div>
  );
}
