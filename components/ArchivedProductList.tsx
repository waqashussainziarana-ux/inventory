
import React, { useMemo } from 'react';
import { Product } from '../types';
import { TrashIcon, ArrowUturnLeftIcon } from './icons';
import Highlight from './Highlight';

interface ArchivedProductListProps {
  products: Product[];
  onUnarchiveProduct: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
  searchQuery: string;
}

const ArchivedProductList: React.FC<ArchivedProductListProps> = ({ products, onUnarchiveProduct, onDeleteProduct, searchQuery }) => {
    const filteredProducts = useMemo(() => {
        if (!searchQuery) return products;
        const lowerQuery = searchQuery.toLowerCase();
        return products.filter(p => 
            p.productName.toLowerCase().includes(lowerQuery) || 
            (p.imei && p.imei.toLowerCase().includes(lowerQuery)) ||
            (p.category && p.category.toLowerCase().includes(lowerQuery))
        );
    }, [products, searchQuery]);

    if (filteredProducts.length === 0) {
        return (
          <div className="text-center py-20">
            <h3 className="text-lg font-bold text-slate-700">
                {searchQuery ? `No results for "${searchQuery}" in archive` : 'The archive is empty.'}
            </h3>
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
                            <th scope="col" className="px-3 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">Product</th>
                            <th scope="col" className="px-3 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">Identifier (IMEI/SN)</th>
                            <th scope="col" className="px-3 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">Purchased</th>
                            <th scope="col" className="relative py-4 pl-3 pr-4 sm:pr-0"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="whitespace-nowrap py-4 pr-3 text-sm">
                                    <div className="font-bold text-slate-900">
                                        <Highlight text={product.productName} query={searchQuery} />
                                    </div>
                                    <div className="text-xs text-slate-400 font-black uppercase tracking-tight">
                                        <Highlight text={product.category} query={searchQuery} />
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 font-mono">
                                    <Highlight text={product.imei || `QTY: ${product.quantity}`} query={searchQuery} />
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{new Date(product.purchaseDate).toLocaleDateString()}</td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                   <div className="flex items-center justify-end gap-5">
                                     <button onClick={() => onUnarchiveProduct(product.id)} className="text-emerald-600 hover:text-emerald-800" title="Unarchive">
                                         <ArrowUturnLeftIcon className="w-5 h-5" />
                                     </button>
                                     <button onClick={() => onDeleteProduct(product.id)} className="text-rose-500 hover:text-rose-700" title="Delete">
                                         <TrashIcon className="w-5 h-5" />
                                     </button>
                                   </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {filteredProducts.map((product) => (
                    <div key={product.id} className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">
                                    <Highlight text={product.productName} query={searchQuery} />
                                </h4>
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                    <Highlight text={product.category} query={searchQuery} />
                                </span>
                            </div>
                            <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded">
                                <Highlight text={product.imei || `Qty: ${product.quantity}`} query={searchQuery} />
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                            <span className="text-xs font-medium text-slate-400">{new Date(product.purchaseDate).toLocaleDateString()}</span>
                            <div className="flex gap-6">
                                <button onClick={() => onUnarchiveProduct(product.id)} className="text-emerald-600">
                                    <ArrowUturnLeftIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => onDeleteProduct(product.id)} className="text-rose-500">
                                    <TrashIcon className="w-5 h-5" />
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
