import React, { useMemo } from 'react';
import { Invoice } from '../types';

interface InvoicePDFProps {
  invoice: Invoice;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice }) => {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  // Group items by name and price for a cleaner list
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
    <div id="invoice-pdf" className="bg-white p-10 font-sans text-slate-800" style={{ width: '210mm', minHeight: 'auto', boxSizing: 'border-box' }}>
      <header className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">INVOICE</h1>
          <div className="space-y-1">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Document No.</p>
            <p className="text-xl font-black text-slate-900">{invoice.invoiceNumber}</p>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Date Issued</p>
            <p className="text-base font-bold">{new Date(invoice.issueDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-black text-indigo-600 mb-2">Gadget Wall</h2>
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
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Billed To</h3>
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xl font-black text-slate-900">{invoice.customerName}</p>
          </div>
        </div>
        <div className="flex flex-col justify-end">
          <div className="flex justify-between border-b border-slate-100 pb-2 mb-2">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Payment Status</span>
            <span className="text-emerald-600 font-black uppercase text-[10px] tracking-widest">Paid In Full</span>
          </div>
        </div>
      </section>
      
      <section className="mb-12">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-4 text-xs font-black uppercase tracking-widest rounded-tl-xl">Item Description</th>
              <th className="p-4 text-xs font-black uppercase tracking-widest text-center">Qty</th>
              <th className="p-4 text-xs font-black uppercase tracking-widest text-right">Unit Price</th>
              <th className="p-4 text-xs font-black uppercase tracking-widest text-right rounded-tr-xl">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groupedItems.map((group, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                <td className="p-4 align-top">
                  <p className="font-bold text-slate-900">{group.productName}</p>
                  {group.imeis.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block w-full mb-0.5">IMEIs / Serial Numbers:</span>
                        <p className="text-[10px] font-mono text-slate-500 leading-relaxed bg-slate-100/50 px-2 py-1 rounded border border-slate-100">
                            {group.imeis.join(', ')}
                        </p>
                    </div>
                  )}
                </td>
                <td className="p-4 text-center font-bold text-slate-700 align-top">{group.quantity}</td>
                <td className="p-4 text-right font-medium text-slate-600 align-top">{formatCurrency(group.sellingPrice)}</td>
                <td className="p-4 text-right font-black text-slate-900 align-top">{formatCurrency(group.sellingPrice * group.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-12 flex justify-end">
        <div className="w-1/2 space-y-4">
          <div className="flex justify-between items-center text-slate-500 text-sm font-bold uppercase tracking-widest">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500 text-sm font-bold uppercase tracking-widest pb-4 border-b border-slate-100">
            <span>VAT (0%)</span>
            <span>€ 0.00</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-lg font-black text-slate-900 uppercase tracking-tighter">Grand Total</span>
            <span className="text-4xl font-black text-indigo-600 tracking-tighter">{formatCurrency(invoice.totalAmount)}</span>
          </div>
        </div>
      </footer>

      <div className="mt-24 pt-12 border-t border-slate-100 text-center">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.3em]">Thank you for your business</p>
      </div>
    </div>
  );
};

export default InvoicePDF;