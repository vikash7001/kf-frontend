import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { api, BASE } from "../services/api";

/* =====================================================
   MAKE REEL (Stock page → Order View)
   Sends the selected designs to the reel maker (GitHub),
   shows progress, then preview + download.
   The last reel is remembered for 1 day so you can close
   this box and come back.
===================================================== */

const MAX = 8;
const JOB_KEY = "kf_reel_job";

export function loadReelJob() {
  try {
    const j = JSON.parse(localStorage.getItem(JOB_KEY));
    if (j && Date.now() - j.startedAt < 23 * 3600 * 1000) return j;
  } catch {}
  return null;
}
function saveJob(j) {
  try { j ? localStorage.setItem(JOB_KEY, JSON.stringify(j)) : localStorage.removeItem(JOB_KEY); } catch {}
}

const STATE_TEXT = {
  starting: "Sending to the reel maker…",
  queued: "Waiting for a free machine…",
  making: "Making your reel…",
};

function mmss(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function ReelMaker({ designs, onClose }) {
  const [job, setJob] = useState(loadReelJob());          // {jobId, startedAt, count}
  const [mode, setMode] = useState(loadReelJob() ? "job" : "new");
  const [hook, setHook] = useState("The Festive Edit");
  const [sub, setSub] = useState(`New Collection ${new Date().getFullYear()}`);
  const [status, setStatus] = useState(null);              // {state, seconds, error}
  const [videoUrl, setVideoUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const timer = useRef(null);

  const withPhoto = designs.filter(d => d.imageURL);
  const chosen = withPhoto.slice(0, MAX);

  // ---------- polling ----------
  const poll = useCallback(async (j) => {
    try {
      const r = await api.get(`/reels/${j.jobId}/status`);
      setStatus(r.data);
      if (r.data.state === "ready") {
        const v = await axios.get(`${BASE}/reels/${j.jobId}/video`, { responseType: "blob", timeout: 180000 });
        setVideoUrl(URL.createObjectURL(v.data));
        return true;
      }
      if (r.data.state === "failed") return true;
    } catch (e) {
      setStatus({ state: "failed", error: e.response?.data?.error || "Could not check the reel" });
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (mode !== "job" || !job) return;
    let stop = false;
    const run = async () => {
      if (stop) return;
      const done = await poll(job);
      if (!done && !stop) timer.current = setTimeout(run, 8000);
    };
    run();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { stop = true; clearTimeout(timer.current); clearInterval(tick); };
  }, [mode, job, poll]);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  // ---------- start ----------
  async function start() {
    if (!chosen.length) return;
    setBusy(true); setError(""); setStatus(null); setVideoUrl(null);
    try {
      const r = await api.post("/reels", {
        ProductIDs: chosen.map(d => d.productid),
        Hook: hook.trim(),
        Sub: sub.trim()
      });
      const j = { jobId: r.data.jobId, startedAt: Date.now(), count: r.data.designs };
      saveJob(j); setJob(j); setMode("job");
    } catch (e) {
      setError(e.response?.data?.error || "Could not start the reel");
    } finally {
      setBusy(false);
    }
  }

  function newReel() {
    saveJob(null); setJob(null); setStatus(null); setVideoUrl(null); setMode("new");
  }

  const elapsed = job ? (now - job.startedAt) / 1000 : 0;
  const state = status?.state || "starting";

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>🎬 Make Reel</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {mode === "new" && (
          <>
            <div style={{ marginTop: 12, fontWeight: 600 }}>
              Designs ({chosen.length})
              {withPhoto.length > MAX && (
                <span style={{ color: "#a15c00", fontWeight: 400, fontSize: 13 }}>
                  {" "}– only the first {MAX} are used
                </span>
              )}
            </div>
            {designs.length > withPhoto.length && (
              <div style={{ fontSize: 13, color: "#a15c00" }}>
                {designs.length - withPhoto.length} selected design(s) have no photo and are left out.
              </div>
            )}
            <div style={grid}>
              {chosen.map(d => (
                <div key={d.productid} style={thumb}>
                  <img src={d.imageURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={tag}>{d.item}</div>
                </div>
              ))}
            </div>
            {chosen.length > 0 && chosen.length < 3 && (
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Tip: 5–6 designs make the best reel.</div>
            )}

            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              <label style={lbl}>Opening line (hook)
                <input value={hook} maxLength={40} onChange={e => setHook(e.target.value)} style={inp} />
              </label>
              <label style={lbl}>Second line
                <input value={sub} maxLength={40} onChange={e => setSub(e.target.value)} style={inp} />
              </label>
            </div>

            <div style={{ fontSize: 12, color: "#777", marginTop: 10 }}>
              About {Math.round(chosen.length * 4.5 + 4.5)} seconds long · 9:16 for WhatsApp status and reels ·
              takes about 2 minutes to make.
            </div>

            {error && <div style={{ color: "#b00020", marginTop: 10 }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button onClick={onClose}>Cancel</button>
              <button onClick={start} disabled={busy || !chosen.length} style={primary}>
                {busy ? "Starting…" : "Create reel"}
              </button>
            </div>
          </>
        )}

        {mode === "job" && job && (
          <>
            {!videoUrl && state !== "failed" && (
              <div style={{ textAlign: "center", padding: "26px 10px" }}>
                <div style={spinner} />
                <div style={{ fontWeight: 600, marginTop: 14 }}>{STATE_TEXT[state] || "Making your reel…"}</div>
                <div style={{ color: "#666", fontSize: 13, marginTop: 6 }}>
                  {mmss(elapsed)} · usually ready in about 2 minutes
                  {state === "ready" ? " · downloading…" : ""}
                </div>
                <div style={{ color: "#888", fontSize: 12, marginTop: 10 }}>
                  You can close this box and keep working – the reel keeps being made.
                  Open <b>Make Reel</b> again to see it.
                </div>
              </div>
            )}

            {state === "failed" && (
              <div style={{ padding: "16px 0" }}>
                <div style={{ color: "#b00020", fontWeight: 600 }}>{status?.error || "Making the reel failed"}</div>
                <div style={{ marginTop: 12, textAlign: "right" }}>
                  <button onClick={newReel} style={primary}>Make a new reel</button>
                </div>
              </div>
            )}

            {videoUrl && (
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <video src={videoUrl} controls autoPlay playsInline
                       style={{ height: "56vh", maxWidth: "100%", borderRadius: 8, background: "#000" }} />
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
                  <a href={videoUrl} download={`karni-reel-${new Date().toISOString().slice(0, 10)}.mp4`}
                     style={{ ...primary, textDecoration: "none", display: "inline-block" }}>
                    ⬇ Download
                  </a>
                  <button onClick={newReel}>Make another</button>
                </div>
                <div style={{ fontSize: 12, color: "#777", marginTop: 8 }}>
                  {status?.sizeMB ? `${status.sizeMB} MB · ` : ""}available to download for 1 day
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
  display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "30px 16px", overflowY: "auto"
};
const modal = { background: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 620, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))", gap: 8, marginTop: 8 };
const thumb = { position: "relative", height: 104, borderRadius: 6, overflow: "hidden", background: "#f2f2f2", border: "1px solid #e3e6ea" };
const tag = { position: "absolute", left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, textAlign: "center", padding: "1px 0" };
const lbl = { display: "grid", gap: 4, fontSize: 13, color: "#444" };
const inp = { padding: "7px 9px", fontSize: 14 };
const primary = { background: "#1a5fd0", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontWeight: 600 };
const spinner = {
  width: 42, height: 42, margin: "0 auto", borderRadius: "50%",
  border: "4px solid #dfe6f5", borderTopColor: "#1a5fd0", animation: "kfspin 0.9s linear infinite"
};

// keyframes for the spinner (added once)
if (typeof document !== "undefined" && !document.getElementById("kf-reel-spin")) {
  const st = document.createElement("style");
  st.id = "kf-reel-spin";
  st.textContent = "@keyframes kfspin { to { transform: rotate(360deg); } }";
  document.head.appendChild(st);
}
