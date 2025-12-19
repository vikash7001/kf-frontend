import React, { useState, useEffect } from 'react';

import PurchaseVoucher from './PurchaseVoucher';
import SalesVoucher from './SalesVoucher';
import StockView from './StockView';
import ImageViewer from './ImageViewer';
import ManageImages from './ManageImages';   // ✅ NEW

export default function AdminDashboard({ user }) {

  // purchase | sales | stock | images | manageImages
  const [screen, setScreen] = useState("purchase");

  useEffect(() => {
    setScreen("purchase");
  }, []);

  return (
    <div style={{ padding: 15 }}>

      {/* ---------- TOP BUTTON BAR ---------- */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
        <button onClick={() => setScreen('purchase')}>Purchase</button>
        <button onClick={() => setScreen('sales')}>Sales</button>
        <button onClick={() => setScreen('stock')}>Stock</button>
        <button onClick={() => setScreen('images')}>Images</button>

        {/* ✅ NEW → MANAGE IMAGES BUTTON */}
        <button onClick={() => setScreen('manageImages')}>Manage Images</button>
      </div>

      {/* ---------- MAIN SCREEN AREA ---------- */}

      {screen === 'purchase' && <PurchaseVoucher user={user} />}

      {screen === 'sales' && <SalesVoucher user={user} />}

      {screen === 'stock' && <StockView user={user} />}

      {screen === 'images' && (
        <ImageViewer
          user={user}
          onExit={() => setScreen("purchase")}
        />
      )}

      {/* ✅ NEW — MANAGE IMAGES PAGE */}
      {screen === 'manageImages' && (
        <ManageImages
          user={user}
          onExit={() => setScreen("purchase")}
        />
      )}

    </div>
  );
}
