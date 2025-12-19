import React, { useEffect, useState } from 'react';

import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import CustomerView from './components/CustomerView';

import PurchaseVoucher from './components/PurchaseVoucher';
import SalesVoucher from './components/SalesVoucher';

import { api } from './services/api';

export default function App() {

  const [user, setUser] = useState(null);

  // Modes:
  // admin | customer | purchase | sales
  const [mode, setMode] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('kf_token');
    const userJson = localStorage.getItem('kf_user');

    if (token && userJson) {
      const u = JSON.parse(userJson);
      api.setToken(token);
      setUser(u);
      setMode(u.Role === 'Customer' ? 'customer' : 'admin');
    }

    // Tally-style shortcuts
    function onKeyDown(e) {
      if (e.key === 'F9') {
        setMode("purchase");
        e.preventDefault();
      }

      if (e.key === 'F8') {
        setMode("sales");
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

  // LOGIN SCREEN
  if (!user) {
    return (
      <Login
        onLogin={(token, userObj) => {
          localStorage.setItem('kf_token', token);
          localStorage.setItem('kf_user', JSON.stringify(userObj));
          api.setToken(token);
          setUser(userObj);
          setMode(userObj.Role === 'Customer' ? 'customer' : 'admin');
        }}
      />
    );
  }

  return (
    <div>

      {/* ---------- TITLE BAR ---------- */}
      <div className="titlebar">
        <div className="company">KARNI FASHIONS</div>
        <div>{user.FullName} — {user.Role}</div>
      </div>

      {/* ---------- TOOLBAR ---------- */}
      <div className="toolbar">
        <div className="kbd">F9</div><div>Purchase</div>
        <div className="kbd">F8</div><div>Sales</div>
        <div className="kbd">Ctrl+A</div><div>Save</div>

        <div style={{ marginLeft: 'auto' }}>
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

          {/* MAIN ROLE SCREENS */}
          {mode === "admin" && (
            <AdminDashboard user={user} />
          )}

          {mode === "customer" && (
            <CustomerView user={user} />
          )}

          {/* PURCHASE */}
          {mode === "purchase" && (
            <PurchaseVoucher
              user={user}
              onExit={() =>
                setMode(user.Role === "Customer" ? "customer" : "admin")
              }
            />
          )}

          {/* SALES */}
          {mode === "sales" && (
            <SalesVoucher
              user={user}
              onExit={() =>
                setMode(user.Role === "Customer" ? "customer" : "admin")
              }
            />
          )}

        </div>
      </div>

    </div>
  );
}
