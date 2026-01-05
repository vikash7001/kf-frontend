import React, { useState, useEffect } from 'react';

import PurchaseVoucher from './PurchaseVoucher';
import SalesVoucher from './SalesVoucher';
import StockView from './StockView';
import ImageViewer from './ImageViewer';
import ManageImages from './ManageImages';
import StockTransfer from './StockTransfer';

// 🔹 MASTER SCREENS
import CategoryMaster from './CategoryMaster';
import SeriesMaster from './SeriesMaster';
import ProductMaster from './ProductMaster';
import CustomerMaster from './CustomerMaster';

// 🔹 NEW SCREEN
import ItemDetails from './ItemDetails';

export default function AdminDashboard({ user }) {

  // purchase | sales | stock | images | manageImages
  // category | series | product | customer | itemDetails
  const [screen, setScreen] = useState('purchase');

  useEffect(() => {
    setScreen('purchase');
  }, []);

  return (
    <div style={{ padding: 15 }}>

      {/* ---------- TOP BUTTON BAR ---------- */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 15,
          flexWrap: 'wrap'
        }}
      >

        {/* Core Operations */}
        <button onClick={() => setScreen('purchase')}>Purchase</button>
        <button onClick={() => setScreen('sales')}>Sales</button>
        <button onClick={() => setScreen('stock')}>Stock</button>
        <button onClick={() => setScreen('transfer')}>Stock Transfer</button>
        {/* Images */}
        <button onClick={() => setScreen('images')}>Images</button>
        <button onClick={() => setScreen('manageImages')}>Manage Images</button>

        {/* Masters */}
        <button onClick={() => setScreen('category')}>Add Category</button>
        <button onClick={() => setScreen('series')}>Add Series</button>
        <button onClick={() => setScreen('product')}>Add Product</button>
        <button onClick={() => setScreen('customer')}>Add Customer</button>

        {/* ✅ NEW BUTTON (AFTER Add Customer) */}
        <button onClick={() => setScreen('itemDetails')}>
          Item Details
        </button>

      </div>

      {/* ---------- MAIN SCREEN AREA ---------- */}

      {screen === 'purchase' && <PurchaseVoucher user={user} />}
      {screen === 'sales' && <SalesVoucher user={user} />}
      {screen === 'stock' && <StockView user={user} />}
{screen === 'transfer' && (
  <StockTransfer
    user={user}
    onExit={() => setScreen('purchase')}
  />
)}

      {screen === 'images' && (
        <ImageViewer
          user={user}
          onExit={() => setScreen('purchase')}
        />
      )}

      {screen === 'manageImages' && (
        <ManageImages
          user={user}
          onExit={() => setScreen('purchase')}
        />
      )}

      {/* ---------- MASTER SCREENS ---------- */}

      {screen === 'category' && (
        <CategoryMaster onExit={() => setScreen('purchase')} />
      )}

      {screen === 'series' && (
        <SeriesMaster onExit={() => setScreen('purchase')} />
      )}

      {screen === 'product' && (
        <ProductMaster onExit={() => setScreen('purchase')} />
      )}

      {screen === 'customer' && (
        <CustomerMaster onExit={() => setScreen('purchase')} />
      )}

      {/* ---------- ITEM DETAILS SCREEN ---------- */}

      {screen === 'itemDetails' && (
        <ItemDetails onExit={() => setScreen('purchase')} />
      )}

    </div>
  );
}
