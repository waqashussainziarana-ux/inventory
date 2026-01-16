import React, { useMemo } from 'react';
import { Invoice } from '../types';

interface InvoicePDFProps {
  invoice: Invoice;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice }) => {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  const groupedItems = useMemo(() => {
    const map = new Map<string, { 
      productName: string, 
      sellingPrice: number, 
      quantity: number, 
      imeis: string[] 
    }>();

    invoice.items.forEach(item => {
      const key = `${item.productName.toLowerCase()}-${item.sellingPrice}`;
      if (!map.has(key)) {
        map.set(key, { 
          productName: item.productName, 
          sellingPrice: item.sellingPrice, 
          quantity: 0, 
          imeis: [] 
        });
      }
      const entry = map.get(key)!;
      entry.quantity += item.quantity;
      if (item.imei) entry.imeis.push(item.imei);
    });

    return Array.from(map.values());
  }, [invoice.items]);

  return (
    <div id="invoice-pdf" className="bg-white p-12 font-sans text-slate-800 mx-auto" style={{ width: '800px', boxSizing: 'border-box' }}>
      <header className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-10">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-4">INVOICE</h1>
          <div className="space-y-1">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Document No.</p>
            <p className="text-2xl font-black text-slate-900">{invoice.invoiceNumber}</p>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Date Issued</p>
            <p className="text-lg font-bold">{new Date(invoice.issueDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-black text-indigo-600 mb-2">Gadget Wall</h2>
          <div className="text-slate-500 text-sm font-medium leading-relaxed">
            <p>Rua Principal, 123</p>
            <p>1000-001 Lisboa, Portugal</p>
            <p>info@gadgetwall.pt</p>
            <p>VAT: PT500000000</p>
          </div>
        </div>
      </header>

      <section className="mb-12 grid grid-cols-2 gap-10">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Billed To</h3>
          <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
            <p className="text-3xl font-black text-slate-900 leading-tight">{invoice.customerName}</p>
          </div>
        </div>
        <div className="flex flex-col justify-end text-right">
          <div className="flex justify-between border-b border-slate-100 pb-3 mb-3">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Payment Status</span>
            <span className="text-emerald-600 font-black uppercase text-[10px] tracking-widest">Paid In Full</span>
          </div>
        </div>
      </section>
      
      <section className="mb-12">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-6 text-[10px] font-black uppercase tracking-widest rounded-tl-2xl">Item Description</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Qty</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Unit Price</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right rounded-tr-2xl">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groupedItems.map((group, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} style={{ breakInside: 'avoid' }}>
                <td className="p-6 align-top">
                    <p className="font-bold text-xl text-slate-900 mb-2">{group.productName}</p>
                    {group.imeis.length > 0 && (
                      <div className="mt-4">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">IMEIs / Serial Numbers:</span>
                          <p className="text-[11px] font-mono text-slate-500 leading-loose bg-slate-100/50 p-4 rounded-xl border border-slate-100 word-break-all">
                              {group.imeis.join(', ')}
                          </p>
                      </div>
                    )}
                </td>
                <td className="p-6 text-center font-bold text-slate-700 align-top text-lg">{group.quantity}</td>
                <td className="p-6 text-right font-medium text-slate-600 align-top text-lg">{formatCurrency(group.sellingPrice)}</td>
                <td className="p-6 text-right font-black text-slate-900 align-top text-lg">{formatCurrency(group.sellingPrice * group.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-16 flex justify-end">
        <div className="w-1/2 space-y-5">
          <div className="flex justify-between items-center text-slate-500 text-sm font-bold uppercase tracking-widest">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500 text-sm font-bold uppercase tracking-widest pb-6 border-b border-slate-100">
            <span>VAT (0%)</span>
            <span>€ 0.00</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Grand Total</span>
            <span className="text-5xl font-black text-indigo-600 tracking-tighter">{formatCurrency(invoice.totalAmount)}</span>
          </div>
        </div>
      </footer>

      <div className="mt-40 pt-16 pb-20 border-t border-slate-100 text-center">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.4em]">Thank you for your business</p>
      </div>
    </div>
  );
};

export default InvoicePDF;