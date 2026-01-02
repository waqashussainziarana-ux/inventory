
import React, { useState, useMemo } from 'react';
import { ProductGroup, Product, ProductStatus, PurchaseOrder } from '../types';
import InventoryDetail from './InventoryDetail';

interface ProductGroupItemProps {
  group: ProductGroup;
  purchaseOrders: PurchaseOrder[];
  searchQuery: string;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const ProductGroupItem: React.FC<ProductGroupItemProps> = ({ group, purchaseOrders, searchQuery, onEditProduct, onDeleteProduct }) => {
  const isSearchMatch = useMemo(() => {
    if (!searchQuery) return false;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return group.items.some(item => 
      (item.imei && item.imei.toLowerCase().includes(lowerCaseQuery)) ||
      (item.notes && item.notes.toLowerCase().includes(lowerCaseQuery))
    );
  }, [searchQuery, group.items]);

  const [isExpanded, setIsExpanded] = useState(isSearchMatch);

  const availableItems = group.items.filter(item => item.status === ProductStatus.Available);
  const soldItems = group.items.filter(item => item.status === ProductStatus.Sold);

  const availableQty = availableItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalQty = group.items.reduce((sum, item) => sum + item.quantity, 0);
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:border-slate-300">
      <div 
        className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-800">{group.productName}</h3>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 rounded-md">
                {group.category}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm font-medium text-slate-500">
                Stock: <span className={availableQty > 0 ? 'text-green-600' : 'text-rose-600'}>{availableQty}</span> / {totalQty}
            </p>
            <p className="text-sm font-semibold text-primary">
                {formatCurrency(group.sellingPrice)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                <ChevronDownIcon className="w-5 h-5" />
            </div>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-slate-50/50 border-t border-slate-100">
          <div className="bg-slate-100/50 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest grid grid-cols-3 md:grid-cols-6 gap-4">
            <div>Identifier / Type</div>
            <div>Purchased</div>
            <div>Status</div>
            <div className="col-span-3 text-right">Details & Actions</div>
          </div>
          {group.items.map(item => (
            <InventoryDetail 
              key={item.id} 
              item={item} 
              purchaseOrders={purchaseOrders} 
              onEditProduct={onEditProduct}
              onDeleteProduct={onDeleteProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGroupItem;
