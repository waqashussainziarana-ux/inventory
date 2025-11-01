import React, { useState, useMemo } from 'react';
import { Product, Customer, InvoiceItem } from '../types';
import { SearchIcon, CloseIcon, PlusIcon } from './icons';

interface InvoiceFormProps {
  availableProducts: Product[];
  customers: Customer[];
  onCreateInvoice: (customerId: string, items: Omit<InvoiceItem, 'productName' | 'imei'>[]) => Promise<void>;
  onClose: () => void;
  onAddNewCustomer: (name: string, phone: string) => Promise<Customer | undefined>;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ availableProducts, customers, onCreateInvoice, onClose, onAddNewCustomer }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers.length > 0 ? customers[0].id : '');
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map()); // productId -> quantity
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");


  const filteredProducts = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();
    return availableProducts.filter(p => 
      p.productName.toLowerCase().includes(lowerCaseSearch) ||
      (p.imei && p.imei.toLowerCase().includes(lowerCaseSearch))
    );
  }, [availableProducts, searchTerm]);

  const invoiceItems = useMemo(() => {
    const items: (InvoiceItem & { available: number; trackingType: 'imei' | 'quantity' })[] = [];
    for (const [productId, quantity] of selectedItems.entries()) {
        const product = availableProducts.find(p => p.id === productId);
        if (product) {
            items.push({
                productId: product.id,
                quantity,
                sellingPrice: product.sellingPrice,
                productName: product.productName,
                imei: product.imei,
                available: product.quantity,
                trackingType: product.trackingType,
            });
        }
    }
    return items;
  }, [availableProducts, selectedItems]);

  const totalAmount = useMemo(() => {
    return invoiceItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  }, [invoiceItems]);

  const toggleProductSelection = (product: Product) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      if (newMap.has(product.id)) {
        newMap.delete(product.id);
      } else {
        newMap.set(product.id, 1);
      }
      return newMap;
    });
  };
  
  const handleQuantityChange = (productId: string, quantity: number, maxQuantity: number) => {
      setSelectedItems(prev => {
          const newMap = new Map(prev);
          if (quantity > 0 && quantity <= maxQuantity) {
              newMap.set(productId, quantity);
          }
          return newMap;
      });
  };

  const handleAddNewCustomer = async () => {
    if (newCustomerName.trim() && newCustomerPhone.trim()) {
        const newCustomer = await onAddNewCustomer(newCustomerName.trim(), newCustomerPhone.trim());
        if (newCustomer) {
            setSelectedCustomerId(newCustomer.id);
        }
        setNewCustomerName("");
        setNewCustomerPhone("");
        setIsAddingCustomer(false);
    }
  };
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || selectedItems.size === 0) {
        alert('Please select a customer and at least one product.');
        return;
    }
    const itemsToCreate = invoiceItems.map(({productId, quantity, sellingPrice}) => ({productId, quantity, sellingPrice}));
    await onCreateInvoice(selectedCustomerId, itemsToCreate);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="customer" className="block text-sm font-medium text-slate-700">Customer</label>
        {isAddingCustomer ? (
            <div className="mt-1 space-y-2 p-3 border rounded-md bg-slate-50">
                <input type="text" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} autoFocus className="block w-full rounded-md border-slate-300 shadow-sm sm:text-sm" placeholder="New customer name" />
                <input type="tel" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} className="block w-full rounded-md border-slate-300 shadow-sm sm:text-sm" placeholder="Phone number" />
                <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={handleAddNewCustomer} className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-hover">Save Customer</button>
                    <button type="button" onClick={() => setIsAddingCustomer(false)} className="text-slate-500 hover:text-slate-700"><CloseIcon className="w-4 h-4" /></button>
                </div>
            </div>
        ) : (
            <div className="flex items-center gap-2 mt-1">
                <select 
                  name="customer" 
                  id="customer" 
                  required 
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                >
                    {customers.length === 0 && <option value="" disabled>No customers available</option>}
                    {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>{customer.name} - {customer.phone}</option>
                    ))}
                </select>
                <button type="button" onClick={() => setIsAddingCustomer(true)} className="p-2 text-slate-500 bg-slate-100 rounded-md hover:bg-slate-200" title="Add new customer">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
        )}
        {customers.length === 0 && !isAddingCustomer && <p className="mt-1 text-sm text-slate-500">No customers found. Please add one using the button above.</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Available Products Section */}
        <div className="space-y-3">
            <h3 className="font-medium text-slate-800">Available Products</h3>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-slate-300 pl-10 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>
            <ul className="p-2 border rounded-md max-h-60 overflow-y-auto bg-white space-y-2">
                {filteredProducts.length > 0 ? filteredProducts.map(product => (
                    <li key={product.id} className="p-2 rounded-md hover:bg-slate-100 transition-colors">
                        <label className="flex items-center justify-between text-sm">
                           <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox"
                                    checked={selectedItems.has(product.id)}
                                    onChange={() => toggleProductSelection(product)}
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <div>
                                    <p className="font-medium text-slate-800">{product.productName}</p>
                                    {product.imei ? 
                                        <p className="text-xs text-slate-500 font-mono">{product.imei}</p> :
                                        <p className="text-xs text-slate-500">In Stock: {product.quantity}</p>
                                    }
                                </div>
                           </div>
                           <span className="font-semibold text-slate-700">{formatCurrency(product.sellingPrice)}</span>
                        </label>
                    </li>
                )) : <li className="text-center text-sm text-slate-500 py-4">No available products found.</li>}
            </ul>
        </div>

        {/* Selected Products Section */}
        <div className="space-y-3">
            <h3 className="font-medium text-slate-800">Invoice Items ({invoiceItems.length})</h3>
            <div className="p-2 border rounded-md max-h-60 overflow-y-auto bg-slate-50 space-y-2 min-h-[10rem]">
                {invoiceItems.length > 0 ? invoiceItems.map(item => (
                    <div key={item.productId} className="p-2 bg-white rounded shadow-sm">
                        <div className="flex justify-between items-start text-sm">
                           <div>
                                <p className="font-medium text-slate-800">{item.productName}</p>
                                <p className="text-xs text-slate-500 font-mono">{item.imei || `QTY: ${item.quantity}`}</p>
                           </div>
                           <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700">{formatCurrency(item.sellingPrice * item.quantity)}</span>
                                <button type="button" onClick={() => toggleProductSelection(item as unknown as Product)} className="text-slate-400 hover:text-red-600">
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                           </div>
                        </div>
                        {item.trackingType === 'quantity' && (
                             <div className="mt-2 flex items-center gap-2">
                                <label htmlFor={`quantity-${item.productId}`} className="text-xs font-medium text-slate-600">Qty:</label>
                                <input 
                                    type="number" 
                                    id={`quantity-${item.productId}`}
                                    value={item.quantity}
                                    onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1, item.available)}
                                    min="1"
                                    max={item.available}
                                    className="w-20 rounded-md border-slate-300 shadow-sm text-sm p-1"
                                />
                             </div>
                        )}
                    </div>
                )) : <div className="flex items-center justify-center h-full text-sm text-slate-500">Select products to add them here.</div>}
            </div>
             <div className="flex justify-between items-center pt-2 text-lg font-semibold">
                <span>Total Amount:</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
            </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-transparent rounded-md hover:bg-slate-200 focus:outline-none">
          Cancel
        </button>
        <button type="submit" disabled={selectedItems.size === 0 || !selectedCustomerId} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
          Create Invoice
        </button>
      </div>
    </form>
  );
};

export default InvoiceForm;