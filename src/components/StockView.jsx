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
        <div
          style={{
            maxHeight: 10 * 26,   // show ~10 items
            overflowY: "auto",
            padding: 6
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function StockView({ user }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ------------------------------
     Filters & sorting state
  -------------------------------- */
  const saved = loadSavedFilters();

  const [productFilter, setProductFilter] = useState(saved.product || []);
  const [seriesFilter, setSeriesFilter] = useState(saved.series || []);
  const [categoryFilter, setCategoryFilter] = useState(saved.category || []);

  const [showProduct, setShowProduct] = useState(false);
  const [showSeries, setShowSeries] = useState(false);
  const [showCategory, setShowCategory] = useState(false);

  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    loadStock();
    // eslint-disable-next-line
  }, []);

  /* ------------------------------
     Persist filters
  -------------------------------- */
  useEffect(() => {
    saveFilters({
      product: productFilter,
      series: seriesFilter,
      category: categoryFilter
    });
  }, [productFilter, seriesFilter, categoryFilter]);

  /* ------------------------------
     Helpers
  -------------------------------- */
  function toggleFilter(setter, value) {
    setter(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  }

  function handleSort(column) {
    if (sortBy === column) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  /* ------------------------------
     Load stock (UNCHANGED)
  -------------------------------- */
  async function loadStock() {
    try {
      setLoading(true);

      const role =
        user?.Role
          ? String(user.Role).toUpperCase()
          : "ADMIN";

      const res = await api.post("/stock", { role });

      if (!Array.isArray(res.data) || res.data.length === 0) {
        setStock([]);
        return;
      }

      const normalized = res.data.map(r => ({
        productid: r.ProductID,
        item: r.Item,
        seriesname: r.SeriesName,
        categoryname: r.CategoryName,
        jaipurqty: Number(r.JaipurQty || 0),
        kolkataqty: Number(r.KolkataQty || 0),
        totalqty: Number(r.TotalQty || 0),
      }));

      setStock(normalized);

    } catch (err) {
      console.error("STOCK LOAD ERROR:", err);
      setStock([]);
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------
     Filter + sort
  -------------------------------- */
  const filteredAndSortedStock = [...stock]
    .filter(s =>
      (productFilter.length === 0 || productFilter.includes(s.item)) &&
      (seriesFilter.length === 0 || seriesFilter.includes(s.seriesname)) &&
      (categoryFilter.length === 0 || categoryFilter.includes(s.categoryname))
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

  return (
    <div style={{ padding: 16 }}>
      <h3>Stock Summary</h3>

      {loading && <div>Loading...</div>}

      {!loading && stock.length === 0 && (
        <div>No stock available</div>
      )}

      {!loading && stock.length > 0 && (
        <>
          {/* FILTER BAR */}
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
                  />{" "}
                  {p}
                </label>
              ))}
            </FilterSection>

            <FilterSection
              title="Series"
              open={showSeries}
              onToggle={() => setShowSeries(v => !v)}
              activeCount={seriesFilter.length}
            >
              {[...new Set(stock.map(s => s.seriesname))].map(s => (
                <label key={s} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={seriesFilter.includes(s)}
                    onChange={() => toggleFilter(setSeriesFilter, s)}
                  />{" "}
                  {s}
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
                  />{" "}
                  {c}
                </label>
              ))}
            </FilterSection>
          </div>

          {/* RESET */}
          <button
            onClick={() => {
              setProductFilter([]);
              setSeriesFilter([]);
              setCategoryFilter([]);
              localStorage.removeItem(LS_KEY);
            }}
          >
            Reset Filters
          </button>

          {/* TABLE */}
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
                <th onClick={() => handleSort("item")}>Product</th>
                <th onClick={() => handleSort("seriesname")}>Series</th>
                <th onClick={() => handleSort("categoryname")}>Category</th>
                <th onClick={() => handleSort("jaipurqty")}>Jaipur</th>
                <th onClick={() => handleSort("kolkataqty")}>Kolkata</th>
                <th onClick={() => handleSort("totalqty")}>Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedStock.map(s => (
                <tr key={s.productid}>
                  <td>{s.item}</td>
                  <td>{s.seriesname}</td>
                  <td>{s.categoryname}</td>
                  <td align="right">{s.jaipurqty}</td>
                  <td align="right">{s.kolkataqty}</td>
                  <td align="right">{s.totalqty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
