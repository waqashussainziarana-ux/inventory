import React, { useState } from 'react';
import { Invoice, Product } from '../types';
import { DownloadIcon } from './icons';

interface InvoiceListItemProps {
  invoice: Invoice;
  allProducts: Product[];
  onDownload: (invoice: Invoice) => void;
}

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const InvoiceListItem: React.FC<InvoiceListItemProps> = ({ invoice, onDownload }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <div className="bg-white rounded-lg shadow-md transition-shadow duration-300 hover:shadow-lg">
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-primary">{invoice.invoiceNumber}</p>
                <p className="text-sm text-slate-500">{invoice.customerName}</p>
            </div>
            <div className="flex-1 text-left md:text-center text-sm text-slate-600">
                {new Date(invoice.issueDate).toLocaleDateString()}
            </div>
            <div className="flex-1 text-left md:text-right font-semibold text-slate-800">
                {formatCurrency(invoice.totalAmount)}
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={(e) => { e.stopPropagation(); onDownload(invoice); }} 
                    className="p-2 text-slate-500 hover:text-primary"
                    title="Download PDF"
                >
                    <DownloadIcon className="w-5 h-5"/>
                </button>
                <div className="text-slate-400 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <ChevronDownIcon className="w-5 h-5"/>
                </div>
            </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
           <h4 className="text-sm font-semibold text-slate-600 mb-2">Products on this Invoice ({invoice.items.length})</h4>
           <div className="space-y-2">
                {invoice.items.map(item => (
                    <div key={item.productId + (item.imei || '')} className="grid grid-cols-3 gap-4 text-sm p-2 bg-white rounded shadow-sm">
                        <div className="col-span-2">
                            <p className="font-medium text-slate-800">{item.productName}</p>
                             <p className="text-xs text-slate-500 font-mono">
                                {item.imei ? item.imei : `Quantity: ${item.quantity}`}
                            </p>
                        </div>
                        <div className="text-right font-medium text-slate-700">
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
