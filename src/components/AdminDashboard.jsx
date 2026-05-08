import React, { useState } from 'react';

import PurchaseVoucher from './PurchaseVoucher';
import SalesVoucher from './SalesVoucher';
import StockView from './StockView';
import ImageViewer from './ImageViewer';
import ManageImages from './ManageImages';
import StockTransfer from './StockTransfer';
import ViewIncoming from './ViewIncoming';
import ViewSales from './ViewSales';
import ViewTransfers from './ViewTransfers';
import RateList from './RateList';
import CategoryMaster from './CategoryMaster';
import SeriesMaster from './SeriesMaster';
import ProductMaster from './ProductMaster';
import CustomerMaster from './CustomerMaster';

import ItemDetails from './ItemDetails';
import OnlineEnablement from './OnlineEnablement';
import OnlineStockView from './OnlineStockView';
import OnlineSkuPendingAmazon from './OnlineSkuPendingAmazon';
import OnlineSkuManager from './OnlineSkuManager';


export default function AdminDashboard({ user }) {

  const [screen, setScreen] = useState('purchase');

  // Collapsible sections
  const [openSections, setOpenSections] = useState({
    CORE: true,
    IMAGES: false,
    MASTERS: false,
    REPORTS: false,
    ONLINE: false
  });

  function toggleSection(title) {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  }

  /* ================= SCREEN MAPPING ================= */

  const screens = {

    // CORE
    purchase: <PurchaseVoucher user={user} />,
    sales: <SalesVoucher user={user} />,
    stock: <StockView user={user} />,
    transfer: <StockTransfer user={user} />,

    // IMAGES
    images: <ImageViewer user={user} />,
    manageImages: <ManageImages user={user} />,

    // MASTERS
    category: <CategoryMaster />,
    series: <SeriesMaster />,
    product: <ProductMaster />,
    customer: <CustomerMaster />,
    rateList: <RateList />,


    // REPORTS
    viewIncoming: <ViewIncoming />,
    viewSales: <ViewSales />,
    viewTransfers: <ViewTransfers />,
itemDetails: (
  <ItemDetails
    onExit={() => setScreen('stock')}
  />
),




    // ONLINE
    onlineEnablement: <OnlineEnablement />,
    onlineStock: <OnlineStockView />,
    onlineSkuAmazon: <OnlineSkuManager marketplace="AMAZON" />,
    onlineSkuPendingAmazon: <OnlineSkuPendingAmazon />
  };

  /* ================= SIDEBAR SECTIONS ================= */

  const sections = [
    {
      title: "CORE",
      items: [
        { key: 'purchase', label: 'Purchase' },
        { key: 'sales', label: 'Sales' },
        { key: 'stock', label: 'Stock' },
        { key: 'transfer', label: 'Stock Transfer' },
      ]
    },

    {
      title: "IMAGES",
      items: [
        { key: 'images', label: 'Images' },
        { key: 'manageImages', label: 'Manage Images' },
      ]
    },
    {
      title: "MASTERS",
      items: [
        { key: 'category', label: 'Category' },
        { key: 'series', label: 'Series' },
        { key: 'product', label: 'Product' },
        { key: 'customer', label: 'Customer' },
        { key: 'rateList', label: 'Rate List' },
      ]
    },
    {
      title: "REPORTS",
      items: [
        { key: 'viewIncoming', label: 'View Purchase' },
        { key: 'viewSales', label: 'View Sales' },
        { key: 'viewTransfers', label: 'Stock Transfers' },
        { key: 'itemDetails', label: 'Item Details' },

      ]
    },

    {
      title: "ONLINE",
      items: [
        { key: 'onlineEnablement', label: 'Online Enablement' },
        { key: 'onlineStock', label: 'Online Stock' },
        { key: 'onlineSkuAmazon', label: 'Amazon SKU' },
        { key: 'onlineSkuPendingAmazon', label: 'Pending SKUs' },
      ]
    }
  ];

  return (
    <div className="erp-layout">

      {/* ================= HEADER ================= */}
      <div className="erp-header">
        <div>KARNI FASHIONS ERP</div>
        <div>Welcome {user?.username || 'Admin'}</div>
      </div>

      {/* ================= BODY ================= */}
      <div className="erp-body">

        {/* ================= SIDEBAR ================= */}
        <aside className="erp-sidebar">
          {sections.map(section => (
            <div key={section.title}>

              {/* Section Title */}
              <div
                className="sidebar-section-title"
                onClick={() => toggleSection(section.title)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <span>{section.title}</span>
                <span>{openSections[section.title] ? "▾" : "▸"}</span>
              </div>

              {/* Section Items */}
              {openSections[section.title] &&
                section.items.map(item => (
                  <div
                    key={item.key}
                    onClick={() => setScreen(item.key)}
                    className={`sidebar-item ${screen === item.key ? 'active' : ''}`}
                  >
                    {item.label}
                  </div>
                ))
              }

            </div>
          ))}
        </aside>

        {/* ================= CONTENT ================= */}
        <main className="erp-content">
          {screens[screen] || <div>Select a module</div>}
        </main>

      </div>
    </div>
  );
}
