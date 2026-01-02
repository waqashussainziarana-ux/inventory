
import React, { useMemo } from 'react';
import { Customer } from '../types';
import { PencilIcon, TrashIcon, PlusIcon } from './icons';
import Highlight from './Highlight';

interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onAddCustomer: () => void;
  searchQuery: string;
}

const CustomerList: React.FC<CustomerListProps> = ({ customers, onEdit, onDelete, onAddCustomer, searchQuery }) => {
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const lowerQuery = searchQuery.toLowerCase();
    return customers.filter(c => 
        c.name.toLowerCase().includes(lowerQuery) || 
        c.phone.toLowerCase().includes(lowerQuery)
    );
  }, [customers, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-base sm:text-lg font-black uppercase tracking-widest text-slate-800">Clients</h2>
        <button
          onClick={onAddCustomer}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-primary rounded-xl shadow-lg hover:bg-primary-hover transition-all"
        >
          <PlusIcon className="w-5 h-5" /> Add Client
        </button>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
          <p className="text-slate-500 font-bold text-lg">
            {searchQuery ? `No clients matching "${searchQuery}"` : 'No client records found.'}
          </p>
          {!searchQuery && (
            <button onClick={onAddCustomer} className="mt-4 text-primary font-black uppercase tracking-widest text-xs">Register New Client</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map(customer => (
            <div key={customer.id} className="p-6 sm:p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-300">
              <div>
                <h4 className="font-bold text-slate-900 text-lg sm:text-xl truncate">
                  <Highlight text={customer.name} query={searchQuery} />
                </h4>
                <p className="text-sm sm:text-base text-slate-500 font-medium mt-2">
                  <Highlight text={customer.phone} query={searchQuery} />
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-50">
                <button onClick={() => onEdit(customer)} className="p-2.5 text-slate-400 hover:text-primary transition-colors">
                  <PencilIcon className="w-6 h-6" />
                </button>
                <button onClick={() => onDelete(customer.id)} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors">
                  <TrashIcon className="w-6 h-6" />
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
