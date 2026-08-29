import React, { useEffect, useState } from "react";
import { api } from "../services/api";

const SIZES = ["M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];

export default function ViewSales({ onExit }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/sales/list");
        setRows(res.data || []);
      } catch (e) {
        console.error(e);
        setError("Failed to load sales list");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadDetails = async (id) => {
    if (details[id]) return details[id];

    const res = await api.get(`/sales/${id}`);
    const data = res.data;

    setDetails(prev => ({
      ...prev,
      [id]: data
    }));

    return data;
  };

  const toggleRow = async (id) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }

    setOpenId(id);

    if (!details[id]) {
      try {
        await loadDetails(id);
      } catch (e) {
        console.error(e);
        alert("Failed to load sales details");
      }
    }
  };

  // Handles common casing/naming variations without changing the API.
  const getField = (obj, names, fallback = "") => {
    for (const name of names) {
      if (obj?.[name] !== undefined && obj?.[name] !== null) {
        return obj[name];
      }
    }
    return fallback;
  };

  const getDesign = (d) =>
    getField(d, ["item", "design", "Design", "ITEM"], "");

  const getSeries = (d) =>
    getField(d, ["series", "Series", "SERIES"], "");

  const getCategory = (d) =>
    getField(d, ["category", "Category", "CATEGORY"], "");

  const getSize = (d) => {
    const value = getField(d, ["size", "Size", "SIZE"], "");
    return String(value).trim().toUpperCase();
  };

  const getQuantity = (d) => {
    const value = Number(
      getField(d, ["quantity", "qty", "Qty", "QTY"], 0)
    );
    return Number.isFinite(value) ? value : 0;
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const buildPrintRows = (detailRows = []) => {
    const grouped = new Map();

    detailRows.forEach(d => {
      const category = getCategory(d);
      const series = getSeries(d);
      const design = getDesign(d);
      const baseQuantity = getQuantity(d);

      const key = `${category}|||${series}|||${design}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          category,
          series,
          design,
          total: 0,
          sizes: Object.fromEntries(SIZES.map(s => [s, 0]))
        });
      }

      const row = grouped.get(key);

      const sizeRows = Array.isArray(d.sizeRows)
        ? d.sizeRows
        : Array.isArray(d.size_rows)
          ? d.size_rows
          : [];

      sizeRows.forEach(sz => {
        const size = getSize(sz);
        const quantity = getQuantity(sz);

        if (SIZES.includes(size)) {
          row.sizes[size] += quantity;
        }
      });

      row.total += baseQuantity;
    });

    return Array.from(grouped.values());
  };

  const printSale = async (sale) => {
    // Open immediately from the button click so the browser does not block it
    // while the sale details are being fetched.
    const printWindow = window.open("", "_blank", "width=1100,height=800");

    if (!printWindow) {
      alert("Please allow pop-ups for this site to print the sale.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Sale ${escapeHtml(sale.ID)}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              color: #000;
              font-size: 12px;
            }
            h2 {
              text-align: center;
              margin: 0 0 10px;
              font-size: 20px;
            }
            .info {
              display: grid;
              grid-template-columns: 100px 1fr 100px 1fr;
              border: 1px solid #000;
              margin-bottom: 12px;
            }
            .info div {
              padding: 5px 7px;
              border-right: 1px solid #000;
              border-bottom: 1px solid #000;
            }
            .info div:nth-child(4n) { border-right: 0; }
            .label { font-weight: bold; background: #f2f2f2; }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #000;
              padding: 5px 6px;
              height: 25px;
            }
            th {
              background: #e9e9e9;
              text-align: center;
              font-weight: bold;
            }
            td.num { text-align: right; }
            td.category {
              font-weight: bold;
              vertical-align: top;
              background: #f7f7f7;
            }
            td.series {
              font-weight: bold;
              vertical-align: top;
            }
            .total-row td {
              font-weight: bold;
              background: #f2f2f2;
            }
            .footer {
              margin-top: 12px;
              text-align: right;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h2>SALE DETAILS</h2>
          <div id="content">Loading...</div>
        </body>
      </html>
    `);
    printWindow.document.close();

    try {
      const detail = await loadDetails(sale.ID);
      const printRows = buildPrintRows(detail?.rows || []);

      const categories = [];
      const categoryMap = new Map();

      printRows.forEach(row => {
        if (!categoryMap.has(row.category)) {
          const category = { name: row.category, series: [] };
          categoryMap.set(row.category, category);
          categories.push(category);
        }

        const category = categoryMap.get(row.category);
        let series = category.series.find(s => s.name === row.series);
        if (!series) {
          series = { name: row.series, rows: [] };
          category.series.push(series);
        }
        series.rows.push(row);
      });

      const grandTotals = Object.fromEntries(SIZES.map(s => [s, 0]));
      let grandTotal = 0;

      printRows.forEach(row => {
        grandTotal += row.total;
        SIZES.forEach(size => {
          grandTotals[size] += row.sizes[size];
        });
      });

      const bodyRows = [];
      categories.forEach(category => {
        let categoryRowCount = category.series.reduce(
          (sum, series) => sum + series.rows.length,
          0
        );
        let categoryFirstRow = true;

        category.series.forEach(series => {
          series.rows.forEach((row, index) => {
            bodyRows.push(`
              <tr>
                ${categoryFirstRow ? `<td class="category" rowspan="${categoryRowCount}">${escapeHtml(category.name)}</td>` : ""}
                ${index === 0 ? `<td class="series" rowspan="${series.rows.length}">${escapeHtml(series.name)}</td>` : ""}
                <td>${escapeHtml(row.design)}</td>
                <td class="num">${row.total || ""}</td>
                ${SIZES.map(size => `<td class="num">${row.sizes[size] || ""}</td>`).join("")}
              </tr>
            `);
            categoryFirstRow = false;
          });
        });
      });

      if (!bodyRows.length) {
        bodyRows.push(`<tr><td colspan="11" style="text-align:center">No sale details found</td></tr>`);
      }

      const info = `
        <div class="info">
          <div class="label">Sale ID</div>
          <div></div>
          <div class="label">Date</div>
          <div>${escapeHtml(new Date(sale.Date).toLocaleDateString())}</div>
          <div class="label">Customer</div>
          <div>${escapeHtml(sale.Customer)}</div>
          <div class="label">Total Qty</div>
          <div>${escapeHtml(sale.TotalQty)}</div>
        </div>
      `;

      printWindow.document.getElementById("content").innerHTML = `
        ${info}
        <table>
          <thead>
            <tr>
              <th>CATEGORY</th>
              <th>SERIES</th>
              <th>DESIGN</th>
              <th>TOTAL</th>
              ${SIZES.map(size => `<th>${size}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${bodyRows.join("")}
            <tr class="total-row">
              <td colspan="3">GRAND TOTAL</td>
              <td class="num">${grandTotal || ""}</td>
              ${SIZES.map(size => `<td class="num">${grandTotals[size] || ""}</td>`).join("")}
            </tr>
          </tbody>
        </table>
        <div class="footer">Total Quantity: ${escapeHtml(grandTotal)}</div>
      `;

      printWindow.focus();
      setTimeout(() => printWindow.print(), 100);
    } catch (e) {
      console.error(e);
      printWindow.document.getElementById("content").innerHTML =
        `<p style="color:red">Failed to load sale details for printing.</p>`;
    }
  };

  return (
    <div style={{ padding: 18 }}>
      <h2>View Sales</h2>

      <button onClick={onExit} style={{ marginBottom: 12 }}>
        Back
      </button>

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

      {!loading && !error && (
        <table border="1" width="100%">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Total Qty</th>
              <th>Print</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan="5" align="center">
                  No records found
                </td>
              </tr>
            )}

            {rows.map(r => (
              <React.Fragment key={r.ID}>
                <tr
                  style={{ cursor: "pointer", background: "#fafafa" }}
                  onClick={() => toggleRow(r.ID)}
                >
                  <td>{r.ID}</td>
                  <td>{new Date(r.Date).toLocaleDateString()}</td>
                  <td>{r.Customer}</td>
                  <td align="right">{r.TotalQty}</td>
                  <td align="center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        printSale(r);
                      }}
                    >
                      Print
                    </button>
                  </td>
                </tr>

                {openId === r.ID && (
                  <tr>
                    <td colSpan="5">
                      {!details[r.ID] ? (
                        <div>Loading details...</div>
                      ) : (
                        <table
                          border="1"
                          width="100%"
                          style={{ background: "#fff" }}
                        >
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Series</th>
                              <th>Category</th>
                              <th>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {details[r.ID].rows.map((d, i) => (
                              <tr key={i}>
                                <td>{d.item}</td>
                                <td>{d.series}</td>
                                <td>{d.category}</td>
                                <td align="right">{d.quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
