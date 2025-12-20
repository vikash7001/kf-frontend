import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function CustomerMaster({ onExit }) {
  const [name, setName] = useState("");
  const [list, setList] = useState([]);

  useEffect(() => {
    api.get("/customers").then(r => setList(r.data || []));
  }, []);

  const save = async () => {
    if (!name) return alert("Enter customer");
    await api.post("/customers", { CustomerName: name });
    setName("");
    const r = await api.get("/customers");
    setList(r.data || []);
  };

  return (
    <div>
      <h3>Customer Master</h3>

      <input
        placeholder="Customer name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button onClick={save}>Save</button>
      <button onClick={onExit}>Back</button>

      <ul>
        {list.map(c => (
          <li key={c.CustomerID}>{c.CustomerName}</li>
        ))}
      </ul>
    </div>
  );
}
