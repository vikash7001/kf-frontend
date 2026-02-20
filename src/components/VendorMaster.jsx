import React, { useEffect, useState } from "react";
import { getVendors, addVendor } from "../services/api";

export default function VendorMaster() {

  const [vendors, setVendors] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const r = await getVendors();
    setVendors(r.data);
  }

  async function save() {
    if (!name) return;
    await addVendor({ vendor_name: name });
    setName("");
    load();
  }

  return (
    <div>
      <h2>Vendor Master</h2>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Vendor Name"
      />
      <button onClick={save}>Add</button>

      <ul>
        {vendors.map(v => (
          <li key={v.vendor_id}>{v.vendor_name}</li>
        ))}
      </ul>
    </div>
  );
}
