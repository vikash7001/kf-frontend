import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

export default function ManageImages({ onExit }) {

  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(null);

  // Load data
  useEffect(() => {
    axios.get(`${API}/images/list`)
      .then(res => setRows(res.data))
      .catch(err => console.error(err));
  }, []);

  // Generic change handler
  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setRows(updated);
  };

  // Save row
  const saveRow = async (row, index) => {
    setSaving(index);
    try {
      await axios.post(`${API}/image/save`, {
        Item: row.Item,
        ImageURL: row.ImageURL,
        Fabric: row.Fabric,
        Rate: row.Rate
      });

      alert("Saved successfully");
    } catch (err) {
      console.error(err);
      alert("Error saving");
    }
    setSaving(null);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Manage Images</h2>

      <button onClick={onExit} style={{ marginBottom: 15 }}>
        Exit
      </button>

      <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Design</th>
            <th>Fabric</th>
            <th>Rate</th>
            <th>Image URL</th>
            <th>Save</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={row.ProductID}>
              <td><b>{row.Item}</b></td>

              <td>
                <input
                  type="text"
                  value={row.Fabric || ""}
                  onChange={(e) =>
                    handleChange(index, "Fabric", e.target.value)
                  }
                  style={{ width: "100%" }}
                />
              </td>

              <td>
                <input
                  type="text"
                  value={row.Rate || ""}
                  onChange={(e) =>
                    handleChange(index, "Rate", e.target.value)
                  }
                  style={{ width: "100%" }}
                />
              </td>

              <td>
                <input
                  type="text"
                  value={row.ImageURL || ""}
                  onChange={(e) =>
                    handleChange(index, "ImageURL", e.target.value)
                  }
                  style={{ width: "100%" }}
                />
              </td>

              <td>
                <button
                  onClick={() => saveRow(row, index)}
                  disabled={saving === index}
                >
                  {saving === index ? "Saving..." : "Save"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
