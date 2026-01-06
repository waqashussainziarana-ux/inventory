
import React, { useState } from 'react';
import { Invoice, Customer } from '../types';
import { PlusIcon, CloseIcon } from './icons';

interface InvoiceEditFormProps {
  invoice: Invoice;
  customers: Customer[];
  onUpdateInvoice: (id: string, customerData: { customerId: string, customerName: string }) => Promise<void>;
  onClose: () => void;
  onAddNewCustomer: (name: string, phone: string) => Promise<Customer | undefined>;
}

const InvoiceEditForm: React.FC<InvoiceEditFormProps> = ({ invoice, customers, onUpdateInvoice, onClose, onAddNewCustomer }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(invoice.customerId || '');
  const [manualCustomerName, setManualCustomerName] = useState<string>(invoice.customerName || '');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNewCustomer = async () => {
    if (newCustomerName.trim() && newCustomerPhone.trim()) {
        const newCustomer = await onAddNewCustomer(newCustomerName.trim(), newCustomerPhone.trim());
        if (newCustomer) {
            setSelectedCustomerId(newCustomer.id);
            setManualCustomerName(newCustomer.name);
        }
        setNewCustomerName("");
        setNewCustomerPhone("");
        setIsAddingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalName = manualCustomerName;
      if (selectedCustomerId) {
        const found = customers.find(c => c.id === selectedCustomerId);
        if (found) finalName = found.name;
      }
      
      await onUpdateInvoice(invoice.id, {
        customerId: selectedCustomerId,
        customerName: finalName
      });
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Invoice</p>
        <p className="text-lg font-bold text-slate-800">{invoice.invoiceNumber}</p>
      </div>

      <div>
        <label htmlFor="customer" className="block text-sm font-medium text-slate-700">Assigned Customer</label>
        {isAddingCustomer ? (
            <div className="mt-1 space-y-2 p-4 border-2 border-primary/20 rounded-2xl bg-primary/5">
                <input type="text" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} autoFocus className="block w-full rounded-xl border-slate-300 shadow-sm sm:text-sm" placeholder="New customer name" />
                <input type="tel" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} className="block w-full rounded-xl border-slate-300 shadow-sm sm:text-sm" placeholder="Phone number" />
                <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={handleAddNewCustomer} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-primary rounded-xl shadow-sm hover:bg-primary-hover transition-all">Create Client</button>
                    <button type="button" onClick={() => setIsAddingCustomer(false)} className="p-2 text-slate-500 hover:text-slate-700"><CloseIcon className="w-5 h-5" /></button>
                </div>
            </div>
        ) : (
            <div className="flex items-center gap-2 mt-1">
                <select 
                  name="customer" 
                  id="customer" 
                  value={selectedCustomerId}
                  onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      if (!e.target.value) setManualCustomerName('');
                  }}
                  className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-3"
                >
                    <option value="">Walk-in Customer (Manual Name)</option>
                    {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>{customer.name} - {customer.phone}</option>
                    ))}
                </select>
                <button type="button" onClick={() => setIsAddingCustomer(true)} className="p-3 text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all" title="Add new customer">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
        )}
      </div>

      {!selectedCustomerId && !isAddingCustomer && (
        <div>
          <label htmlFor="manualName" className="block text-sm font-medium text-slate-700">Manual Customer Name</label>
          <input 
            type="text" 
            id="manualName"
            value={manualCustomerName}
            onChange={(e) => setManualCustomerName(e.target.value)}
            required={!selectedCustomerId}
            className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-3"
            placeholder="e.g. John Doe"
          />
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
        <button type="button" onClick={onClose} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 focus:outline-none transition-all">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="inline-flex justify-center px-6 py-3 text-xs font-black uppercase tracking-widest text-white bg-primary border border-transparent rounded-xl shadow-lg hover:bg-primary-hover focus:outline-none disabled:opacity-50 transition-all active:scale-95">
          {isSubmitting ? 'Updating...' : 'Update Invoice'}
        </button>
      </div>
    </form>
  );
};

export default InvoiceEditForm;
