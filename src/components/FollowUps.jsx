import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

/* =====================================================
   CUSTOMER FOLLOW-UPS
   Tabs: Customers · Staff · Old sales cleanup
   Click a customer name to open their timeline.
===================================================== */

const LANG_LABEL = { en: "English", hi: "Hindi", hinglish: "Hinglish" };

function todayStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function daysAgo(value) {
  if (!value) return null;
  const ms = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function agoText(value) {
  const d = daysAgo(value);
  if (d === null) return "—";
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

function fmtDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}

function fmtDate(value) {
  if (!value) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + "T00:00:00") : new Date(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function phoneDisplay(p) {
  if (!p) return "";
  return p.startsWith("91") && p.length === 12 ? p.slice(2) : p;
}

function statusOf(c) {
  const today = todayStr();
  if (!c.Active) return { key: "paused", label: "Paused", color: "#9aa3b2" };
  if (!c.ManagerID) return { key: "nomanager", label: "No manager", color: "#9aa3b2" };
  if (!c.NextDate && !c.LastUpdateAt) return { key: "overdue", label: "Never updated", color: "#d93025" };
  if (c.NextDate && c.NextDate > today) return { key: "ok", label: "Up to date", color: "#1e8e3e" };
  if (c.NextDate === today) return { key: "due", label: "Due today", color: "#e8a600" };
  return { key: "overdue", label: "Overdue", color: "#d93025" };
}

const tabBtn = active => ({
  padding: "8px 16px",
  border: "1px solid #d9dee8",
  borderBottom: active ? "2px solid #1c3faa" : "1px solid #d9dee8",
  background: active ? "#fff" : "#f4f7fb",
  fontWeight: active ? 600 : 400,
  cursor: "pointer",
  marginRight: 6,
  borderRadius: "4px 4px 0 0"
});

const smallBtn = {
  padding: "4px 12px",
  border: "none",
  borderRadius: 4,
  background: "#1c3faa",
  color: "#fff",
  cursor: "pointer"
};

export default function FollowUps() {
  const [tab, setTab] = useState("customers");
  const [timelineFor, setTimelineFor] = useState(null);

  return (
    <div className="panel">
      <h2>Customer Follow-ups</h2>

      <div style={{ marginBottom: 12 }}>
        <button style={tabBtn(tab === "customers")} onClick={() => setTab("customers")}>Customers</button>
        <button style={tabBtn(tab === "staff")} onClick={() => setTab("staff")}>Staff</button>
        <button style={tabBtn(tab === "cleanup")} onClick={() => setTab("cleanup")}>Old sales cleanup</button>
      </div>

      {tab === "customers" && <CustomersTab onOpen={setTimelineFor} />}
      {tab === "staff" && <StaffTab />}
      {tab === "cleanup" && <CleanupTab />}

      {timelineFor && (
        <TimelineModal customer={timelineFor} onClose={() => setTimelineFor(null)} />
      )}
    </div>
  );
}

/* =====================================================
   CUSTOMERS TAB
===================================================== */
function CustomersTab({ onOpen }) {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [edits, setEdits] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        api.get("/followup/customers"),
        api.get("/followup/staff")
      ]);
      setRows(c.data || []);
      setStaff(s.data || []);
      setEdits({});
    } catch {
      alert("Could not load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const valueOf = (c, field) =>
    edits[c.CustomerID] && field in edits[c.CustomerID] ? edits[c.CustomerID][field] : c[field];

  const change = (id, field, value) =>
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));

  async function save(c) {
    const e = edits[c.CustomerID];
    if (!e) return;
    const body = { ...e };
    if ("Phone" in body) body.Phone = body.Phone ? String(body.Phone).replace(/\D/g, "") : null;
    if ("NextDate" in body && !body.NextDate) body.NextDate = null;
    setSavingId(c.CustomerID);
    try {
      await api.put(`/followup/customers/${c.CustomerID}`, body);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(c => {
      if (q && !(`${c.CustomerName} ${c.City || ""} ${c.Phone || ""} ${c.ManagerName || ""}`.toLowerCase().includes(q))) return false;
      if (managerFilter && c.ManagerID !== managerFilter) return false;
      const st = statusOf(c).key;
      if (filter === "due" && st !== "due") return false;
      if (filter === "overdue" && st !== "overdue") return false;
      if (filter === "nomanager" && c.ManagerID) return false;
      if (filter === "nophone" && c.Phone) return false;
      return true;
    });
  }, [rows, search, filter, managerFilter]);

  const counts = useMemo(() => {
    const n = { total: rows.length, ok: 0, due: 0, overdue: 0, nomanager: 0 };
    rows.forEach(c => { const k = statusOf(c).key; if (k in n) n[k]++; });
    return n;
  }, [rows]);

  if (loading) return <div>Loading…</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 13 }}>
        <span><b>{counts.total}</b> customers</span>
        <span style={{ color: "#1e8e3e" }}>● {counts.ok} up to date</span>
        <span style={{ color: "#e8a600" }}>● {counts.due} due today</span>
        <span style={{ color: "#d93025" }}>● {counts.overdue} overdue</span>
        <span style={{ color: "#9aa3b2" }}>● {counts.nomanager} without manager</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          placeholder="Search name, city, phone, manager…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="due">Due today</option>
          <option value="overdue">Overdue / never updated</option>
          <option value="nomanager">No manager</option>
          <option value="nophone">No phone</option>
        </select>
        <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)}>
          <option value="">All managers</option>
          {staff.map(s => <option key={s.PersonID} value={s.PersonID}>{s.Name}</option>)}
        </select>
      </div>

      <div className="table-box">
        <table className="modern-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Customer</th>
              <th>City</th>
              <th>Phone</th>
              <th>Manager</th>
              <th>Next follow-up</th>
              <th>Last update</th>
              <th>Last order</th>
              <th>On</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => {
              const st = statusOf(c);
              const dirty = !!edits[c.CustomerID];
              return (
                <tr key={c.CustomerID}>
                  <td>
                    <span style={{ color: st.color, fontWeight: 600, whiteSpace: "nowrap" }}>● {st.label}</span>
                  </td>
                  <td>
                    <a href="#timeline" onClick={e => { e.preventDefault(); onOpen(c); }}
                       style={{ color: "#1c3faa", fontWeight: 600 }}>
                      {c.CustomerName}
                    </a>
                  </td>
                  <td>
                    <input style={{ width: 80 }} value={valueOf(c, "City") || ""}
                           onChange={e => change(c.CustomerID, "City", e.target.value)} />
                  </td>
                  <td>
                    <input style={{ width: 96 }} placeholder="Mobile"
                           value={phoneDisplay(valueOf(c, "Phone") || "")}
                           onChange={e => change(c.CustomerID, "Phone", e.target.value)} />
                  </td>
                  <td>
                    <select style={{ maxWidth: 120 }} value={valueOf(c, "ManagerID") || ""}
                            onChange={e => change(c.CustomerID, "ManagerID", e.target.value || null)}>
                      <option value="">— none —</option>
                      {staff.map(s => <option key={s.PersonID} value={s.PersonID}>{s.Name}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="date" style={{ width: 128, fontSize: 12 }} value={valueOf(c, "NextDate") || ""}
                           onChange={e => change(c.CustomerID, "NextDate", e.target.value)} />
                  </td>
                  <td style={{ maxWidth: 150 }}>
                    <div style={{ fontSize: 12, color: "#666" }}>{agoText(c.LastUpdateAt)}</div>
                    <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                         title={c.LastUpdateText || ""}>
                      {c.LastUpdateText || ""}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{c.LastSaleDate ? agoText(c.LastSaleDate) : "—"}</td>
                  <td>
                    <input type="checkbox" checked={!!valueOf(c, "Active")}
                           onChange={e => change(c.CustomerID, "Active", e.target.checked)} />
                  </td>
                  <td>
                    <button style={{ ...smallBtn, opacity: dirty ? 1 : 0.35 }}
                            disabled={!dirty || savingId === c.CustomerID}
                            onClick={() => save(c)}>
                      {savingId === c.CustomerID ? "…" : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: "center", color: "#888" }}>No customers match</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =====================================================
   STAFF TAB
===================================================== */
const STAFF_TYPES = ["Admin", "Manager", "Employee"];
const EMPTY_STAFF = { FirstName: "", LastName: "", Mobile: "", Type: "Employee", Location: "", Language: "hinglish", DailyBatch: 20 };

function StaffTab() {
  const [rows, setRows] = useState([]);
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_STAFF);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await api.get("/followup/staff");
      setRows(r.data || []);
      setEdits({});
    } catch {
      alert("Could not load staff");
    }
  }
  useEffect(() => { load(); }, []);

  const valueOf = (s, f) => edits[s.PersonID] && f in edits[s.PersonID] ? edits[s.PersonID][f] : s[f];
  const change = (id, f, v) => setEdits(p => ({ ...p, [id]: { ...(p[id] || {}), [f]: v } }));
  const setF = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const errorText = err =>
    err.response?.status === 403 ? "Only an Admin can add or change staff." : (err.response?.data?.error || "Failed");

  async function save(s) {
    const body = { ...(edits[s.PersonID] || {}) };
    if ("DailyBatch" in body) body.DailyBatch = Number(body.DailyBatch);
    setSavingId(s.PersonID);
    try {
      await api.put(`/followup/staff/${s.PersonID}`, body);
      await load();
    } catch (err) {
      alert(errorText(err));
    } finally {
      setSavingId(null);
    }
  }

  async function addStaff(promote = false) {
    const mobile = String(form.Mobile).replace(/\D/g, "");
    if (!form.FirstName.trim()) return alert("Please enter the first name");
    if (mobile.length !== 10 && !(mobile.length === 12 && mobile.startsWith("91"))) {
      return alert("Please enter a 10-digit mobile number");
    }
    setBusy(true);
    try {
      await api.post("/followup/staff", { ...form, Mobile: mobile, DailyBatch: Number(form.DailyBatch), Promote: promote });
      setForm(EMPTY_STAFF);
      setAdding(false);
      await load();
    } catch (err) {
      const d = err.response?.data;
      if (d?.needsPromote) {
        const ok = window.confirm(
          `${form.Mobile} is already in the WhatsApp bot as ${d.existingType}` +
          (d.existingName ? ` (${d.existingName})` : "") +
          `.\n\nChange this person to ${form.Type} (staff)?`
        );
        if (ok) { setBusy(false); return addStaff(true); }
      } else {
        alert(errorText(err));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ fontSize: 13, color: "#555", margin: 0 }}>
          Staff (Admin, Manager, Employee) get their daily follow-up batch on WhatsApp in their chosen language.
          They are the same people the WhatsApp bot knows.
        </p>
        {!adding && (
          <button style={smallBtn} onClick={() => setAdding(true)}>+ Add staff</button>
        )}
      </div>

      {adding && (
        <div style={{ border: "1px solid #d9dee8", borderRadius: 4, padding: 12, marginBottom: 12, background: "#f8faff" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Add staff member</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input placeholder="First name *" value={form.FirstName} onChange={e => setF("FirstName", e.target.value)} style={{ width: 120 }} />
            <input placeholder="Last name" value={form.LastName} onChange={e => setF("LastName", e.target.value)} style={{ width: 120 }} />
            <input placeholder="Mobile (10 digits) *" value={form.Mobile} onChange={e => setF("Mobile", e.target.value)} style={{ width: 140 }} />
            <select value={form.Type} onChange={e => setF("Type", e.target.value)}>
              {STAFF_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input placeholder="Location" value={form.Location} onChange={e => setF("Location", e.target.value)} style={{ width: 110 }} />
            <select value={form.Language} onChange={e => setF("Language", e.target.value)}>
              {Object.entries(LANG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label style={{ fontSize: 12 }}>
              Daily batch{" "}
              <input type="number" min={1} max={100} value={form.DailyBatch}
                     onChange={e => setF("DailyBatch", e.target.value)} style={{ width: 60 }} />
            </label>
            <button style={smallBtn} disabled={busy} onClick={() => addStaff(false)}>{busy ? "Saving…" : "Add"}</button>
            <button style={{ ...smallBtn, background: "#9aa3b2" }} disabled={busy}
                    onClick={() => { setAdding(false); setForm(EMPTY_STAFF); }}>Cancel</button>
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
            Ask them to send any message (e.g. "hi") to the Karni Fashions WhatsApp number once, so their first batch arrives directly.
          </div>
        </div>
      )}

      <div className="table-box">
        <table className="modern-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Name</th><th>Mobile</th><th>Type</th><th>Location</th><th>Customers</th>
              <th>Bot language</th><th>Daily batch</th><th>Follow-ups on</th><th>Active</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => {
              const dirty = !!edits[s.PersonID];
              const active = valueOf(s, "IsActive") !== false;
              return (
                <tr key={s.PersonID} style={{ opacity: active ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 600 }}>{s.Name || "—"}</td>
                  <td>{phoneDisplay(s.Mobile)}</td>
                  <td>
                    <select value={valueOf(s, "Type")} onChange={e => change(s.PersonID, "Type", e.target.value)}>
                      {STAFF_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td>
                    <input style={{ width: 90 }} value={valueOf(s, "Location") || ""}
                           onChange={e => change(s.PersonID, "Location", e.target.value)} />
                  </td>
                  <td>{s.Customers}</td>
                  <td>
                    <select value={valueOf(s, "Language") || "hinglish"}
                            onChange={e => change(s.PersonID, "Language", e.target.value)}>
                      {Object.entries(LANG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="number" min={1} max={100} style={{ width: 60 }}
                           value={valueOf(s, "DailyBatch") ?? 20}
                           onChange={e => change(s.PersonID, "DailyBatch", e.target.value)} />
                  </td>
                  <td>
                    <input type="checkbox" checked={!!valueOf(s, "FollowupEnabled")}
                           onChange={e => change(s.PersonID, "FollowupEnabled", e.target.checked)} />
                  </td>
                  <td>
                    <input type="checkbox" checked={active}
                           onChange={e => change(s.PersonID, "IsActive", e.target.checked)} />
                  </td>
                  <td>
                    <button style={{ ...smallBtn, opacity: dirty ? 1 : 0.35 }}
                            disabled={!dirty || savingId === s.PersonID}
                            onClick={() => save(s)}>
                      {savingId === s.PersonID ? "…" : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: "center", color: "#888" }}>
                No staff yet. Click "+ Add staff".
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =====================================================
   OLD SALES CLEANUP TAB
===================================================== */
function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function similarity(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return 1 - d[m][n] / Math.max(m, n);
}

function CleanupTab() {
  const [names, setNames] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [choice, setChoice] = useState({});
  const [busy, setBusy] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([
        api.get("/followup/unlinked-sales"),
        api.get("/customers")
      ]);
      const cust = c.data || [];
      setCustomers(cust);
      setNames(u.data || []);

      // suggest the closest existing customer name
      const pre = {};
      (u.data || []).forEach(row => {
        let best = null, score = 0;
        cust.forEach(cu => {
          const s = similarity(row.Name, cu.CustomerName);
          if (s > score) { score = s; best = cu; }
        });
        if (best && score >= 0.75) pre[row.Name] = String(best.CustomerID);
      });
      setChoice(pre);
    } catch {
      alert("Could not load old sales");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function link(row) {
    const id = choice[row.Name];
    if (!id) return alert("Choose a customer first");
    setBusy(row.Name);
    try {
      await api.post("/followup/link-sales", { Name: row.Name, CustomerID: Number(id) });
      setNames(prev => prev.filter(n => n.Name !== row.Name));
    } catch (err) {
      alert(err.response?.data?.error || "Link failed");
    } finally {
      setBusy(null);
    }
  }

  async function createAndLink(row) {
    if (!window.confirm(`Create "${row.Name}" as a new customer and link its ${row.Sales} sale(s)?`)) return;
    setBusy(row.Name);
    try {
      const c = await api.post("/customers", { CustomerName: row.Name });
      await api.post("/followup/link-sales", { Name: row.Name, CustomerID: c.data.CustomerID });
      setNames(prev => prev.filter(n => n.Name !== row.Name));
    } catch (err) {
      alert(err.response?.data?.error || "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div>
      <p style={{ fontSize: 13, color: "#555", marginTop: 0 }}>
        These old sales were typed with a customer name that doesn't exactly match the customer list.
        Link each name to the right customer once, so their orders show on the timeline and in
        new-design suggestions. A close match is pre-selected where found — please check it.
      </p>
      {names.length === 0 ? (
        <div style={{ color: "#1e8e3e", fontWeight: 600 }}>✓ All sales are linked to customers.</div>
      ) : (
        <div className="table-box">
          <table className="modern-table">
            <thead>
              <tr><th>Name typed in sales</th><th>Sales</th><th>Last sale</th><th>Belongs to customer</th><th></th></tr>
            </thead>
            <tbody>
              {names.map(row => (
                <tr key={row.Name}>
                  <td style={{ fontWeight: 600 }}>{row.Name}</td>
                  <td>{row.Sales}</td>
                  <td>{fmtDate(row.LastDate)}</td>
                  <td>
                    <select value={choice[row.Name] || ""}
                            onChange={e => setChoice(p => ({ ...p, [row.Name]: e.target.value }))}>
                      <option value="">— choose —</option>
                      {customers.map(c => <option key={c.CustomerID} value={c.CustomerID}>{c.CustomerName}</option>)}
                    </select>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button style={smallBtn} disabled={busy === row.Name} onClick={() => link(row)}>Link</button>{" "}
                    <button style={{ ...smallBtn, background: "#5f6b7a" }} disabled={busy === row.Name}
                            onClick={() => createAndLink(row)}>New customer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   TIMELINE (pop-up)
===================================================== */
function TimelineModal({ customer, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/followup/timeline/${customer.CustomerID}`)
      .then(r => setData(r.data))
      .catch(() => setData({ activity: [], sales: [], error: true }));
  }, [customer.CustomerID]);

  const entries = useMemo(() => {
    if (!data) return [];
    const a = (data.activity || []).map(x => ({ type: "activity", at: x.At, ...x }));
    const s = (data.sales || []).map(x => ({ type: "sale", at: x.At, ...x }));
    return [...a, ...s].sort((p, q) => new Date(q.at) - new Date(p.at));
  }, [data]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", justifyContent: "flex-end", zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        width: "min(560px, 100%)", height: "100%", background: "#fff",
        overflowY: "auto", padding: 20, boxShadow: "-4px 0 16px rgba(0,0,0,0.15)"
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{customer.CustomerName}</div>
            <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
              {[customer.City, customer.ManagerName && `Manager: ${customer.ManagerName}`,
                customer.Phone && `📞 ${phoneDisplay(customer.Phone)}`].filter(Boolean).join(" · ")}
            </div>
            <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
              Next follow-up: <b>{fmtDate(customer.NextDate)}</b> · Last order: <b>{customer.LastSaleDate ? agoText(customer.LastSaleDate) : "—"}</b>
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize: 18, border: "none", background: "none", cursor: "pointer" }}>✕</button>
        </div>

        <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e5e9f2" }} />

        {!data && <div>Loading…</div>}
        {data?.error && <div style={{ color: "#d93025" }}>Could not load timeline</div>}
        {data && !data.error && entries.length === 0 && (
          <div style={{ color: "#888" }}>No updates or orders yet.</div>
        )}

        {entries.map(e => (
          <div key={`${e.type}-${e.ID || e.SalesID}`} style={{
            borderLeft: `3px solid ${e.type === "sale" ? "#1c3faa" : e.Important ? "#d93025" : "#c7cede"}`,
            padding: "6px 0 10px 12px", marginBottom: 8
          }}>
            <div style={{ fontSize: 12, color: "#777" }}>{fmtDateTime(e.at)}</div>
            <TimelineEntry e={e} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineEntry({ e }) {
  if (e.type === "sale") {
    const items = (e.Items || []).map(i => `${i.item} × ${i.qty}`).join(", ");
    return (
      <div>
        <div style={{ fontWeight: 600 }}>🧾 Sale · {e.Location} · {e.TotalQty} pcs</div>
        {items && <div style={{ fontSize: 13, color: "#444" }}>{items}</div>}
      </div>
    );
  }

  const by = e.By ? ` (${e.By})` : "";
  switch (e.Kind) {
    case "UPDATE":
      return (
        <div>
          <div style={{ fontWeight: 600 }}>
            💬 Update{by} {e.Important && <span style={{ color: "#d93025" }}>· important</span>}
          </div>
          <div style={{ whiteSpace: "pre-wrap" }}>{e.Note}</div>
          {e.NextDate && <div style={{ fontSize: 12, color: "#666" }}>Next follow-up: {fmtDate(e.NextDate)}</div>}
        </div>
      );
    case "NO_CONTACT":
      return (
        <div>
          <div style={{ fontWeight: 600 }}>📵 Couldn't reach{by}</div>
          {e.NextDate && <div style={{ fontSize: 12, color: "#666" }}>Try again: {fmtDate(e.NextDate)}</div>}
        </div>
      );
    case "SKIP":
      return <div style={{ color: "#666" }}>⏭ Skipped{by}</div>;
    case "LEAD_SENT": {
      const m = e.Meta || {};
      return (
        <div>
          <div style={{ fontWeight: 600 }}>🆕 New design shared{by}</div>
          <div style={{ fontSize: 13 }}>
            {(m.items || []).join(", ")}{m.series ? ` · ${m.series}` : ""}{m.basis === "category" ? " (by category)" : ""}
          </div>
        </div>
      );
    }
    case "DESIGNS_SENT": {
      const m = e.Meta || {};
      const n = (m.items || []).length;
      return (
        <div>
          <div style={{ fontWeight: 600 }}>
            📸 {n} design photo{n === 1 ? "" : "s"} sent on WhatsApp{m.by ? ` (${m.by})` : ""}
          </div>
          <div style={{ fontSize: 13 }}>{(m.items || []).join(", ")}</div>
          {m.mode !== "SENT" && (
            <div style={{ fontSize: 12, color: "#666" }}>Delivered when the customer taps View</div>
          )}
        </div>
      );
    }
    default:
      return <div>{e.Kind}{by} {e.Note || ""}</div>;
  }
}
