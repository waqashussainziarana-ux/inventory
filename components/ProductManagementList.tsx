import React, { useState, useMemo } from 'react';
import { Product, ProductStatus } from '../types';
import { PencilIcon, TrashIcon, ArchiveBoxIcon } from './icons';

interface ProductManagementListProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onArchiveProduct: (productId: string) => void;
}

type SortKey = keyof Product;
type SortDirection = 'asc' | 'desc';

const useSortableData = (items: Product[], initialSortKey: SortKey = 'purchaseDate', initialSortDirection: SortDirection = 'desc') => {
    const [sortKey, setSortKey] = useState<SortKey>(initialSortKey);
    const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        sortableItems.sort((a, b) => {
            const valA = a[sortKey] === undefined ? '' : a[sortKey];
            const valB = b[sortKey] === undefined ? '' : b[sortKey];
            if (valA < valB) {
                return sortDirection === 'asc' ? -1 : 1;
            }
            if (valA > valB) {
                return sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sortableItems;
    }, [items, sortKey, sortDirection]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortKey === key && sortDirection === 'asc') {
            direction = 'desc';
        }
        setSortKey(key);
        setSortDirection(direction);
    };

    return { items: sortedItems, requestSort, sortKey, sortDirection };
};


const ProductManagementList: React.FC<ProductManagementListProps> = ({ products, onEditProduct, onDeleteProduct, onArchiveProduct }) => {
    const activeProducts = products.filter(p => p.status !== ProductStatus.Archived);
    const { items, requestSort, sortKey, sortDirection } = useSortableData(activeProducts);
    const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    
    const SortableHeader: React.FC<{ sortKeyName: SortKey, children: React.ReactNode }> = ({ sortKeyName, children }) => {
        const isSorted = sortKey === sortKeyName;
        const arrow = isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '';
        return (
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer" onClick={() => requestSort(sortKeyName)}>
                {children} <span className="text-xs">{arrow}</span>
            </th>
        );
    };

    if (products.length === 0) {
        return (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-slate-700">No products found.</h3>
            <p className="text-sm text-slate-500 mt-1">Your search may not match any products, or your inventory is empty.</p>
          </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
                <thead>
                    <tr>
                        <SortableHeader sortKeyName="productName">Product</SortableHeader>
                        <SortableHeader sortKeyName="trackingType">Identifier</SortableHeader>
                        <SortableHeader sortKeyName="quantity">Qty</SortableHeader>
                        <SortableHeader sortKeyName="purchasePrice">Cost</SortableHeader>
                        <SortableHeader sortKeyName="sellingPrice">Sell Price</SortableHeader>
                        <SortableHeader sortKeyName="status">Status</SortableHeader>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {items.map((product) => (
                        <tr key={product.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                <div className="font-medium text-gray-900">{product.productName}</div>
                                <div className="text-gray-500">{product.category}</div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono">{product.imei || 'N/A'}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{product.quantity}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatCurrency(product.purchasePrice)}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatCurrency(product.sellingPrice)}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${product.status === ProductStatus.Available ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {product.status}
                                </span>
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                               <div className="flex items-center justify-end gap-4">
                                 <button onClick={() => onArchiveProduct(product.id)} className="text-slate-500 hover:text-slate-700" aria-label={`Archive ${product.productName}`}>
                                     <ArchiveBoxIcon className="w-4 h-4" />
                                 </button>
                                 <button onClick={() => onEditProduct(product)} className="text-primary hover:text-primary-hover" aria-label={`Edit ${product.productName}`}>
                                     <PencilIcon className="w-4 h-4" />
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

export default ProductManagementList;
