import React from 'react';
import { Invoice, Product } from '../types';
import InvoiceListItem from './InvoiceListItem';

interface InvoiceListProps {
    invoices: Invoice[];
    products: Product[]; // Pass all products to find details
    searchQuery: string;
    onDownloadInvoice: (invoice: Invoice) => void;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, products, searchQuery, onDownloadInvoice }) => {
    const sortedInvoices = React.useMemo(() => {
        return [...invoices].sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }, [invoices]);
    
    const filteredInvoices = React.useMemo(() => {
        if (!searchQuery) return sortedInvoices;
        const lowerCaseQuery = searchQuery.toLowerCase();
        return sortedInvoices.filter(invoice => 
            invoice.invoiceNumber.toLowerCase().includes(lowerCaseQuery) ||
            invoice.customerName.toLowerCase().includes(lowerCaseQuery)
        );
    }, [sortedInvoices, searchQuery]);

    if (filteredInvoices.length === 0) {
        let message = 'No invoices found.';
        if(searchQuery) message = 'No invoices match your search query.';
        else message = 'No invoices have been created yet.';

        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-slate-700">{message}</h3>
                <p className="text-sm text-slate-500 mt-1">
                    {searchQuery ? 'Try another search term.' : 'Click "Create Invoice" to start.'}
                </p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {filteredInvoices.map(invoice => (
                <InvoiceListItem 
                    key={invoice.id} 
                    invoice={invoice} 
                    allProducts={products}
                    onDownload={onDownloadInvoice}
                />
            ))}
        </div>
    );
};

export default InvoiceList;