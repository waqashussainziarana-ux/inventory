
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
        <h2 className="text-sm sm:text-base lg:text-lg font-black uppercase tracking-widest text-slate-800">Suppliers</h2>
        <button
          onClick={onAddSupplier}
          className="inline-flex items-center gap-2 px-4 py-2 text-[10px] sm:text-xs lg:text-sm font-black uppercase tracking-widest text-white bg-primary rounded-xl shadow-lg hover:bg-primary-hover transition-all"
        >
          <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" /> Add Supplier
        </button>
      </div>
      
      {suppliers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(supplier => {
            const count = poCountBySupplier[supplier.id] || 0;
            const canDelete = count === 0;
            return (
              <div key={supplier.id} className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <h4 className="font-bold text-slate-900 text-base sm:text-xl truncate">{supplier.name}</h4>
                  <div className="text-[10px] sm:text-xs lg:text-sm text-slate-500 mt-2 space-y-1">
                    <p className="truncate opacity-80">{supplier.email || 'No email provided'}</p>
                    <p className="font-medium text-slate-600">{supplier.phone || 'No phone provided'}</p>
                  </div>
                  <div className="mt-4">
                    <span className="text-[9px] sm:text-[11px] lg:text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1 rounded-lg">
                      {count} {count === 1 ? 'Order' : 'Orders'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-50">
                  <button onClick={() => onEdit(supplier)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDelete(supplier.id)}
                    disabled={!canDelete}
                    className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title={canDelete ? "Delete" : "Has active orders"}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
           <p className="text-slate-400 font-bold sm:text-lg">No suppliers registered yet.</p>
           <button onClick={onAddSupplier} className="mt-4 text-primary font-black uppercase tracking-widest text-[10px] sm:text-xs">Add First Supplier</button>
        </div>
      )}
    </div>
  );
};

export default SupplierList;
