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
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-slate-700">The archive is empty.</h3>
            <p className="text-sm text-slate-500 mt-1">You can archive products from the 'All Products' list.</p>
          </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
                <thead>
                    <tr>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Product</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Identifier</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Purchase Date</th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {products.map((product) => (
                        <tr key={product.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                <div className="font-medium text-gray-900">{product.productName}</div>
                                <div className="text-gray-500">{product.category}</div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono">
                                {product.imei || `QTY: ${product.quantity}`}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(product.purchaseDate).toLocaleDateString()}</td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                               <div className="flex items-center justify-end gap-4">
                                 <button onClick={() => onUnarchiveProduct(product.id)} className="text-green-600 hover:text-green-800" aria-label={`Unarchive ${product.productName}`}>
                                     <ArrowUturnLeftIcon className="w-4 h-4" />
                                 </button>
                                 <button onClick={() => onDeleteProduct(product.id)} className="text-red-600 hover:text-red-800" aria-label={`Delete ${product.productName}`}>
                                     <TrashIcon className="w-4 h-4" />
                                 </button>
                               </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ArchivedProductList;