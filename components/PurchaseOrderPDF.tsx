import React from 'react';
import { PurchaseOrder, Product, Supplier } from '../types';

interface PurchaseOrderPDFProps {
  purchaseOrder: PurchaseOrder;
  products: Product[];
  suppliers: Supplier[];
}

const PurchaseOrderPDF: React.FC<PurchaseOrderPDFProps> = ({ purchaseOrder, products, suppliers }) => {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  
  const poProducts = React.useMemo(() => {
    const productMap = new Map<string, { item: Product, quantity: number }>();
    products.forEach(p => {
        if (p.purchaseOrderId === purchaseOrder.id) {
            const key = `${p.productName}-${p.purchasePrice}`;
            if (!productMap.has(key)) {
                productMap.set(key, { item: p, quantity: 0 });
            }
            productMap.get(key)!.quantity += p.quantity;
        }
    });
    return Array.from(productMap.values());
  }, [products, purchaseOrder.id]);

  const supplier = suppliers.find(s => s.id === purchaseOrder.supplierId);

  return (
    <div id="po-pdf" className="bg-white p-10 font-sans text-gray-800" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'sans-serif' }}>
      <header className="flex justify-between items-start mb-12 border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">PURCHASE ORDER</h1>
          <p className="text-gray-600 mt-2">PO Number: <span className="font-semibold">{purchaseOrder.poNumber}</span></p>
          <p className="text-gray-600">Date Issued: {new Date(purchaseOrder.issueDate).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-semibold text-gray-800">Gadget Wall</h2>
          <p className="text-gray-600">Portugal</p>
          <p className="text-gray-600">info@gadget Wall</p>
        </div>
      </header>

      <section className="mb-12">
        <h3 className="text-lg font-semibold text-gray-500 mb-2 border-b pb-2">SUPPLIER</h3>
        <p className="text-xl font-bold text-gray-900">{supplier?.name}</p>
        {supplier?.email && <p className="text-gray-600">{supplier.email}</p>}
        {supplier?.phone && <p className="text-gray-600">{supplier.phone}</p>}
      </section>
      
      <section>
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-sm font-semibold tracking-wide">Product Description</th>
              <th className="p-3 text-sm font-semibold tracking-wide text-center">Quantity</th>
              <th className="p-3 text-sm font-semibold tracking-wide text-right">Unit Cost</th>
              <th className="p-3 text-sm font-semibold tracking-wide text-right">Total Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {poProducts.map(({ item, quantity }, index) => (
              <tr key={index}>
                <td className="p-3">
                  <p className="font-semibold">{item.productName}</p>
                  <p className="text-xs text-gray-500">{item.category}</p>
                </td>
                <td className="p-3 text-center">{quantity}</td>
                <td className="p-3 text-right">{formatCurrency(item.purchasePrice)}</td>
                <td className="p-3 text-right font-semibold">{formatCurrency(item.purchasePrice * quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {purchaseOrder.notes && (
        <section className="mt-8">
             <h3 className="text-lg font-semibold text-gray-500 mb-2">Notes</h3>
             <p className="text-sm text-gray-700 p-4 bg-gray-50 border rounded-md">{purchaseOrder.notes}</p>
        </section>
      )}

      <footer className="mt-12 pt-6 border-t flex justify-end">
        <div className="w-1/3">
          <div className="flex justify-between text-lg">
            <span className="font-semibold text-gray-600">Grand Total:</span>
            <span className="font-bold text-2xl text-gray-900">{formatCurrency(purchaseOrder.totalCost)}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PurchaseOrderPDF;