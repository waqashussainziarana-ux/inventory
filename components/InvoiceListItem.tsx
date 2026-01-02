
import React, { useState } from 'react';
import { Invoice, Product } from '../types';
import { DownloadIcon } from './icons';
import Highlight from './Highlight';

interface InvoiceListItemProps {
  invoice: Invoice;
  allProducts: Product[];
  onDownload: (invoice: Invoice) => void;
  searchQuery?: string;
}

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const InvoiceListItem: React.FC<InvoiceListItemProps> = ({ invoice, onDownload, searchQuery = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-xl hover:border-slate-200 overflow-hidden">
      <div className="p-5 sm:p-6 cursor-pointer hover:bg-slate-50/50" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-primary">
                    <Highlight text={invoice.invoiceNumber} query={searchQuery} />
                </p>
                <p className="text-sm sm:text-base text-slate-500 font-medium">
                    <Highlight text={invoice.customerName} query={searchQuery} />
                </p>
            </div>
            <div className="flex-1 text-left md:text-center text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">
                {new Date(invoice.issueDate).toLocaleDateString()}
            </div>
            <div className="flex-1 text-left md:text-right font-black text-slate-800 text-base sm:text-lg">
                {formatCurrency(invoice.totalAmount)}
            </div>
            <div className="flex items-center gap-5">
                <button 
                    onClick={(e) => { e.stopPropagation(); onDownload(invoice); }} 
                    className="p-2.5 bg-slate-100 text-slate-500 hover:bg-primary hover:text-white rounded-xl transition-all"
                    title="Download PDF"
                >
                    <DownloadIcon className="w-5 h-5"/>
                </button>
                <div className="text-slate-300 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <ChevronDownIcon className="w-6 h-6"/>
                </div>
            </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-slate-50 p-6 bg-slate-50/30">
           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Invoice Items ({invoice.items.length})</h4>
           <div className="space-y-3">
                {invoice.items.map(item => (
                    <div key={item.productId + (item.imei || '')} className="grid grid-cols-4 gap-4 text-sm p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="col-span-3">
                            <p className="font-bold text-slate-800">{item.productName}</p>
                             <p className="text-xs text-slate-500 font-mono mt-1">
                                {item.imei ? item.imei : `Quantity: ${item.quantity}`}
                            </p>
                        </div>
                        <div className="text-right font-black text-slate-700">
                            {formatCurrency(item.sellingPrice * item.quantity)}
                        </div>
                    </div>
                ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceListItem;
