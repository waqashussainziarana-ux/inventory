
import React, { useState } from 'react';
import { PurchaseOrder, Product, Supplier } from '../types';
import { DownloadIcon, TrashIcon } from './icons';

interface PurchaseOrderListItemProps {
  purchaseOrder: PurchaseOrder;
  products: Product[];
  suppliers: Supplier[];
  onDownload: (po: PurchaseOrder) => void;
  onDelete?: (id: string) => void;
}

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const PurchaseOrderListItem: React.FC<PurchaseOrderListItemProps> = ({ purchaseOrder, products, suppliers, onDownload, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const poProducts = React.useMemo(() => {
    const productMap = new Map<string, Product[]>();
    products.forEach(p => {
        if (p.purchaseOrderId === purchaseOrder.id) {
            const key = `${p.productName}-${p.purchasePrice}`;
            if (!productMap.has(key)) {
                productMap.set(key, []);
            }
            productMap.get(key)!.push(p);
        }
    });
    return Array.from(productMap.values());
  }, [products, purchaseOrder.id]);
  
  const supplier = suppliers.find(s => s.id === purchaseOrder.supplierId);
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  
  const statusColors = {
      Draft: 'bg-gray-200 text-gray-800',
      Ordered: 'bg-blue-100 text-blue-800',
      Completed: 'bg-green-100 text-green-800'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 transition-shadow duration-300 hover:shadow-lg">
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-primary">{purchaseOrder.poNumber}</p>
                <p className="text-sm text-slate-500">{purchaseOrder.supplierName}</p>
            </div>
             <div className="flex-1 text-left md:text-center">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[purchaseOrder.status]}`}>{purchaseOrder.status}</span>
            </div>
            <div className="flex-1 text-left md:text-center text-sm text-slate-600">
                {new Date(purchaseOrder.issueDate).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold text-slate-800">{formatCurrency(purchaseOrder.totalCost)}</span>
              <button 
                  onClick={(e) => { e.stopPropagation(); onDownload(purchaseOrder); }} 
                  className="p-2 text-slate-500 hover:text-primary"
                  title="Download PDF"
              >
                  <DownloadIcon className="w-5 h-5"/>
              </button>
              {onDelete && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(purchaseOrder.id); }} 
                    className="p-2 text-rose-500 hover:text-rose-700"
                    title="Delete Purchase Order"
                >
                    <TrashIcon className="w-5 h-5"/>
                </button>
              )}
              <div className="text-slate-400 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <ChevronDownIcon className="w-5 h-5"/>
              </div>
            </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-slate-100 p-6 bg-slate-50/50">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h4 className="text-sm font-semibold text-slate-600 mb-2">Supplier Details</h4>
                    <div className="text-sm text-slate-800 bg-white p-3 rounded-md border">
                        <p className="font-bold">{supplier?.name}</p>
                        {supplier?.email && <p>{supplier.email}</p>}
                        {supplier?.phone && <p>{supplier.phone}</p>}
                    </div>
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-slate-600 mb-2">PO Information</h4>
                    <div className="text-sm text-slate-800 bg-white p-3 rounded-md border">
                        <p><strong>PO Number:</strong> {purchaseOrder.poNumber}</p>
                        <p><strong>Issue Date:</strong> {new Date(purchaseOrder.issueDate).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> {purchaseOrder.status}</p>
                    </div>
                </div>
           </div>

           <h4 className="text-sm font-semibold text-slate-600 mb-2">Line Items ({poProducts.length})</h4>
           <div className="overflow-x-auto border rounded-lg bg-white">
               <table className="min-w-full text-sm">
                   <thead className="bg-slate-100 text-left">
                       <tr>
                           <th className="p-3 font-semibold">Product Name</th>
                           <th className="p-3 font-semibold">Quantity</th>
                           <th className="p-3 font-semibold text-right">Unit Cost</th>
                           <th className="p-3 font-semibold text-right">Total Cost</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                        {poProducts.map((batch, index) => {
                           const firstItem = batch[0];
                           const quantity = batch.reduce((sum, item) => sum + item.quantity, 0);
                           const unitCost = firstItem.purchasePrice;
                           const totalCost = quantity * unitCost;
                           return (
                               <tr key={index}>
                                   <td className="p-3">{firstItem.productName}</td>
                                   <td className="p-3">{quantity}</td>
                                   <td className="p-3 text-right">{formatCurrency(unitCost)}</td>
                                   <td className="p-3 text-right font-medium">{formatCurrency(totalCost)}</td>
                               </tr>
                           );
                        })}
                   </tbody>
               </table>
           </div>
           
           {purchaseOrder.notes && (
                <div className="mt-6">
                    <h4 className="text-sm font-semibold text-slate-600 mb-2">Notes</h4>
                    <p className="text-sm text-slate-700 p-3 bg-white border rounded-md">{purchaseOrder.notes}</p>
                </div>
           )}

           <div className="mt-6 text-right">
               <span className="text-sm font-semibold text-slate-600">Grand Total:</span>
               <span className="ml-2 text-xl font-bold text-primary">{formatCurrency(purchaseOrder.totalCost)}</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderListItem;
