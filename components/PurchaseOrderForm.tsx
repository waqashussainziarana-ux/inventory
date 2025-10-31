import React, { useState } from 'react';
import { Supplier, Category, NewProductInfo, PurchaseOrderStatus } from '../types';
import ProductForm from './ProductForm';
import { PlusIcon, CloseIcon, TrashIcon } from './icons';
import SupplierForm from './SupplierForm';

type ProductBatch = {
    productInfo: NewProductInfo;
    details: { trackingType: 'imei', imeis: string[] } | { trackingType: 'quantity', quantity: number };
};

interface PurchaseOrderFormProps {
    suppliers: Supplier[];
    onSaveSupplier: (supplier: Omit<Supplier, 'id'>) => void;
    categories: Category[];
    onAddCategory: (name: string) => Category | undefined;
    existingImeis: Set<string>;
    onCreatePurchaseOrder: (
        poDetails: { supplierId: string, poNumber: string, status: PurchaseOrderStatus, notes?: string },
        productsData: ProductBatch[]
    ) => void;
    onClose: () => void;
    nextPoNumber: string;
}

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = (props) => {
    const { suppliers, onSaveSupplier, onCreatePurchaseOrder, onClose, nextPoNumber } = props;
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers.length > 0 ? suppliers[0].id : '');
    const [productBatches, setProductBatches] = useState<ProductBatch[]>([]);
    const [poNumber, setPoNumber] = useState(nextPoNumber);
    const [status, setStatus] = useState<PurchaseOrderStatus>('Ordered');
    const [notes, setNotes] = useState('');
    
    const [currentView, setCurrentView] = useState<'main' | 'add_product' | 'add_supplier'>('main');

    const handleAddProductBatch = (productInfo: NewProductInfo, details: ProductBatch['details']) => {
        setProductBatches(prev => [...prev, { productInfo, details }]);
        setCurrentView('main');
    };
    
    const handleSaveNewSupplier = (supplierData: Omit<Supplier, 'id'>) => {
        onSaveSupplier(supplierData);
        // This is a simplification. In a real app, you'd get the new supplier ID back and set it.
        // For now, we just close the form and the user can select the new supplier from the dropdown.
        setCurrentView('main');
    };
    
    const totalCost = productBatches.reduce((total, batch) => {
        const batchSize = batch.details.trackingType === 'imei' ? batch.details.imeis.length : batch.details.quantity;
        return total + batch.productInfo.purchasePrice * batchSize;
    }, 0);
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplierId || productBatches.length === 0 || !poNumber.trim()) {
            alert('Please select a supplier, enter a PO number, and add at least one product batch.');
            return;
        }
        const poDetails = { supplierId: selectedSupplierId, poNumber: poNumber.trim(), status, notes };
        onCreatePurchaseOrder(poDetails, productBatches);
    };

    if (currentView === 'add_product') {
        return <ProductForm {...props} onAddProducts={handleAddProductBatch as any} onClose={() => setCurrentView('main')} />;
    }
    
    if (currentView === 'add_supplier') {
        return <SupplierForm onSave={handleSaveNewSupplier} onClose={() => setCurrentView('main')} supplier={null} />;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label htmlFor="supplier" className="block text-sm font-medium text-slate-700">Supplier</label>
                    <div className="flex items-center gap-2 mt-1">
                        <select
                            id="supplier"
                            value={selectedSupplierId}
                            onChange={e => setSelectedSupplierId(e.target.value)}
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        >
                            {suppliers.length === 0 && <option value="" disabled>No suppliers available</option>}
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <button type="button" onClick={() => setCurrentView('add_supplier')} className="p-2 text-slate-500 bg-slate-100 rounded-md hover:bg-slate-200" title="Add new supplier">
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div>
                    <label htmlFor="poNumber" className="block text-sm font-medium text-slate-700">PO Number</label>
                    <input type="text" id="poNumber" value={poNumber} onChange={e => setPoNumber(e.target.value)} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                </div>
            </div>
            
            <div className="space-y-4">
                <h3 className="font-medium text-slate-800">Product Batches ({productBatches.length})</h3>
                <div className="space-y-3 p-2 border rounded-md max-h-60 overflow-y-auto bg-slate-50 min-h-[8rem]">
                    {productBatches.map((batch, index) => {
                       const batchSize = batch.details.trackingType === 'imei' ? batch.details.imeis.length : batch.details.quantity;
                       return (
                        <div key={index} className="flex justify-between items-center p-2 bg-white rounded shadow-sm">
                            <div>
                                <p className="font-medium text-slate-800">{batch.productInfo.productName}</p>
                                <p className="text-sm text-slate-500">{batchSize} unit(s) at {formatCurrency(batch.productInfo.purchasePrice)} each</p>
                            </div>
                            <button type="button" onClick={() => setProductBatches(prev => prev.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </div>
                       );
                    })}
                    <button type="button" onClick={() => setCurrentView('add_product')} className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-primary bg-primary-light rounded-md hover:bg-indigo-100">
                        <PlusIcon className="w-5 h-5" /> Add Product Batch
                    </button>
                </div>
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Notes (Optional)</label>
              <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
            </div>
            
            <div className="flex justify-between items-center pt-2 text-lg font-semibold">
                <div className="flex items-center gap-2">
                    <label htmlFor="status" className="text-sm font-medium text-slate-700">Status:</label>
                    <select id="status" value={status} onChange={e => setStatus(e.target.value as PurchaseOrderStatus)} className="rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                        <option value="Draft">Draft</option>
                        <option value="Ordered">Ordered</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>
                <div className="text-right">
                    <span>Total PO Cost:</span>
                    <span className="text-primary ml-2">{formatCurrency(totalCost)}</span>
                </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">
                    Cancel
                </button>
                <button type="submit" disabled={productBatches.length === 0 || !selectedSupplierId} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-hover disabled:opacity-50">
                    Create Purchase Order
                </button>
            </div>
        </form>
    );
};

export default PurchaseOrderForm;