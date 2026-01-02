
import React, { useMemo } from 'react';
import { Supplier, PurchaseOrder } from '../types';
import { PlusIcon, TrashIcon, PencilIcon } from './icons';
import Highlight from './Highlight';

interface SupplierListProps {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onAddSupplier: () => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
}

const SupplierList: React.FC<SupplierListProps> = ({ suppliers, purchaseOrders, onAddSupplier, onEdit, onDelete, searchQuery }) => {
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;
    const lowerQuery = searchQuery.toLowerCase();
    return suppliers.filter(s => 
        s.name.toLowerCase().includes(lowerQuery) || 
        (s.email && s.email.toLowerCase().includes(lowerQuery)) ||
        (s.phone && s.phone.toLowerCase().includes(lowerQuery))
    );
  }, [suppliers, searchQuery]);

  const poCountBySupplier = useMemo(() => {
    const counts: { [supplierId: string]: number } = {};
    purchaseOrders.forEach(po => {
      counts[po.supplierId] = (counts[po.supplierId] || 0) + 1;
    });
    return counts;
  }, [purchaseOrders]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-base sm:text-lg font-black uppercase tracking-widest text-slate-800">Suppliers</h2>
        <button
          onClick={onAddSupplier}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-primary rounded-xl shadow-lg hover:bg-primary-hover transition-all"
        >
          <PlusIcon className="w-5 h-5" /> Add Supplier
        </button>
      </div>
      
      {filteredSuppliers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map(supplier => {
            const count = poCountBySupplier[supplier.id] || 0;
            const canDelete = count === 0;
            return (
              <div key={supplier.id} className="p-6 sm:p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                <div>
                  <h4 className="font-bold text-slate-900 text-lg sm:text-xl truncate">
                    <Highlight text={supplier.name} query={searchQuery} />
                  </h4>
                  <div className="text-sm sm:text-base text-slate-500 mt-2 space-y-1">
                    <p className="truncate opacity-80">
                      <Highlight text={supplier.email || 'No email provided'} query={searchQuery} />
                    </p>
                    <p className="font-medium text-slate-600">
                      <Highlight text={supplier.phone || 'No phone provided'} query={searchQuery} />
                    </p>
                  </div>
                  <div className="mt-4">
                    <span className="text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg">
                      {count} {count === 1 ? 'Order' : 'Orders'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-50">
                  <button onClick={() => onEdit(supplier)} className="p-2.5 text-slate-400 hover:text-primary transition-colors">
                    <PencilIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => onDelete(supplier.id)}
                    disabled={!canDelete}
                    className="p-2.5 text-slate-400 hover:text-rose-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title={canDelete ? "Delete" : "Has active orders"}
                  >
                    <TrashIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
           <p className="text-slate-500 font-bold text-lg">
             {searchQuery ? `No suppliers matching "${searchQuery}"` : 'No suppliers registered yet.'}
           </p>
           {!searchQuery && (
             <button onClick={onAddSupplier} className="mt-4 text-primary font-black uppercase tracking-widest text-xs">Add First Supplier</button>
           )}
        </div>
      )}
    </div>
  );
};

export default SupplierList;
