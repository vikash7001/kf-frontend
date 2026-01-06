import React from "react";

export default function ViewTransfers({ onExit }) {
  return (
    <div style={{ padding: 18 }}>
      <h2>View Stock Transfers</h2>

      <button onClick={onExit} style={{ marginBottom: 12 }}>
        Back
      </button>

      <div>Coming soon</div>
    </div>
  );
}
