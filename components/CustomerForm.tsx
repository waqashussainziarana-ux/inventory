import React, { useState, useEffect } from 'react';
import { Customer } from '../types';

interface CustomerFormProps {
  onSave: (customer: Omit<Customer, 'id'>) => void;
  onClose: () => void;
  customer: Customer | null;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ onSave, onClose, customer }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
    } else {
      setName('');
      setPhone('');
    }
  }, [customer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && phone.trim()) {
      onSave({ name: name.trim(), phone: phone.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="customerName" className="block text-sm font-medium text-slate-700">Full Name</label>
        <input
          type="text"
          id="customerName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="customerPhone" className="block text-sm font-medium text-slate-700">Phone Number</label>
        <input
          type="tel"
          id="customerPhone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-hover">
          {customer ? 'Save Changes' : 'Add Customer'}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;
