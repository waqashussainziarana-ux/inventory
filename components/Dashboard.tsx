import React, { useState } from 'react';
import { Product, ProductStatus, Invoice } from '../types';
import { BuildingStorefrontIcon, ScaleIcon, ChartBarIcon, DocumentDuplicateIcon, LockIcon, EyeIcon } from './icons';

interface DashboardProps {
  products: Product[];
  invoices: Invoice[];
}

const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  iconBgColor: string;
  isLocked?: boolean;
  onUnlock?: () => void;
}> = ({ title, value, icon, iconBgColor, isLocked, onUnlock }) => (
  <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 sm:gap-5 relative overflow-hidden">
    <div className={`flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl sm:rounded-2xl ${iconBgColor}`}>
      {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5 sm:w-7 sm:h-7 ' + (icon as React.ReactElement).props.className })}
    </div>
    <div className="min-w-0 flex-grow">
      <p className="text-[11px] sm:text-xs lg:text-sm font-black uppercase tracking-wider text-slate-400 truncate">{title}</p>
      {isLocked ? (
        <div className="flex items-center gap-2">
            <p className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-300 select-none">€ ••••</p>
            <button 
                onClick={onUnlock}
                className="p-1 text-primary hover:text-primary-hover bg-primary/10 rounded-lg transition-all"
                title="Unlock View"
            >
                <EyeIcon className="w-4 h-4" />
            </button>
        </div>
      ) : (
        <p className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 truncate">{value}</p>
      )}
    </div>
    {isLocked && (
        <div className="absolute top-2 right-2">
            <LockIcon className="w-3 h-3 text-slate-300" />
        </div>
    )}
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ products = [], invoices = [] }) => {
  const [isProfitUnlocked, setIsProfitUnlocked] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const SECRET_PIN = "2544"; // Updated PIN

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === SECRET_PIN) {
        setIsProfitUnlocked(true);
        setShowPinEntry(false);
        setPin('');
        setPinError(false);
    } else {
        setPinError(true);
        setPin('');
        setTimeout(() => setPinError(false), 2000);
    }
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
    <div className="relative">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard 
          title="Stock" 
          value={totalStock} 
          icon={<BuildingStorefrontIcon className="text-sky-600" />}
          iconBgColor="bg-sky-50" 
        />
        <StatCard 
          title="Value" 
          value={formatCurrency(totalInventoryValue)} 
          icon={<ScaleIcon className="text-indigo-600" />}
          iconBgColor="bg-indigo-50" 
        />
        <StatCard 
          title="Profit" 
          value={formatCurrency(grossProfit)} 
          icon={<ChartBarIcon className="text-green-600" />}
          iconBgColor="bg-green-50" 
          isLocked={!isProfitUnlocked}
          onUnlock={() => setShowPinEntry(true)}
        />
        <StatCard 
          title="Invoices" 
          value={invoices.length} 
          icon={<DocumentDuplicateIcon className="text-amber-600" />}
          iconBgColor="bg-amber-50" 
        />
      </div>

      {showPinEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-xs text-center transform animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <LockIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Private Data</h3>
                <p className="text-xs text-slate-500 font-medium mb-6 uppercase tracking-widest">Enter Access PIN to View Profit</p>
                
                <form onSubmit={handlePinSubmit} className="space-y-4">
                    <input 
                        type="password" 
                        maxLength={4}
                        autoFocus
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                        className={`w-full text-center text-3xl font-black tracking-[0.5em] py-4 bg-slate-50 border-2 rounded-2xl outline-none transition-all ${pinError ? 'border-rose-300 bg-rose-50 text-rose-600 animate-shake' : 'border-transparent focus:border-primary/20 focus:bg-white text-slate-800'}`}
                        placeholder="••••"
                    />
                    {pinError && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Access Denied</p>}
                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setShowPinEntry(false)}
                            className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 hover:bg-primary-hover active:scale-95 transition-all"
                        >
                            Confirm
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;