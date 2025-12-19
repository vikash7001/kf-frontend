import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

export default function ManageImages({ onExit }) {

  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(null);

  // load all items + URLs
  useEffect(() => {
    axios.get(`${API}/images/list`)
      .then(res => setRows(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (index, value) => {
    const updated = [...rows];
    updated[index].ImageURL = value;
    setRows(updated);
  };

  const saveImage = async (item, url, index) => {
    setSaving(index);
    try {
      await axios.post(`${API}/image/save`, {
        Item: item,
        ImageURL: url
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

      {/* EXIT BUTTON */}
      <button
        onClick={onExit}
        style={{ marginBottom: 15 }}
      >
        Exit
      </button>

      <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Item</th>
            <th>Image URL</th>
            <th>Save</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={row.ProductID}>
              <td>{row.Item}</td>

              <td>
                <input
                  type="text"
                  value={row.ImageURL}
                  onChange={(e) => handleChange(index, e.target.value)}
                  style={{ width: "100%" }}
                />
              </td>

              <td>
                <button
                  onClick={() => saveImage(row.Item, row.ImageURL, index)}
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
