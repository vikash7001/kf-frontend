import React, { useEffect } from "react";

// ==========================================================
// FULL-SCREEN "PLEASE WAIT" – covers the whole screen so nothing can be
// clicked while barcodes are being made. Shows "7 of 23" and a bar.
// Closing / refreshing the tab asks first while it is working.
// ==========================================================
export default function BusyOverlay({ title = "Creating barcodes…", done = 0, total = 0, note }) {
  useEffect(() => {
    const warn = e => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div
      onClickCapture={e => { e.stopPropagation(); e.preventDefault(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100000, background: "rgba(20,30,60,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "wait"
      }}
    >
      <div style={{ background: "#fff", borderRadius: 10, padding: "22px 26px", width: 360, maxWidth: "90vw",
                    textAlign: "center", boxShadow: "0 10px 40px #0005" }}>
        <div style={{ fontSize: 34, lineHeight: 1 }}>⏳</div>
        <div style={{ fontSize: 19, fontWeight: 800, margin: "10px 0 4px" }}>{title}</div>
        {total > 0 && (
          <>
            <div style={{ fontSize: 16, marginBottom: 10 }}><b>{done}</b> of <b>{total}</b></div>
            <div style={{ height: 12, background: "#e6ebf5", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "#2e7d32", transition: "width .2s" }} />
            </div>
          </>
        )}
        <div style={{ marginTop: 12, color: "#b00020", fontWeight: 600 }}>
          {note || "Please wait – don't click anything or close this page."}
        </div>
      </div>
    </div>
  );
}
