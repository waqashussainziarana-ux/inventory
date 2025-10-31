import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';

interface SupplierFormProps {
  onSave: (supplier: Omit<Supplier, 'id'>) => void;
  onClose: () => void;
  supplier: Supplier | null;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ onSave, onClose, supplier }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (supplier) {
      setName(supplier.name);
      setEmail(supplier.email || '');
      setPhone(supplier.phone || '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
    }
  }, [supplier]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="supplierName" className="block text-sm font-medium text-slate-700">Supplier Name</label>
        <input
          type="text"
          id="supplierName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
      </div>
       <div>
        <label htmlFor="supplierEmail" className="block text-sm font-medium text-slate-700">Email (Optional)</label>
        <input
          type="email"
          id="supplierEmail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="supplierPhone" className="block text-sm font-medium text-slate-700">Phone Number (Optional)</label>
        <input
          type="tel"
          id="supplierPhone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-hover">
          {supplier ? 'Save Changes' : 'Add Supplier'}
        </button>
      </div>
    </form>
  );
};

export default SupplierForm;