import React, { useEffect, useState } from "react";
import { api } from "../services/api";

/* ------------------------------
   localStorage helpers
-------------------------------- */
const LS_KEY = "stockFilters";

function loadSavedFilters() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveFilters(filters) {
  localStorage.setItem(LS_KEY, JSON.stringify(filters));
}

/* ------------------------------
   Excel-like filter section
-------------------------------- */
function FilterSection({ title, open, onToggle, activeCount, children }) {
  return (
    <div style={{ border: "1px solid #ccc", width: 220 }}>
      <div
        onClick={onToggle}
        style={{
          cursor: "pointer",
          padding: "6px 8px",
          background: "#f2f2f2",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: "bold"
        }}
      >
        <span>
          {title}
          {activeCount > 0 && (
            <span style={{ color: "green", marginLeft: 6 }}>
              ({activeCount})
            </span>
          )}
        </span>
        <span>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ maxHeight: 260, overflowY: "auto", padding: 6 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function StockView({ user }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageByItem, setImageByItem] = useState({});

  const saved = loadSavedFilters();

  const [productFilter, setProductFilter] = useState(saved.product || []);
  const [seriesFilter, setSeriesFilter] = useState(saved.series || []);
  const [categoryFilter, setCategoryFilter] = useState(saved.category || []);
  const [originFilter, setOriginFilter] = useState(saved.origin || []);

  const [showProduct, setShowProduct] = useState(false);
  const [showSeries, setShowSeries] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showOrigin, setShowOrigin] = useState(false);

  // Stock view / order selection
  const [removeZeroStock, setRemoveZeroStock] = useState(false);
  const [orderMode, setOrderMode] = useState(false);
  const [orderApplied, setOrderApplied] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    loadStock();
    loadImages();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    saveFilters({
      product: productFilter,
      series: seriesFilter,
      category: categoryFilter,
      origin: originFilter
    });
  }, [productFilter, seriesFilter, categoryFilter, originFilter]);

  function toggleFilter(setter, value) {
    setter(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  }

  function getRowKey(s) {
    return [
      s.productid,
      s.item,
      s.seriesname,
      s.categoryname,
      s.origin || ""
    ].join("|");
  }

  function toggleOrderItem(s) {
    const key = getRowKey(s);

    setSelectedItems(prev =>
      prev.includes(key)
        ? prev.filter(v => v !== key)
        : [...prev, key]
    );

    // Changing a selection after applying the order means it needs
    // to be applied again.
    setOrderApplied(false);
  }

  function applyOrderSelection() {
    if (selectedItems.length === 0) {
      setOrderApplied(false);
      return;
    }

    setOrderApplied(true);
  }

  function handleOrderModeChange(checked) {
    setOrderMode(checked);
    setOrderApplied(false);

    if (!checked) {
      setSelectedItems([]);
    }
  }

  function resetAll() {
    setProductFilter([]);
    setSeriesFilter([]);
    setCategoryFilter([]);
    setOriginFilter([]);
    setRemoveZeroStock(false);
    setOrderMode(false);
    setOrderApplied(false);
    setSelectedItems([]);
    localStorage.removeItem(LS_KEY);
  }

  function handleSort(column) {
    if (sortBy === column) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  function sortArrow(column) {
    if (sortBy !== column) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  async function loadImages() {
    try {
      const res = await api.get("/images/list");

      const imageMap = {};
      (res.data || []).forEach(row => {
        const item = String(row.Item ?? "").trim();
        const imageURL = String(row.ImageURL ?? "").trim();

        if (item && imageURL && imageURL.toLowerCase() !== "n/a") {
          imageMap[item] = imageURL;
        }
      });

      setImageByItem(imageMap);
    } catch (err) {
      console.error("IMAGE LOAD ERROR:", err);
      setImageByItem({});
    }
  }

  function openProductImage(item) {
    const imageURL = imageByItem[String(item ?? "").trim()];

    if (!imageURL) {
      alert("No image available for this design.");
      return;
    }

    window.open(imageURL, "_blank", "noopener,noreferrer");
  }

  function createSelectedImagesPDF() {
    if (!orderMode || selectedItems.length === 0) {
      alert("Please select at least one item in Order View.");
      return;
    }

    const selectedRows = stock.filter(s =>
      selectedItems.includes(getRowKey(s))
    );

    const imageURLs = selectedRows
      .map(s => imageByItem[String(s.item ?? "").trim()])
      .filter(Boolean);

    if (imageURLs.length === 0) {
      alert("None of the selected items have an uploaded image.");
      return;
    }

    const missingCount = selectedRows.length - imageURLs.length;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Please allow pop-ups to create the PDF.");
      return;
    }

    const imageMarkup = imageURLs
      .map(url => `
        <div class="image-card">
          <img src="${url.replace(/"/g, "&quot;")}" alt="" />
        </div>
      `)
      .join("");

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Selected Items</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }

            * {
              box-sizing: border-box;
            }

            html, body {
              margin: 0;
              padding: 0;
              background: white;
            }

            body {
              font-family: Arial, sans-serif;
            }

            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8mm;
              width: 100%;
            }

            .image-card {
              width: 100%;
              height: 130mm;
              display: flex;
              align-items: center;
              justify-content: center;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .image-card img {
              display: block;
              max-width: 100%;
              max-height: 100%;
              width: auto;
              height: auto;
              object-fit: contain;
            }

            @media print {
              .grid {
                gap: 8mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${imageMarkup}
          </div>

          <script>
            const images = Array.from(document.images);

            Promise.all(
              images.map(img =>
                img.complete
                  ? Promise.resolve()
                  : new Promise(resolve => {
                      img.onload = resolve;
                      img.onerror = resolve;
                    })
              )
            ).then(() => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 300);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    if (missingCount > 0) {
      setTimeout(() => {
        alert(
          `${missingCount} selected item(s) have no uploaded image and were not included in the PDF.`
        );
      }, 500);
    }
  }

  async function loadStock() {
    try {
      setLoading(true);

      const role = user?.Role
        ? String(user.Role).toUpperCase()
        : "ADMIN";

      const res = await api.post("/stock", { role });

      const normalized = (res.data || []).map(r => ({
        productid: r.ProductID,
        item: r.Item,
        seriesname: r.SeriesName,
        categoryname: r.CategoryName,
        origin: r.Origin,
        jaipurqty: Number(r.JaipurQty || 0),
        kolkataqty: Number(r.KolkataQty || 0),
        ahmedabadqty: Number(r.AhmedabadQty || 0),
        totalqty: Number(r.TotalQty || 0),
totalpcs: Number(r.TotalPcs || 0),
lastmovementdate: r.LastMovementDate
      }));

      setStock(normalized);
    } catch (err) {
      console.error("STOCK LOAD ERROR:", err);
      setStock([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredAndSortedStock = [...stock]
    .filter(s =>
      (productFilter.length === 0 || productFilter.includes(s.item)) &&
      (seriesFilter.length === 0 || seriesFilter.includes(s.seriesname)) &&
      (categoryFilter.length === 0 || categoryFilter.includes(s.categoryname)) &&
      (originFilter.length === 0 || originFilter.includes(s.origin)) &&
      (!removeZeroStock || s.totalqty !== 0) &&
      (!orderApplied || selectedItems.includes(getRowKey(s)))
    )
    .sort((a, b) => {
      if (!sortBy) return 0;

      const x = a[sortBy];
      const y = b[sortBy];

      if (typeof x === "number")
        return sortDir === "asc" ? x - y : y - x;

      return sortDir === "asc"
        ? String(x).localeCompare(String(y))
        : String(y).localeCompare(String(x));
    });

  const seriesList = [...new Set(stock.map(s => s.seriesname))].sort();
  const originList = [...new Set(stock.map(s => s.origin))].sort();

  return (
    <div style={{ padding: 16 }}>
      <h3>Stock Summary</h3>

      {loading && <div>Loading...</div>}
      {!loading && stock.length === 0 && <div>No stock available</div>}

      {!loading && stock.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <FilterSection
              title="Products"
              open={showProduct}
              onToggle={() => setShowProduct(v => !v)}
              activeCount={productFilter.length}
            >
              {[...new Set(stock.map(s => s.item))].map(p => (
                <label key={p} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={productFilter.includes(p)}
                    onChange={() => toggleFilter(setProductFilter, p)}
                  /> {p}
                </label>
              ))}
            </FilterSection>

            <FilterSection
              title="Series"
              open={showSeries}
              onToggle={() => setShowSeries(v => !v)}
              activeCount={seriesFilter.length}
            >
              {seriesList.map(s => (
                <label key={s} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={seriesFilter.includes(s)}
                    onChange={() => toggleFilter(setSeriesFilter, s)}
                  /> {s}
                </label>
              ))}
            </FilterSection>

            <FilterSection
              title="Category"
              open={showCategory}
              onToggle={() => setShowCategory(v => !v)}
              activeCount={categoryFilter.length}
            >
              {[...new Set(stock.map(s => s.categoryname))].map(c => (
                <label key={c} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={categoryFilter.includes(c)}
                    onChange={() => toggleFilter(setCategoryFilter, c)}
                  /> {c}
                </label>
              ))}
            </FilterSection>

            <FilterSection
              title="Origin"
              open={showOrigin}
              onToggle={() => setShowOrigin(v => !v)}
              activeCount={originFilter.length}
            >
              {originList.map(o => (
                <label key={o} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={originFilter.includes(o)}
                    onChange={() => toggleFilter(setOriginFilter, o)}
                  /> {o}
                </label>
              ))}
            </FilterSection>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginTop: 10,
              flexWrap: "wrap"
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={removeZeroStock}
                onChange={e => setRemoveZeroStock(e.target.checked)}
              />
              Remove Zero Quantity Stock
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={orderMode}
                onChange={e => handleOrderModeChange(e.target.checked)}
              />
              Order View
            </label>

            {orderMode && (
              <>
                <strong>
                  Selected Items: {selectedItems.length}
                </strong>

                <button
                  type="button"
                  onClick={applyOrderSelection}
                  disabled={selectedItems.length === 0}
                >
                  Show Selected
                </button>

                <button
                  type="button"
                  onClick={createSelectedImagesPDF}
                  disabled={selectedItems.length === 0}
                >
                  Create PDF
                </button>
              </>
            )}

            <button type="button" onClick={resetAll}>
              Reset
            </button>
          </div>

          <table
            border="1"
            cellPadding="6"
            style={{
              borderCollapse: "collapse",
              width: "100%",
              marginTop: 10
            }}
          >
            
              <thead>
  <tr>
    {orderMode && (
      <th align="center">
        <input
          type="checkbox"
          checked={
            filteredAndSortedStock.length > 0 &&
            filteredAndSortedStock.every(s =>
              selectedItems.includes(getRowKey(s))
            )
          }
          onChange={e => {
            const visibleKeys = filteredAndSortedStock.map(getRowKey);

            if (e.target.checked) {
              setSelectedItems(prev =>
                [...new Set([...prev, ...visibleKeys])]
              );
            } else {
              setSelectedItems(prev =>
                prev.filter(key => !visibleKeys.includes(key))
              );
            }

            setOrderApplied(false);
          }}
        />
      </th>
    )}
    <th onClick={() => handleSort("item")}>
      Product{sortArrow("item")}
    </th>

    <th onClick={() => handleSort("seriesname")}>
      Series{sortArrow("seriesname")}
    </th>

    <th onClick={() => handleSort("categoryname")}>
      Category{sortArrow("categoryname")}
    </th>

    <th onClick={() => handleSort("origin")}>
      Origin{sortArrow("origin")}
    </th>

    <th onClick={() => handleSort("jaipurqty")}>
      Jaipur{sortArrow("jaipurqty")}
    </th>

    <th onClick={() => handleSort("kolkataqty")}>
      Kolkata{sortArrow("kolkataqty")}
    </th>

    <th onClick={() => handleSort("ahmedabadqty")}>
      Ahmedabad{sortArrow("ahmedabadqty")}
    </th>

    <th onClick={() => handleSort("totalqty")}>
      Total{sortArrow("totalqty")}
    </th>

    <th onClick={() => handleSort("totalpcs")}>
      Total PCS{sortArrow("totalpcs")}
    </th>

    <th onClick={() => handleSort("lastmovementdate")}>
      Last Movement{sortArrow("lastmovementdate")}
    </th>
    <th>View Image</th>
  </tr>
</thead>
            <tbody>
              {filteredAndSortedStock.map(s => (
                <tr key={getRowKey(s)}>
                  {orderMode && (
                    <td align="center">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(getRowKey(s))}
                        onChange={() => toggleOrderItem(s)}
                      />
                    </td>
                  )}
                  <td>{s.item}</td>
                  <td>{s.seriesname}</td>
                  <td>{s.categoryname}</td>
                  <td>{s.origin}</td>
                  <td align="right">{s.jaipurqty}</td>
                  <td align="right">{s.kolkataqty}</td>
                  <td align="right">{s.ahmedabadqty}</td>
                  <td align="right">{s.totalqty}</td>
<td align="right">{s.totalpcs}</td>

<td>
  {s.lastmovementdate
    ? new Date(s.lastmovementdate).toLocaleDateString()
    : "-"}
</td>
<td align="center">
  {imageByItem[String(s.item ?? "").trim()] ? (
    <button
      type="button"
      onClick={() => openProductImage(s.item)}
    >
      View Image
    </button>
  ) : (
    <span>Not Image Uploaded</span>
  )}
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
