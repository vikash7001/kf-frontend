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

  const screens = {
    purchase: <PurchaseVoucher user={user} />,
    sales: <SalesVoucher user={user} />,
    stock: <StockView user={user} />,
    transfer: <StockTransfer user={user} />,
    images: <ImageViewer user={user} />,
    manageImages: <ManageImages user={user} />,
    category: <CategoryMaster />,
    series: <SeriesMaster />,
    product: <ProductMaster />,
    customer: <CustomerMaster />,
    rateList: <RateList />,
    itemDetails: <ItemDetails />,
    onlineEnablement: <OnlineEnablement />,
    onlineStock: <OnlineStockView />,
    onlineSkuAmazon: <OnlineSkuManager marketplace="AMAZON" />,
    onlineSkuPendingAmazon: <OnlineSkuPendingAmazon />,
    viewIncoming: <ViewIncoming />,
    viewSales: <ViewSales />,
    viewTransfers: <ViewTransfers />
  };

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

      {/* ---------- HEADER ---------- */}
      <div className="erp-header">
        <div className="erp-header-left">
          KARNI FASHIONS ERP
        </div>
        <div className="erp-header-right">
          Welcome {user?.username || 'Admin'}
        </div>
      </div>

      {/* ---------- BODY ---------- */}
      <div className="erp-body">

        {/* ---------- SIDEBAR ---------- */}
        <div className="erp-sidebar">

          {sections.map(section => (
            <div key={section.title}>

              <div className="sidebar-section-title">
                {section.title}
              </div>

              {section.items.map(item => (
                <div
                  key={item.key}
                  onClick={() => setScreen(item.key)}
                  className={`sidebar-item ${screen === item.key ? 'active' : ''}`}
                >
                  {item.label}
                </div>
              ))}

            </div>
          ))}

        </div>

        {/* ---------- CONTENT ---------- */}
        <div className="erp-content">
          {screens[screen]}
        </div>

      </div>
    </div>
  );
}
