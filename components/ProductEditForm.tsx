import React, { useState, useEffect } from 'react';
import { Product, ProductStatus, Category } from '../types';

interface ProductEditFormProps {
  product: Product;
  categories: Category[];
  onUpdateProduct: (product: Product) => void;
  onClose: () => void;
}

const ProductEditForm: React.FC<ProductEditFormProps> = ({ product, categories, onUpdateProduct, onClose }) => {
  const [formData, setFormData] = useState<Product>(product);

  useEffect(() => {
    setFormData(product);
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumericField = ['purchasePrice', 'sellingPrice', 'quantity'].includes(name);
    
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [name]: isNumericField ? (value === '' ? '' : Number(value)) : value,
      };
      // If status is changed to Available, clear the customer name
      if (name === 'status' && value === ProductStatus.Available) {
        newFormData.customerName = '';
      }
      return newFormData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProduct(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-slate-700">Product Name</label>
          <input type="text" name="productName" id="productName" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" value={formData.productName} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-slate-700">Category</label>
          <select name="category" id="category" required value={formData.category} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
              {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
          </select>
        </div>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {formData.trackingType === 'imei' ? (
            <div>
                <label htmlFor="imei" className="block text-sm font-medium text-slate-700">IMEI (Read-only)</label>
                <input type="text" name="imei" id="imei" readOnly disabled className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm bg-slate-100 text-slate-500" value={formData.imei} />
            </div>
        ) : (
            <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">Quantity</label>
                <input type="number" name="quantity" id="quantity" min="0" step="1" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" value={formData.quantity} onChange={handleChange} />
            </div>
        )}
        <div>
          <label htmlFor="purchasePrice" className="block text-sm font-medium text-slate-700">Purchase Price (€)</label>
          <input type="number" name="purchasePrice" id="purchasePrice" step="0.01" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" value={formData.purchasePrice} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="sellingPrice" className="block text-sm font-medium text-slate-700">Selling Price (€)</label>
          <input type="number" name="sellingPrice" id="sellingPrice" step="0.01" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" value={formData.sellingPrice} onChange={handleChange} />
        </div>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
            <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                <option value={ProductStatus.Available}>Available</option>
                <option value={ProductStatus.Sold}>Sold</option>
                <option value={ProductStatus.Archived}>Archived</option>
            </select>
         </div>
         {formData.status === ProductStatus.Sold && formData.trackingType === 'imei' && (
            <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-slate-700">Customer Name</label>
                <input type="text" name="customerName" id="customerName" required={formData.status === ProductStatus.Sold} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" value={formData.customerName} onChange={handleChange} placeholder="Required for sold items"/>
            </div>
         )}
         <div>
          <label htmlFor="purchaseDate" className="block text-sm font-medium text-slate-700">Purchase Date</label>
          <input type="date" name="purchaseDate" id="purchaseDate" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" value={formData.purchaseDate} onChange={handleChange} />
        </div>
       </div>
       <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Notes / Description (Optional)</label>
          <textarea name="notes" id="notes" rows={3} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" value={formData.notes} onChange={handleChange}></textarea>
        </div>

      <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-transparent rounded-md hover:bg-slate-200 focus:outline-none">
          Cancel
        </button>
        <button type="submit" className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none">
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default ProductEditForm;