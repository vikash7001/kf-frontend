import React, { useEffect, useState } from "react";
import { getProcesses, addProcess } from "../services/api";

export default function ProcessMaster() {

  const [processes, setProcesses] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const r = await getProcesses();
    setProcesses(r.data);
  }

  async function save() {
    if (!name) return;

    await addProcess({ process_name: name });
    setName("");
    load();
  }

  return (
    <div>
      <h2>Process Master</h2>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Process Name"
      />

      <button onClick={save}>Add</button>

      <ul>
        {processes.map(p => (
          <li key={p.process_id}>
            {p.process_name}
          </li>
        ))}
      </ul>
    </div>
  );
}
