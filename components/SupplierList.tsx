
import React from 'react';
import { Supplier, PurchaseOrder } from '../types';
import { PlusIcon, TrashIcon, PencilIcon } from './icons';

interface SupplierListProps {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onAddSupplier: () => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
}

const SupplierList: React.FC<SupplierListProps> = ({ suppliers, purchaseOrders, onAddSupplier, onEdit, onDelete }) => {
  const poCountBySupplier = React.useMemo(() => {
    const counts: { [supplierId: string]: number } = {};
    purchaseOrders.forEach(po => {
      counts[po.supplierId] = (counts[po.supplierId] || 0) + 1;
    });
    return counts;
  }, [purchaseOrders]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Suppliers</h2>
        <button
          onClick={onAddSupplier}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-primary rounded-lg shadow-sm hover:bg-primary-hover transition-all"
        >
          <PlusIcon className="w-4 h-4" /> Add
        </button>
      </div>
      
      {suppliers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {suppliers.map(supplier => {
            const count = poCountBySupplier[supplier.id] || 0;
            const canDelete = count === 0;
            return (
              <div key={supplier.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">{supplier.name}</h4>
                  <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                    <p className="truncate">{supplier.email || 'No email'}</p>
                    <p>{supplier.phone || 'No phone'}</p>
                  </div>
                  <div className="mt-3">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                      {count} Orders
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-50">
                  <button onClick={() => onEdit(supplier)} className="p-1.5 text-slate-400 hover:text-primary">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(supplier.id)}
                    disabled={!canDelete}
                    className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    title={canDelete ? "Delete" : "Has orders"}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-slate-400 text-xs py-8">No suppliers found.</p>
      )}
    </div>
  );
};

export default SupplierList;
