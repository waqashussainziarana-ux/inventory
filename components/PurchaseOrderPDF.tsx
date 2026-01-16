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
    const productMap = new Map<string, { item: Product, quantity: number, imeis: string[] }>();
    products.forEach(p => {
        if (p.purchaseOrderId === purchaseOrder.id) {
            const key = `${p.productName.toLowerCase()}-${p.purchasePrice}`;
            if (!productMap.has(key)) {
                productMap.set(key, { item: p, quantity: 0, imeis: [] });
            }
            const entry = productMap.get(key)!;
            entry.quantity += p.quantity;
            if (p.imei) entry.imeis.push(p.imei);
        }
    });
    return Array.from(productMap.values());
  }, [products, purchaseOrder.id]);

  const supplier = suppliers.find(s => s.id === purchaseOrder.supplierId);

  return (
    <div id="po-pdf" className="bg-white p-10 font-sans text-slate-800 mx-auto" style={{ width: '800px', minHeight: 'auto', boxSizing: 'border-box' }}>
      <header className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">PURCHASE ORDER</h1>
          <div className="space-y-1">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">PO Reference</p>
            <p className="text-xl font-black text-slate-900">{purchaseOrder.poNumber}</p>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Order Date</p>
            <p className="text-base font-bold">{new Date(purchaseOrder.issueDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-black text-indigo-600 mb-2">Gadget Wall</h2>
          <div className="text-slate-500 text-sm font-medium leading-relaxed">
            <p>Rua Principal, 123</p>
            <p>1000-001 Lisboa, Portugal</p>
            <p>info@gadgetwall.pt</p>
          </div>
        </div>
      </header>

      <section className="mb-12 grid grid-cols-2 gap-10">
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Supplier</h3>
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 min-h-[100px]">
            <p className="text-xl font-black text-slate-900">{supplier?.name}</p>
            {supplier?.email && <p className="text-slate-500 text-sm mt-1">{supplier.email}</p>}
            {supplier?.phone && <p className="text-slate-500 text-sm">{supplier.phone}</p>}
          </div>
        </div>
        <div className="flex flex-col justify-end text-right">
          <div className="space-y-1">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Order Status</p>
            <p className="text-lg font-black text-slate-900 uppercase">{purchaseOrder.status}</p>
          </div>
        </div>
      </section>
      
      <section className="mb-12">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-4 text-xs font-black uppercase tracking-widest rounded-tl-xl">Product / Category</th>
              <th className="p-4 text-xs font-black uppercase tracking-widest text-center">Qty</th>
              <th className="p-4 text-xs font-black uppercase tracking-widest text-right">Unit Cost</th>
              <th className="p-4 text-xs font-black uppercase tracking-widest text-right rounded-tr-xl">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {poProducts.map(({ item, quantity, imeis }, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <td className="p-4 align-top">
                  <p className="font-bold text-slate-900">{item.productName}</p>
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-0.5">{item.category}</p>
                  {imeis.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block w-full mb-0.5">IMEIs / Serial Numbers:</span>
                        <p className="text-[10px] font-mono text-slate-500 leading-relaxed bg-slate-100/50 px-2 py-1 rounded border border-slate-100">
                            {imeis.join(', ')}
                        </p>
                    </div>
                  )}
                </td>
                <td className="p-4 text-center font-bold text-slate-700 align-top">{quantity}</td>
                <td className="p-4 text-right font-medium text-slate-600 align-top">{formatCurrency(item.purchasePrice)}</td>
                <td className="p-4 text-right font-black text-slate-900 align-top">{formatCurrency(item.purchasePrice * quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {purchaseOrder.notes && (
        <section className="mb-12" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Notes & Instructions</h3>
             <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 italic text-slate-600 text-sm leading-relaxed">
                {purchaseOrder.notes}
             </div>
        </section>
      )}

      <footer className="mt-12 pb-12 flex justify-end">
        <div className="w-1/2 p-8 bg-indigo-600 rounded-[2.5rem] text-white">
          <div className="flex justify-between items-center mb-1 opacity-80 uppercase font-black text-[10px] tracking-widest">
            <span>Total Quantity</span>
            <span>{poProducts.reduce((s, p) => s + p.quantity, 0)} units</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/20">
            <span className="text-lg font-black uppercase tracking-tighter">Total PO Cost</span>
            <span className="text-4xl font-black tracking-tighter">{formatCurrency(purchaseOrder.totalCost)}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PurchaseOrderPDF;