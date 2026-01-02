
import React from 'react';
import { Customer } from '../types';
import { PencilIcon, TrashIcon, PlusIcon } from './icons';

interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onAddCustomer: () => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ customers, onEdit, onDelete, onAddCustomer }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Clients</h2>
        <button
          onClick={onAddCustomer}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-primary rounded-lg shadow-sm hover:bg-primary-hover transition-all"
        >
          <PlusIcon className="w-4 h-4" /> Add
        </button>
      </div>

      {customers.length === 0 ? (
        <p className="text-center text-slate-400 text-xs py-8">No customers found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {customers.map(customer => (
            <div key={customer.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900">{customer.name}</h4>
                <p className="text-xs text-slate-500 font-medium mt-1">{customer.phone}</p>
              </div>
              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-50">
                <button onClick={() => onEdit(customer)} className="p-1.5 text-slate-400 hover:text-primary transition-colors">
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(customer.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerList;
