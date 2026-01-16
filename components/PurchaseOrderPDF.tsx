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
    <div id="po-pdf" className="bg-white p-12 font-sans text-slate-800 mx-auto" style={{ width: '800px', boxSizing: 'border-box' }}>
      <header className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-10">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-4">PURCHASE ORDER</h1>
          <div className="space-y-1">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">PO Reference</p>
            <p className="text-2xl font-black text-slate-900">{purchaseOrder.poNumber}</p>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Order Date</p>
            <p className="text-lg font-bold">{new Date(purchaseOrder.issueDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-black text-indigo-600 mb-2">Gadget Wall</h2>
          <div className="text-slate-500 text-sm font-medium leading-relaxed">
            <p>Rua Principal, 123</p>
            <p>1000-001 Lisboa, Portugal</p>
            <p>info@gadgetwall.pt</p>
          </div>
        </div>
      </header>

      <section className="mb-12 grid grid-cols-2 gap-10">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Supplier</h3>
          <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 min-h-[140px]">
            <p className="text-3xl font-black text-slate-900 leading-tight">{supplier?.name}</p>
            {supplier?.email && <p className="text-slate-500 text-base mt-2">{supplier.email}</p>}
            {supplier?.phone && <p className="text-slate-500 text-base">{supplier.phone}</p>}
          </div>
        </div>
        <div className="flex flex-col justify-end text-right">
          <div className="space-y-1">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Order Status</p>
            <p className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{purchaseOrder.status}</p>
          </div>
        </div>
      </section>
      
      <section className="mb-12">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-6 text-[10px] font-black uppercase tracking-widest rounded-tl-2xl">Product / Category</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Qty</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Unit Cost</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right rounded-tr-2xl">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {poProducts.map(({ item, quantity, imeis }, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} style={{ breakInside: 'avoid' }}>
                <td className="p-6 align-top">
                    <p className="font-bold text-xl text-slate-900">{item.productName}</p>
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-2">{item.category}</p>
                    {imeis.length > 0 && (
                      <div className="mt-5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">IMEIs / Serial Numbers:</span>
                          <p className="text-[11px] font-mono text-slate-500 leading-loose bg-slate-100/50 p-4 rounded-xl border border-slate-100 word-break-all">
                              {imeis.join(', ')}
                          </p>
                      </div>
                    )}
                </td>
                <td className="p-6 text-center font-bold text-slate-700 align-top text-lg">{quantity}</td>
                <td className="p-6 text-right font-medium text-slate-600 align-top text-lg">{formatCurrency(item.purchasePrice)}</td>
                <td className="p-6 text-right font-black text-slate-900 align-top text-lg">{formatCurrency(item.purchasePrice * quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {purchaseOrder.notes && (
        <section className="mb-12" style={{ breakInside: 'avoid' }}>
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Notes & Instructions</h3>
             <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 italic text-slate-600 text-base leading-relaxed">
                {purchaseOrder.notes}
             </div>
        </section>
      )}

      <footer className="mt-16 flex justify-end" style={{ breakInside: 'avoid' }}>
        <div className="w-1/2 p-10 bg-indigo-600 rounded-[3rem] text-white shadow-2xl shadow-indigo-100">
          <div className="flex justify-between items-center mb-2 opacity-80 uppercase font-black text-[10px] tracking-widest">
            <span>Total Units Ordered</span>
            <span>{poProducts.reduce((s, p) => s + p.quantity, 0)} units</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-white/20">
            <span className="text-2xl font-black uppercase tracking-tighter">Grand Total</span>
            <span className="text-5xl font-black tracking-tighter">{formatCurrency(purchaseOrder.totalCost)}</span>
          </div>
        </div>
      </footer>
      <div className="pb-40"></div>
    </div>
  );
};

export default PurchaseOrderPDF;