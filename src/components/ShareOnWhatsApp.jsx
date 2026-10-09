import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

/* =====================================================
   SEND SELECTED DESIGN PHOTOS TO A CUSTOMER ON WHATSAPP
   Photos only (no design number / rate). Opened from the
   Stock page "Order View".
   props: designs = [{ productid, item, imageURL }], onClose
===================================================== */

const MAX = 30;

function fmtDate(v) {
  if (!v) return "";
  return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function ShareOnWhatsApp({ designs, onClose }) {
  const [customers, setCustomers] = useState(null);
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState(null);
  const [recent, setRecent] = useState({});          // productId -> date sent
  const [skipRecent, setSkipRecent] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [bizNumber, setBizNumber] = useState(null);
  const [copied, setCopied] = useState(false);

  const withPhoto = designs.filter(d => d.imageURL);
  const noPhoto = designs.length - withPhoto.length;

  useEffect(() => {
    api.get("/share/business-number")
      .then(r => setBizNumber(r.data?.number || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.get("/share/customers")
      .then(r => setCustomers(r.data || []))
      .catch(() => setError("Could not load customers"));
  }, []);

  useEffect(() => {
    setRecent({});
    if (!customer) return;
    api.get(`/share/recent/${customer.CustomerID}`)
      .then(r => {
        const m = {};
        (r.data || []).forEach(x => { m[x.ProductID] = x.At; });
        setRecent(m);
      })
      .catch(() => {});
  }, [customer]);

  const matches = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = customers || [];
    if (!s) return list.slice(0, 50);
    return list.filter(c =>
      `${c.CustomerName} ${c.City || ""} ${c.Phone || ""}`.toLowerCase().includes(s)
    ).slice(0, 50);
  }, [customers, search]);

  const toSend = withPhoto.filter(d => !(skipRecent && recent[d.productid]));
  const recentCount = withPhoto.filter(d => recent[d.productid]).length;

  // Message the staff member sends from their OWN WhatsApp, asking the
  // customer to say Hi to our business number. Once they do, the waiting
  // photos are delivered automatically (and for free).
  const sayHiText = bizNumber
    ? `Namaste! Karni Fashions ke naye designs ke photos aapke liye ready hain. ` +
      `Photos dekhne ke liye is link par tap karke "Hi" bhejiye:\nhttps://wa.me/${bizNumber}?text=Hi`
    : "";

  function openSayHi() {
    const to = String(customer?.Phone || "").replace(/\D/g, "");
    const num = to.length === 10 ? "91" + to : to;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(sayHiText)}`, "_blank", "noopener,noreferrer");
  }

  async function copySayHi() {
    try {
      await navigator.clipboard.writeText(sayHiText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this message:", sayHiText);
    }
  }

  async function send() {
    if (!customer || !toSend.length) return;
    if (toSend.length > MAX) {
      setError(`Please send at most ${MAX} photos at a time.`);
      return;
    }
    setSending(true);
    setError("");
    try {
      const r = await api.post("/share/designs", {
        CustomerID: customer.CustomerID,
        ProductIDs: toSend.map(d => d.productid)
      });
      setResult(r.data);
    } catch (e) {
      setError(e?.response?.data?.error || "Could not send photos");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Send photos on WhatsApp</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {result ? (
          <div style={{ marginTop: 16 }}>
            {result.mode === "SENT" && (
              <div style={okBox}>
                ✅ {result.photos} photo{result.photos === 1 ? "" : "s"} sent to <b>{result.customer}</b>.
              </div>
            )}
            {result.mode === "WAITING" && (
              <div style={okBox}>
                ✅ {result.photos} photo{result.photos === 1 ? "" : "s"} ready for <b>{result.customer}</b>.
                <div style={{ fontSize: 13, marginTop: 6, color: "#444" }}>
                  They haven't messaged us in the last 24 hours, so WhatsApp first shows them a
                  short message with a <b>View</b> button. The photos arrive as soon as they tap it.
                </div>
              </div>
            )}
            {result.mode === "WAITING_ALREADY_INVITED" && (
              <div style={okBox}>
                ✅ {result.photos} photo{result.photos === 1 ? "" : "s"} added for <b>{result.customer}</b>.
                <div style={{ fontSize: 13, marginTop: 6, color: "#444" }}>
                  A <b>View</b> message was already sent to them in the last few hours.
                  These photos will arrive together with the earlier ones when they tap it or message us.
                </div>
              </div>
            )}
            {result.mode === "WAITING_NO_INVITE" && (
              <div style={warnBox}>
                The photos are saved for <b>{result.customer}</b>, but WhatsApp refused the <b>View</b> message,
                so they won't know yet. They will get the photos the next time they message us.
                {result.inviteError && (
                  <div style={{ fontSize: 12, color: "#8a4b00", marginTop: 6 }}>WhatsApp said: {result.inviteError}</div>
                )}
              </div>
            )}
            {result.mode !== "SENT" && bizNumber && (
              <div style={hiBox}>
                <div style={{ fontWeight: 600 }}>Make sure they get it</div>
                <div style={{ fontSize: 13, color: "#444", marginTop: 4 }}>
                  WhatsApp sometimes blocks the <b>View</b> message, especially for customers who have
                  never messaged us. Send them a quick note from your own WhatsApp asking them to say
                  "Hi" — the photos arrive the moment they do.
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button onClick={openSayHi} style={primaryBtn}>Ask them to say Hi</button>
                  <button onClick={copySayHi}>{copied ? "Copied ✓" : "Copy message"}</button>
                </div>
              </div>
            )}
            {result.skippedNoPhoto > 0 && (
              <div style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
                {result.skippedNoPhoto} design{result.skippedNoPhoto === 1 ? "" : "s"} had no photo and {result.skippedNoPhoto === 1 ? "was" : "were"} left out.
              </div>
            )}
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button onClick={onClose} style={primaryBtn}>Done</button>
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: customer */}
            <div style={{ marginTop: 14, fontWeight: 600 }}>Customer</div>
            {customer ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <div style={chosen}>
                  <b>{customer.CustomerName}</b>
                  <span style={{ color: "#666" }}> · {customer.City || ""} {customer.Phone}</span>
                </div>
                <button onClick={() => setCustomer(null)}>Change</button>
              </div>
            ) : (
              <>
                <input
                  autoFocus
                  placeholder="Search customer name, city or phone"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", marginTop: 6, boxSizing: "border-box" }}
                />
                <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #e3e6ea", borderTop: "none" }}>
                  {customers === null && <div style={row}>Loading…</div>}
                  {customers && matches.map(c => (
                    <div key={c.CustomerID} style={{ ...row, cursor: "pointer" }}
                      onClick={() => setCustomer(c)}
                      onMouseEnter={e => { e.currentTarget.style.background = "#f2f6ff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
                      <b>{c.CustomerName}</b>
                      <span style={{ color: "#666" }}> · {c.City || ""} {c.Phone}</span>
                    </div>
                  ))}
                  {customers && !matches.length && (
                    <div style={{ ...row, color: "#666" }}>
                      No customer with a mobile number matches. Add the number in Follow-ups → Customers.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 2: photos */}
            <div style={{ marginTop: 16, fontWeight: 600 }}>
              Photos ({toSend.length})
            </div>
            {noPhoto > 0 && (
              <div style={{ fontSize: 13, color: "#a15c00", marginTop: 4 }}>
                {noPhoto} selected design{noPhoto === 1 ? " has" : "s have"} no photo and will be left out.
              </div>
            )}
            {recentCount > 0 && (
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, marginTop: 6 }}>
                <input type="checkbox" checked={skipRecent} onChange={e => setSkipRecent(e.target.checked)} />
                Leave out {recentCount} design{recentCount === 1 ? "" : "s"} already sent to this customer in the last 30 days
              </label>
            )}
            <div style={grid}>
              {withPhoto.map(d => {
                const sentAt = recent[d.productid];
                const left = skipRecent && sentAt;
                return (
                  <div key={d.productid} style={{ ...thumb, opacity: left ? 0.35 : 1 }}
                    title={sentAt ? `Already sent ${fmtDate(sentAt)}` : ""}>
                    <img src={d.imageURL} alt="" loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    {sentAt && <div style={sentTag}>sent {fmtDate(sentAt)}</div>}
                  </div>
                );
              })}
            </div>
            {toSend.length > MAX && (
              <div style={{ color: "#b00020", fontSize: 13, marginTop: 6 }}>
                Too many photos — please select at most {MAX}.
              </div>
            )}

            {error && <div style={{ color: "#b00020", marginTop: 10 }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button onClick={onClose}>Cancel</button>
              <button
                onClick={send}
                disabled={!customer || !toSend.length || toSend.length > MAX || sending}
                style={primaryBtn}
              >
                {sending ? "Sending…" : `Send ${toSend.length} photo${toSend.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
  display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto"
};
const modal = {
  background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 640,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
};
const row = { padding: "8px 10px", borderBottom: "1px solid #f0f1f3", fontSize: 14 };
const chosen = { flex: 1, padding: "8px 10px", background: "#f2f6ff", borderRadius: 6, fontSize: 14 };
const grid = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8,
  marginTop: 8, maxHeight: 280, overflowY: "auto"
};
const thumb = {
  position: "relative", height: 110, borderRadius: 6, overflow: "hidden",
  background: "#f3f3f3", border: "1px solid #e3e6ea"
};
const sentTag = {
  position: "absolute", left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)",
  color: "#fff", fontSize: 10, textAlign: "center", padding: "2px 0"
};
const primaryBtn = {
  background: "#25a244", color: "#fff", border: "none", borderRadius: 6,
  padding: "8px 16px", cursor: "pointer", fontWeight: 600
};
const okBox = { background: "#eef9f0", border: "1px solid #bfe5c8", borderRadius: 8, padding: 12 };
const hiBox = { background: "#f4f8ff", border: "1px solid #cfdcf5", borderRadius: 8, padding: 12, marginTop: 12 };
const warnBox = { background: "#fff4e5", border: "1px solid #f0d9b5", borderRadius: 8, padding: 12 };
