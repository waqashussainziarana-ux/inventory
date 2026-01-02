
import React from 'react';
import { Product, ProductStatus, Invoice } from '../types';
import { BuildingStorefrontIcon, ScaleIcon, ChartBarIcon, DocumentDuplicateIcon } from './icons';

interface DashboardProps {
  products: Product[];
  invoices: Invoice[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; iconBgColor: string }> = ({ title, value, icon, iconBgColor }) => (
  <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
    <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl ${iconBgColor}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">{title}</p>
      <p className="text-base sm:text-lg font-black text-slate-900 truncate">{value}</p>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ products = [], invoices = [] }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const activeProducts = Array.isArray(products) ? products.filter(p => p.status === ProductStatus.Available) : [];
  
  const totalStock = activeProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalInventoryValue = activeProducts.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0);
  
  const totalSalesValue = Array.isArray(invoices) ? invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) : 0;
  
  const costOfGoodsSold = Array.isArray(invoices) ? invoices.reduce((sum, inv) => {
    const cost = Array.isArray(inv.items) ? inv.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.productId || (p.imei && p.imei === item.imei));
        const purchasePrice = product ? (product.purchasePrice || 0) : 0;
        return itemSum + (purchasePrice * (item.quantity || 0));
    }, 0) : 0;
    return sum + cost;
  }, 0) : 0;

  const grossProfit = totalSalesValue - costOfGoodsSold;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard 
        title="Stock" 
        value={totalStock} 
        icon={<BuildingStorefrontIcon className="w-5 h-5 text-sky-600" />}
        iconBgColor="bg-sky-50" 
      />
      <StatCard 
        title="Value" 
        value={formatCurrency(totalInventoryValue)} 
        icon={<ScaleIcon className="w-5 h-5 text-indigo-600" />}
        iconBgColor="bg-indigo-50" 
      />
      <StatCard 
        title="Profit" 
        value={formatCurrency(grossProfit)} 
        icon={<ChartBarIcon className="w-5 h-5 text-green-600" />}
        iconBgColor="bg-green-50" 
      />
      <StatCard 
        title="Invoices" 
        value={invoices.length} 
        icon={<DocumentDuplicateIcon className="w-5 h-5 text-amber-600" />}
        iconBgColor="bg-amber-50" 
      />
    </div>
  );
};

export default Dashboard;
