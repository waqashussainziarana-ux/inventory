import React from 'react';
import { Product, ProductStatus, PurchaseOrder } from '../types';
import { PencilIcon } from './icons';

interface InventoryDetailProps {
  item: Product;
  purchaseOrders: PurchaseOrder[];
  onEditProduct: (product: Product) => void;
}

const InventoryDetail: React.FC<InventoryDetailProps> = ({ item, purchaseOrders, onEditProduct }) => {

  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  
  const purchaseOrder = item.purchaseOrderId ? purchaseOrders.find(po => po.id === item.purchaseOrderId) : null;

  if (item.trackingType === 'quantity') {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 py-3 px-4 text-sm border-t border-slate-100 last:rounded-b-lg even:bg-slate-50/50">
            <div className="text-slate-600">
                <p className="font-semibold">Stock Item</p>
                <p className="text-xs">Available Quantity: {item.quantity}</p>
            </div>
            <div className="flex justify-end">
                 <button onClick={() => onEditProduct(item)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100">
                    <PencilIcon className="w-3 h-3" />
                    Edit / Adjust Stock
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 items-center gap-4 py-3 px-4 text-sm border-t border-slate-100 last:rounded-b-lg even:bg-slate-50/50">
      <div className="font-mono text-slate-800 break-all">{item.imei}</div>
      <div className="text-slate-600">
        <p>{new Date(item.purchaseDate).toLocaleDateString()}</p>
        {purchaseOrder && <p className="text-xs text-slate-500">PO: {purchaseOrder.poNumber}</p>}
      </div>
      <div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === ProductStatus.Available ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{item.status}</span>
      </div>
      <div className="col-span-3">
        {item.status === ProductStatus.Available ? (
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => onEditProduct(item)} className="p-1.5 text-slate-500 hover:text-primary" aria-label="Edit product">
              <PencilIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div>
              <p className="text-slate-800 font-medium">{item.customerName || 'N/A'}</p>
              <div className="text-xs text-slate-500 space-x-2">
                  <span>Cost: {formatCurrency(item.purchasePrice)}</span>
                  {item.invoiceId && <span>| Invoice: <span className="font-semibold text-slate-600">{item.invoiceId.split('-')[0]}...</span></span>}
              </div>
            </div>
            <button onClick={() => onEditProduct(item)} className="p-1.5 text-slate-500 hover:text-primary" aria-label="Edit product">
              <PencilIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryDetail;
