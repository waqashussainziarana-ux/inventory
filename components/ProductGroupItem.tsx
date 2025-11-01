import React, { useState, useMemo } from 'react';
import { ProductGroup, Product, ProductStatus, PurchaseOrder } from '../types';
import InventoryDetail from './InventoryDetail';

interface ProductGroupItemProps {
  group: ProductGroup;
  purchaseOrders: PurchaseOrder[];
  searchQuery: string;
  onEditProduct: (product: Product) => void;
}

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const ProductGroupItem: React.FC<ProductGroupItemProps> = ({ group, purchaseOrders, searchQuery, onEditProduct }) => {
  const isSearchMatch = useMemo(() => {
    if (!searchQuery) return false;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return group.items.some(item => item.imei && item.imei.toLowerCase().includes(lowerCaseQuery) && !group.productName.toLowerCase().includes(lowerCaseQuery));
  }, [searchQuery, group.items, group.productName]);

  const [isExpanded, setIsExpanded] = useState(isSearchMatch);

  const availableItems = group.items.filter(item => item.status === ProductStatus.Available);
  const soldItems = group.items.filter(item => item.status === ProductStatus.Sold);

  const availableQty = availableItems.reduce((sum, item) => sum + item.quantity, 0);
  const soldQty = soldItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalQty = group.items.reduce((sum, item) => sum + item.quantity, 0);
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  const isQuantityTracked = group.items[0]?.trackingType === 'quantity';

  return (
    <div className="relative bg-white rounded-xl shadow-md transition-shadow duration-300 hover:shadow-lg border border-transparent hover:border-indigo-200/50">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-xl" />
      <div className="pl-6 pr-5 py-5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-slate-800 truncate" title={group.productName}>{group.productName}</p>
            <p className="text-sm text-slate-500 truncate mt-0.5" title={group.category}>{group.category}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
                <p><span className="text-slate-500">Sell:</span> <span className="font-semibold text-slate-700">{formatCurrency(group.sellingPrice)}</span></p>
                <p><span className="text-slate-500">Cost:</span> <span className="font-semibold text-slate-700">{formatCurrency(group.purchasePrice)}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm self-start md:self-center">
            <div className="flex items-center flex-wrap gap-2">
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">Available: {availableQty}</span>
                <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full">Sold: {soldQty}</span>
                <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-1 rounded-full">Total: {totalQty}</span>
            </div>
            <div className="text-slate-400 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <ChevronDownIcon className="w-5 h-5"/>
            </div>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-slate-100">
            {!isQuantityTracked && (
                <div className="grid grid-cols-3 md:grid-cols-6 items-center gap-4 py-2 px-6 text-xs font-semibold text-slate-500 bg-slate-50/75">
                    <div className="col-span-1 md:col-span-1">IMEI</div>
                    <div className="col-span-1 md:col-span-1">Purchase Date</div>
                    <div className="col-span-1 md:col-span-1">Status</div>
                    <div className="col-span-3 md:col-span-3 text-right pr-10">Details</div>
                </div>
            )}
            <div>
              {group.items.map(item => (
                <InventoryDetail key={item.id} item={item} purchaseOrders={purchaseOrders} onEditProduct={onEditProduct} />
              ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default ProductGroupItem;
