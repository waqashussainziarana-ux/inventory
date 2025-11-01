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
        <h2 className="text-xl font-semibold text-slate-800">Manage Suppliers</h2>
        <button
          onClick={onAddSupplier}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none"
        >
          <PlusIcon className="w-5 h-5" /> Add Supplier
        </button>
      </div>
      
      {suppliers.length > 0 ? (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Orders</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {suppliers.map(supplier => {
                        const count = poCountBySupplier[supplier.id] || 0;
                        const canDelete = count === 0;
                        return (
                            <tr key={supplier.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div>{supplier.email}</div>
                                  <div>{supplier.phone}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{count}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-4">
                                        <button onClick={() => onEdit(supplier)} className="text-primary hover:text-primary-hover"><PencilIcon className="w-5 h-5" /></button>
                                        <button
                                            onClick={() => onDelete(supplier.id)}
                                            disabled={!canDelete}
                                            className="text-red-600 hover:text-red-800 disabled:text-slate-300 disabled:cursor-not-allowed"
                                            title={canDelete ? "Delete supplier" : "Cannot delete supplier with purchase orders"}
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      ) : (
        <p className="text-center text-slate-500 py-8">No suppliers found. Add one to get started.</p>
      )}
    </div>
  );
};

export default SupplierList;
