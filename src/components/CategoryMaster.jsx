import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function CategoryMaster({ onExit }) {
  const [name, setName] = useState("");
  const [list, setList] = useState([]);

  useEffect(() => {
    api.get("/categories").then(r => setList(r.data || []));
  }, []);

  const save = async () => {
    if (!name) return alert("Enter category");
    await api.post("/categories", { CategoryName: name });
    setName("");
    const r = await api.get("/categories");
    setList(r.data || []);
  };

  return (
    <div>
      <h3>Category Master</h3>

      <input
        placeholder="Category name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button onClick={save}>Save</button>
      <button onClick={onExit}>Back</button>

      <ul>
        {list.map(c => (
          <li key={c.CategoryID}>{c.CategoryName}</li>
        ))}
      </ul>
    </div>
  );
}
