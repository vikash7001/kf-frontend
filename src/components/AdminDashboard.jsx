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

  /* ---------- SCREEN MAPPING ---------- */

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

  /* ---------- SIDEBAR SECTIONS ---------- */

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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ---------- TOP HEADER ---------- */}
      <div style={{
        height: 50,
        background: '#0f3c8a',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        fontWeight: 'bold'
      }}>
        <div>KARNI FASHIONS ERP</div>
        <div>
          Welcome {user?.username || 'Admin'}
        </div>
      </div>

      {/* ---------- MAIN BODY ---------- */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* ---------- SIDEBAR ---------- */}
        <div style={{
          width: 230,
          background: '#f4f4f4',
          padding: 15,
          borderRight: '1px solid #ccc',
          overflowY: 'auto'
        }}>
          {sections.map(section => (
            <div key={section.title} style={{ marginBottom: 25 }}>

              <div style={{
                fontSize: 12,
                fontWeight: 'bold',
                marginBottom: 8,
                color: '#666'
              }}>
                {section.title}
              </div>

              {section.items.map(item => (
                <div
                  key={item.key}
                  onClick={() => setScreen(item.key)}
                  style={{
                    padding: '8px 10px',
                    cursor: 'pointer',
                    borderRadius: 4,
                    marginBottom: 5,
                    background: screen === item.key ? '#d9e2ff' : 'transparent',
                    fontWeight: screen === item.key ? 'bold' : 'normal'
                  }}
                >
                  {item.label}
                </div>
              ))}

            </div>
          ))}
        </div>

        {/* ---------- CONTENT AREA ---------- */}
        <div style={{
          flex: 1,
          padding: 20,
          overflowY: 'auto',
          background: '#fafafa'
        }}>
          {screens[screen]}
        </div>

      </div>
    </div>
  );
}
