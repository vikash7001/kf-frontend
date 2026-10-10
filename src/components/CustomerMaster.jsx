import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

/* =====================================================
   CUSTOMER MASTER
   New customer with mobile, city, manager and follow-up
   settings in one go (same fields as Follow-ups → Customers).
===================================================== */

const EMPTY = { Name: "", Phone: "", City: "", ManagerID: "", Active: true, NextDate: "" };

function phoneDisplay(p) {
  const d = String(p || "").replace(/\D/g, "");
  return d.length === 12 && d.startsWith("91") ? d.slice(2) : (p || "");
}

export default function CustomerMaster({ onExit }) {
  const [form, setForm] = useState(EMPTY);
  const [list, setList] = useState([]);
  const [staff, setStaff] = useState([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const setF = (f, v) => setForm(p => ({ ...p, [f]: v }));

  async function load() {
    try {
      const [c, s] = await Promise.all([api.get("/followup/customers"), api.get("/followup/staff")]);
      setList(c.data || []);
      setStaff((s.data || []).filter(x => x.IsActive !== false));
    } catch {
      // older login without follow-up access: show names only
      const r = await api.get("/customers");
      setList((r.data || []).map(x => ({ CustomerID: x.CustomerID, CustomerName: x.CustomerName })));
    }
  }
  useEffect(() => { load(); }, []);

  const save = async () => {
    setMessage("");
    const name = form.Name.trim();
    if (!name) return alert("Enter customer name");

    const digits = form.Phone.replace(/\D/g, "");
    if (digits && digits.length !== 10 && !(digits.length === 12 && digits.startsWith("91"))) {
      return alert("Mobile must be a 10-digit number (or leave it empty)");
    }

    setBusy(true);
    try {
      const r = await api.post("/customers", { CustomerName: name });
      if (r.data?.existed) {
        alert(`"${r.data.CustomerName}" already exists. Edit its details in Follow-ups → Customers.`);
        return;
      }
      const id = r.data?.CustomerID;
      if (id) {
        await api.put(`/followup/customers/${id}`, {
          Phone: digits || null,
          City: form.City.trim() || null,
          ManagerID: form.ManagerID || null,
          Active: !!form.Active,
          NextDate: form.NextDate || null
        });
      }
      setMessage(`✅ ${name} added`);
      setForm(EMPTY);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || "Could not save customer");
    } finally {
      setBusy(false);
    }
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? list.filter(c => `${c.CustomerName} ${c.City || ""} ${c.Phone || ""}`.toLowerCase().includes(q))
      : list;
  }, [list, search]);

  const label = { fontSize: 12, color: "#555", display: "block", marginBottom: 3 };

  return (
    <div style={{ padding: 16 }}>
      <h3>Customer Master</h3>

      <div style={{ border: "1px solid #d9dee8", borderRadius: 6, padding: 12, background: "#f8faff", maxWidth: 900 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <div>
            <span style={label}>Customer name *</span>
            <input value={form.Name} onChange={e => setF("Name", e.target.value)} style={{ width: 200 }} />
          </div>
          <div>
            <span style={label}>Mobile (WhatsApp)</span>
            <input value={form.Phone} onChange={e => setF("Phone", e.target.value)} placeholder="10 digits" style={{ width: 130 }} />
          </div>
          <div>
            <span style={label}>City</span>
            <input value={form.City} onChange={e => setF("City", e.target.value)} style={{ width: 120 }} />
          </div>
          <div>
            <span style={label}>Manager</span>
            <select value={form.ManagerID} onChange={e => setF("ManagerID", e.target.value)} style={{ width: 160 }}>
              <option value="">— none —</option>
              {staff.map(s => (
                <option key={s.PersonID} value={s.PersonID}>
                  {s.Name}{s.Location ? ` (${s.Location})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span style={label}>First follow-up</span>
            <input type="date" value={form.NextDate} onChange={e => setF("NextDate", e.target.value)} />
          </div>
          <label style={{ display: "flex", gap: 6, alignItems: "center", paddingBottom: 4 }}>
            <input type="checkbox" checked={form.Active} onChange={e => setF("Active", e.target.checked)} />
            Follow-ups on
          </label>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          {onExit && <button onClick={onExit}>Back</button>}
          {message && <span style={{ color: "#1e8e3e", fontWeight: 600 }}>{message}</span>}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <strong>{list.length} customers</strong>
        <input placeholder="Search name, city, mobile" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
      </div>

      <div className="table-box" style={{ marginTop: 8 }}>
        <table className="modern-table" style={{ fontSize: 13 }}>
          <thead>
            <tr><th>Customer</th><th>Mobile</th><th>City</th><th>Manager</th><th>Follow-ups</th></tr>
          </thead>
          <tbody>
            {shown.map(c => (
              <tr key={c.CustomerID}>
                <td>{c.CustomerName}</td>
                <td>{phoneDisplay(c.Phone) || "—"}</td>
                <td>{c.City || "—"}</td>
                <td>{c.ManagerName || "—"}</td>
                <td>{c.Active === undefined ? "" : c.Active ? "On" : "Off"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
