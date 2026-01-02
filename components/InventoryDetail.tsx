
import React from 'react';
import { Product, ProductStatus, PurchaseOrder } from '../types';
import { PencilIcon, TrashIcon } from './icons';

interface InventoryDetailProps {
  item: Product;
  purchaseOrders: PurchaseOrder[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

const InventoryDetail: React.FC<InventoryDetailProps> = ({ item, purchaseOrders, onEditProduct, onDeleteProduct }) => {

  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  
  const purchaseOrder = item.purchaseOrderId ? purchaseOrders.find(po => po.id === item.purchaseOrderId) : null;

  if (item.trackingType === 'quantity') {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 py-3 sm:py-4 px-4 text-sm sm:text-base border-t border-slate-100 last:rounded-b-lg even:bg-slate-50/50">
            <div className="text-slate-600">
                <p className="font-semibold text-slate-800">Bulk Stock Item</p>
                <p className="text-sm">Available Quantity: {item.quantity}</p>
            </div>
            <div className="flex justify-end items-center gap-3">
                 <button onClick={() => onEditProduct(item)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <PencilIcon className="w-4 h-4" />
                    Edit
                </button>
                <button onClick={() => onDeleteProduct(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors" title="Delete product">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 items-center gap-4 py-3 sm:py-4 px-4 text-sm sm:text-base border-t border-slate-100 last:rounded-b-lg even:bg-slate-50/50">
      <div className="font-mono text-slate-800 break-all font-bold sm:text-base">{item.imei}</div>
      <div className="text-slate-600 hidden md:block">
        <p>{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}</p>
        {purchaseOrder && <p className="text-[11px] text-slate-400 font-black uppercase tracking-tight">PO: {purchaseOrder.poNumber}</p>}
      </div>
      <div className="hidden md:block">
        <span className={`px-2 py-0.5 text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-md ${item.status === ProductStatus.Available ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {item.status}
        </span>
      </div>
      <div className="col-span-3">
        <div className="flex justify-between items-center">
            <div className="min-w-0 flex-1 pr-4">
                {item.status === ProductStatus.Sold ? (
                    <div>
                        <p className="text-slate-800 font-bold truncate sm:text-base">{item.customerName || 'Walk-in Customer'}</p>
                        <div className="text-[11px] text-slate-400 font-black uppercase tracking-tight flex items-center gap-2">
                            <span>Cost: {formatCurrency(item.purchasePrice)}</span>
                            {item.invoiceId && (
                                <>
                                    <span>|</span>
                                    <span>Inv: {item.invoiceId.split('-')[0]}...</span>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 italic truncate">{item.notes || 'No notes provided'}</p>
                )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
                <button onClick={() => onEditProduct(item)} className="p-1.5 text-slate-400 hover:text-primary transition-colors" title="Edit product">
                    <PencilIcon className="w-5 h-5" />
                </button>
                <button onClick={() => onDeleteProduct(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors" title="Delete product">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDetail;
