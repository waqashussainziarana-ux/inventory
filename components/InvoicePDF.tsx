
import React from 'react';
import { Invoice } from '../types';

interface InvoicePDFProps {
  invoice: Invoice;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice }) => {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <div id="invoice-pdf" className="bg-white p-10 font-sans text-gray-800" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'sans-serif' }}>
      <header className="flex justify-between items-start mb-12 border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">INVOICE</h1>
          <p className="text-gray-600 mt-2">Invoice Number: <span className="font-semibold">{invoice.invoiceNumber}</span></p>
          <p className="text-gray-600">Date Issued: {new Date(invoice.issueDate).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-semibold text-gray-800">Gadget Wall</h2>
          <p className="text-gray-600">Portugal</p>
          <p className="text-gray-600">info@gadget Wall</p>
        </div>
      </header>

      <section className="mb-12">
        <h3 className="text-lg font-semibold text-gray-500 mb-2 border-b pb-2">BILL TO</h3>
        <p className="text-xl font-bold text-gray-900">{invoice.customerName}</p>
        {/* Add more customer details if available, e.g., phone */}
      </section>
      
      <section>
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-sm font-semibold tracking-wide">Product Description</th>
              <th className="p-3 text-sm font-semibold tracking-wide text-center">Quantity</th>
              <th className="p-3 text-sm font-semibold tracking-wide text-right">Unit Price</th>
              <th className="p-3 text-sm font-semibold tracking-wide text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoice.items.map(item => (
              <tr key={item.productId + (item.imei || '')}>
                <td className="p-3">
                  <p className="font-semibold">{item.productName}</p>
                  {item.imei && <p className="text-xs text-gray-500 font-mono">IMEI/SN: {item.imei}</p>}
                </td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="p-3 text-right">{formatCurrency(item.sellingPrice)}</td>
                <td className="p-3 text-right font-semibold">{formatCurrency(item.sellingPrice * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-12 pt-6 border-t flex justify-end">
        <div className="w-1/3">
          <div className="flex justify-between text-lg">
            <span className="font-semibold text-gray-600">Grand Total:</span>
            <span className="font-bold text-2xl text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InvoicePDF;
