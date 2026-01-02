
import React from 'react';
import { Product } from '../types';
import { TrashIcon, ArrowUturnLeftIcon } from './icons';

interface ArchivedProductListProps {
  products: Product[];
  onUnarchiveProduct: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
}

const ArchivedProductList: React.FC<ArchivedProductListProps> = ({ products, onUnarchiveProduct, onDeleteProduct }) => {
    const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

    if (products.length === 0) {
        return (
          <div className="text-center py-10">
            <h3 className="text-sm font-bold text-slate-700">The archive is empty.</h3>
          </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead>
                        <tr>
                            <th scope="col" className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Product</th>
                            <th scope="col" className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Identifier</th>
                            <th scope="col" className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Purchased</th>
                            <th scope="col" className="relative py-3 pl-3 pr-4 sm:pr-0"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {products.map((product) => (
                            <tr key={product.id} className="hover:bg-slate-50/50">
                                <td className="whitespace-nowrap py-3 text-sm">
                                    <div className="font-bold text-slate-900">{product.productName}</div>
                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{product.category}</div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500 font-mono">
                                    {product.imei || `QTY: ${product.quantity}`}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{new Date(product.purchaseDate).toLocaleDateString()}</td>
                                <td className="relative whitespace-nowrap py-3 pl-3 pr-4 text-right text-xs font-medium sm:pr-0">
                                   <div className="flex items-center justify-end gap-4">
                                     <button onClick={() => onUnarchiveProduct(product.id)} className="text-green-600 hover:text-green-800" title="Unarchive">
                                         <ArrowUturnLeftIcon className="w-4 h-4" />
                                     </button>
                                     <button onClick={() => onDeleteProduct(product.id)} className="text-rose-500 hover:text-rose-700" title="Delete">
                                         <TrashIcon className="w-4 h-4" />
                                     </button>
                                   </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3">
                {products.map((product) => (
                    <div key={product.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">{product.productName}</h4>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{product.category}</span>
                            </div>
                            <span className="text-[8px] text-slate-400 font-mono">{product.imei || `Qty: ${product.quantity}`}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                            <span className="text-[10px] text-slate-500">{new Date(product.purchaseDate).toLocaleDateString()}</span>
                            <div className="flex gap-4">
                                <button onClick={() => onUnarchiveProduct(product.id)} className="text-green-600">
                                    <ArrowUturnLeftIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => onDeleteProduct(product.id)} className="text-rose-500">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ArchivedProductList;
