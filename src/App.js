import React, { useEffect, useState } from 'react';

import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import CustomerView from './components/CustomerView';
import PurchaseVoucher from './components/PurchaseVoucher';
import SalesVoucher from './components/SalesVoucher';
import StockTransfer from './components/StockTransfer';

import { api } from './services/api';

// Works with both "role" and "Role", any capitalisation
function roleOf(u) {
  return String(u?.role || u?.Role || "").toUpperCase();
}

function isCustomer(u) {
  return roleOf(u) === "CUSTOMER" || roleOf(u) === "CUSTOMER_PREMIUM";
}

export default function App() {

  const [user, setUser] = useState(null);
  const [mode, setMode] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('kf_token');
    const userJson = localStorage.getItem('kf_user');

    if (token && userJson) {
      const u = JSON.parse(userJson);
      api.setToken(token);
      setUser(u);
      setMode(isCustomer(u) ? 'customer' : 'admin');
    }

    // Keyboard shortcuts (still active)
    function onKeyDown(e) {

      if (e.key === 'F9') {
        setMode("purchase");
        e.preventDefault();
      }
      if (e.key === 'F8') {
        setMode("sales");
        e.preventDefault();
      }

      if (e.key === 'F7') {
        setMode("transfer");
        e.preventDefault();
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        document.dispatchEvent(new KeyboardEvent('save-voucher'));
        e.preventDefault();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);

  }, []);

  // ---------------- LOGIN ----------------
  if (!user) {
    return (
      <Login
        onLogin={(token, userObj) => {
          localStorage.setItem('kf_token', token);
          localStorage.setItem('kf_user', JSON.stringify(userObj));
          api.setToken(token);
          setUser(userObj);
          setMode(isCustomer(userObj) ? 'customer' : 'admin');
        }}
      />
    );
  }

  // Customers only ever see the customer view, even if a
  // keyboard shortcut tries to open an entry screen
  const screen = isCustomer(user) ? "customer" : mode;

  return (
    <div>

      {/* ---------- TITLE BAR ---------- */}
      <div className="titlebar" style={{
        height: 42,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 15px"
      }}>
        <div className="company">KARNI FASHIONS</div>

        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div>{user.fullname || user.FullName} — {roleOf(user)}</div>

          <button
            onClick={() => {
              localStorage.removeItem('kf_token');
              localStorage.removeItem('kf_user');
              api.setToken(null);
              window.location.reload();
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* ---------- MAIN PANEL ---------- */}
      <div className="container">
        <div className="panel">

          {screen === "admin" && (
            <AdminDashboard user={user} />
          )}

          {screen === "customer" && (
            <CustomerView user={user} />
          )}

          {screen === "purchase" && (
            <PurchaseVoucher
              user={user}
              onExit={() =>
                setMode(isCustomer(user) ? "customer" : "admin")
              }
            />
          )}

          {screen === "sales" && (
            <SalesVoucher
              user={user}
              onExit={() =>
                setMode(isCustomer(user) ? "customer" : "admin")
              }
            />
          )}

          {screen === "transfer" && (
            <StockTransfer
              user={user}
              onExit={() =>
                setMode(isCustomer(user) ? "customer" : "admin")
              }
            />
          )}

        </div>
      </div>

    </div>
  );
}
