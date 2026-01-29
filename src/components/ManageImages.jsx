import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

export default function ManageImages({ onExit }) {
  const [rows, setRows] = useState([]);
  const [savingIndex, setSavingIndex] = useState(null);

  // Load designs + fabric + rate + image URL
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await axios.get(`${API}/images/list`);
      setRows(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load image list");
    }
  };

  const handleChange = (index, value) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      ImageURL: value
    };
    setRows(updated);
  };

  const saveImage = async (row, index) => {
    setSavingIndex(index);
    try {
      await axios.post(`${API}/image/save`, {
        Item: row.Item,
        ImageURL: row.ImageURL
      });

      alert("Saved successfully");
    } catch (err) {
      console.error(err);
      alert("Error saving image");
    }
    setSavingIndex(null);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Manage Images</h2>

      {/* EXIT */}
      <button
        onClick={onExit}
        style={{ marginBottom: 15 }}
      >
        Exit
      </button>

      <table
        border="1"
        cellPadding="6"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
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

              <td>{row.Fabric}</td>

              <td>{row.Rate}</td>

              <td>
                <input
                  type="text"
                  value={row.ImageURL || ""}
                  onChange={(e) =>
                    handleChange(index, e.target.value)
                  }
                  style={{ width: "100%" }}
                />
              </td>

              <td>
                <button
                  onClick={() => saveImage(row, index)}
                  disabled={savingIndex === index}
                >
                  {savingIndex === index ? "Saving..." : "Save"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
