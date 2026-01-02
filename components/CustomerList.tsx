
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
        <h2 className="text-sm sm:text-base lg:text-lg font-black uppercase tracking-widest text-slate-800">Clients</h2>
        <button
          onClick={onAddCustomer}
          className="inline-flex items-center gap-2 px-4 py-2 text-[10px] sm:text-xs lg:text-sm font-black uppercase tracking-widest text-white bg-primary rounded-xl shadow-lg hover:bg-primary-hover transition-all"
        >
          <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" /> Add Client
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-bold sm:text-lg">No client records found.</p>
          <button onClick={onAddCustomer} className="mt-4 text-primary font-black uppercase tracking-widest text-[10px] sm:text-xs">Register New Client</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map(customer => (
            <div key={customer.id} className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <h4 className="font-bold text-slate-900 text-base sm:text-xl truncate">{customer.name}</h4>
                <p className="text-xs sm:text-sm lg:text-base text-slate-500 font-medium mt-2">{customer.phone}</p>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-50">
                <button onClick={() => onEdit(customer)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button onClick={() => onDelete(customer.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                  <TrashIcon className="w-5 h-5" />
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
