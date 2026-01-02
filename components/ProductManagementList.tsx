
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
            <th scope="col" className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort(sortKeyName)}>
                {children} <span className="text-[8px]">{arrow}</span>
            </th>
        );
    };

    if (products.length === 0) {
        return (
          <div className="text-center py-10">
            <h3 className="text-sm font-bold text-slate-700">No products found.</h3>
          </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead>
                        <tr>
                            <SortableHeader sortKeyName="productName">Product</SortableHeader>
                            <SortableHeader sortKeyName="trackingType">Identifier</SortableHeader>
                            <SortableHeader sortKeyName="quantity">Qty</SortableHeader>
                            <SortableHeader sortKeyName="purchasePrice">Cost</SortableHeader>
                            <SortableHeader sortKeyName="sellingPrice">Price</SortableHeader>
                            <SortableHeader sortKeyName="status">Status</SortableHeader>
                            <th scope="col" className="relative py-3 pl-3 pr-4 sm:pr-0"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {items.map((product) => (
                            <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="whitespace-nowrap py-3 pr-3 text-sm">
                                    <div className="font-bold text-slate-900">{product.productName}</div>
                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{product.category}</div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500 font-mono">{product.imei || 'N/A'}</td>
                                <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">{product.quantity}</td>
                                <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600 font-medium">{formatCurrency(product.purchasePrice)}</td>
                                <td className="whitespace-nowrap px-3 py-3 text-xs text-primary font-bold">{formatCurrency(product.sellingPrice)}</td>
                                <td className="whitespace-nowrap px-3 py-3 text-xs">
                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${product.status === ProductStatus.Available ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {product.status}
                                    </span>
                                </td>
                                <td className="relative whitespace-nowrap py-3 pl-3 pr-4 text-right text-xs font-medium sm:pr-0">
                                   <div className="flex items-center justify-end gap-3">
                                     <button onClick={() => onArchiveProduct(product.id)} className="text-slate-400 hover:text-slate-600" title="Archive">
                                         <ArchiveBoxIcon className="w-4 h-4" />
                                     </button>
                                     <button onClick={() => onEditProduct(product)} className="text-slate-400 hover:text-primary" title="Edit">
                                         <PencilIcon className="w-4 h-4" />
                                     </button>
                                     <button onClick={() => onDeleteProduct(product.id)} className="text-slate-400 hover:text-rose-600" title="Delete">
                                         <TrashIcon className="w-4 h-4" />
                                     </button>
                                   </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {items.map((product) => (
                    <div key={product.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-slate-900 leading-tight">{product.productName}</h4>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{product.category}</span>
                            </div>
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${product.status === ProductStatus.Available ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {product.status}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-50">
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase">Cost</p>
                                <p className="text-xs font-medium text-slate-600">{formatCurrency(product.purchasePrice)}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase">Price</p>
                                <p className="text-xs font-bold text-primary">{formatCurrency(product.sellingPrice)}</p>
                            </div>
                            {product.imei && (
                                <div className="col-span-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase">IMEI</p>
                                    <p className="text-[10px] font-mono text-slate-500">{product.imei}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-4 pt-1">
                            <button onClick={() => onArchiveProduct(product.id)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <ArchiveBoxIcon className="w-3.5 h-3.5" />
                                Archive
                            </button>
                            <button onClick={() => onEditProduct(product)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
                                <PencilIcon className="w-3.5 h-3.5" />
                                Edit
                            </button>
                            <button onClick={() => onDeleteProduct(product.id)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-500">
                                <TrashIcon className="w-3.5 h-3.5" />
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductManagementList;
