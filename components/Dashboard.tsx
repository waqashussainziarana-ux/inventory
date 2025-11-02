import React from 'react';
import { Product, ProductStatus, Invoice } from '../types';
import { BuildingStorefrontIcon, ScaleIcon, ChartBarIcon, DocumentDuplicateIcon } from './icons';

interface DashboardProps {
  products: Product[];
  invoices: Invoice[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; iconBgColor: string }> = ({ title, value, icon, iconBgColor }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4">
    <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full ${iconBgColor}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ products, invoices }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const activeProducts = products.filter(p => p.status === ProductStatus.Available);
  
  const totalStock = activeProducts.reduce((sum, p) => sum + p.quantity, 0);
  const totalInventoryValue = activeProducts.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);
  
  const totalSalesValue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  const costOfGoodsSold = invoices.reduce((sum, inv) => {
    const cost = inv.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.productId || (p.imei && p.imei === item.imei));
        // For sold quantity-based items, we need to find the original product to get its purchase price
        const purchasePrice = product ? product.purchasePrice : 0;
        return itemSum + (purchasePrice * item.quantity);
    }, 0);
    return sum + cost;
  }, 0);

  const grossProfit = totalSalesValue - costOfGoodsSold;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Stock" 
          value={totalStock} 
          icon={<BuildingStorefrontIcon className="w-6 h-6 text-sky-600" />}
          iconBgColor="bg-sky-100" 
        />
        <StatCard 
          title="Inventory Value" 
          value={formatCurrency(totalInventoryValue)} 
          icon={<ScaleIcon className="w-6 h-6 text-indigo-600" />}
          iconBgColor="bg-indigo-100" 
        />
        <StatCard 
          title="Gross Profit" 
          value={formatCurrency(grossProfit)} 
          icon={<ChartBarIcon className="w-6 h-6 text-green-600" />}
          iconBgColor="bg-green-100" 
        />
        <StatCard 
          title="Total Invoices" 
          value={invoices.length} 
          icon={<DocumentDuplicateIcon className="w-6 h-6 text-amber-600" />}
          iconBgColor="bg-amber-100" 
        />
      </div>
    </>
  );
};

export default Dashboard;