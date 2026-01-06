
import React, { useState, useMemo } from 'react';
import { Product, ProductStatus } from '../types';
import { PencilIcon, TrashIcon, ArchiveBoxIcon, DownloadIcon } from './icons';
import Highlight from './Highlight';

interface ProductManagementListProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onArchiveProduct: (productId: string) => void;
  onDownloadInvoice: (invoiceId: string) => void;
  searchQuery: string;
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

const ProductManagementList: React.FC<ProductManagementListProps> = ({ products, onEditProduct, onDeleteProduct, onArchiveProduct, onDownloadInvoice, searchQuery }) => {
    const activeProducts = useMemo(() => {
        const base = products.filter(p => p.status !== ProductStatus.Archived);
        if (!searchQuery) return base;
        const lowerQuery = searchQuery.toLowerCase();
        return base.filter(p => 
            p.productName.toLowerCase().includes(lowerQuery) || 
            (p.imei && p.imei.toLowerCase().includes(lowerQuery)) ||
            p.category.toLowerCase().includes(lowerQuery)
        );
    }, [products, searchQuery]);

    const { items, requestSort, sortKey, sortDirection } = useSortableData(activeProducts);
    const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    
    const SortableHeader: React.FC<{ sortKeyName: SortKey, children: React.ReactNode }> = ({ sortKeyName, children }) => {
        const isSorted = sortKey === sortKeyName;
        const arrow = isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '';
        return (
            <th scope="col" className="px-3 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort(sortKeyName)}>
                {children} <span className="text-[10px]">{arrow}</span>
            </th>
        );
    };

    if (activeProducts.length === 0) {
        return (
          <div className="text-center py-20">
            <h3 className="text-lg font-bold text-slate-700">
                {searchQuery ? `No active products matching "${searchQuery}"` : 'No active products found.'}
            </h3>
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
                            <SortableHeader sortKeyName="trackingType">Identifier (IMEI/SN)</SortableHeader>
                            <SortableHeader sortKeyName="quantity">Qty</SortableHeader>
                            <SortableHeader sortKeyName="purchasePrice">Cost</SortableHeader>
                            <SortableHeader sortKeyName="sellingPrice">Price</SortableHeader>
                            <SortableHeader sortKeyName="status">Status</SortableHeader>
                            <th scope="col" className="relative py-4 pl-3 pr-4 sm:pr-0"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {items.map((product) => (
                            <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="whitespace-nowrap py-4 pr-3 text-sm">
                                    <div className="font-bold text-slate-900">
                                        <Highlight text={product.productName} query={searchQuery} />
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-black uppercase tracking-tight">
                                        <Highlight text={product.category} query={searchQuery} />
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500 font-mono">
                                    <Highlight text={product.imei || 'N/A'} query={searchQuery} />
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">{product.quantity}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 font-medium">{formatCurrency(product.purchasePrice)}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-primary font-bold">{formatCurrency(product.sellingPrice)}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-black uppercase tracking-wider ${product.status === ProductStatus.Available ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {product.status}
                                        </span>
                                        {product.status === ProductStatus.Sold && product.invoiceId && (
                                            <button 
                                                onClick={() => onDownloadInvoice(product.invoiceId!)}
                                                className="p-1 text-primary hover:text-primary-hover"
                                                title="Download Invoice"
                                            >
                                                <DownloadIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                   <div className="flex items-center justify-end gap-4">
                                     <button onClick={() => onArchiveProduct(product.id)} className="text-slate-400 hover:text-slate-600" title="Archive">
                                         <ArchiveBoxIcon className="w-5 h-5" />
                                     </button>
                                     <button onClick={() => onEditProduct(product)} className="text-slate-400 hover:text-primary" title="Edit">
                                         <PencilIcon className="w-5 h-5" />
                                     </button>
                                     <button onClick={() => onDeleteProduct(product.id)} className="text-slate-400 hover:text-rose-600" title="Delete">
                                         <TrashIcon className="w-5 h-5" />
                                     </button>
                                   </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {items.map((product) => (
                    <div key={product.id} className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-slate-900 leading-tight text-base sm:text-lg">
                                    <Highlight text={product.productName} query={searchQuery} />
                                </h4>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    <Highlight text={product.category} query={searchQuery} />
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-md ${product.status === ProductStatus.Available ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {product.status}
                                </span>
                                {product.status === ProductStatus.Sold && product.invoiceId && (
                                    <button 
                                        onClick={() => onDownloadInvoice(product.invoiceId!)}
                                        className="p-1.5 bg-primary/10 text-primary rounded-lg"
                                        title="Download Invoice"
                                    >
                                        <DownloadIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-50">
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Cost</p>
                                <p className="text-sm sm:text-base font-medium text-slate-600">{formatCurrency(product.purchasePrice)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Price</p>
                                <p className="text-sm sm:text-base font-bold text-primary">{formatCurrency(product.sellingPrice)}</p>
                            </div>
                            {product.imei && (
                                <div className="col-span-2 mt-1">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">IMEI/SN</p>
                                    <p className="text-sm font-mono text-slate-500 break-all">
                                        <Highlight text={product.imei} query={searchQuery} />
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-6 pt-1">
                            <button onClick={() => onArchiveProduct(product.id)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                                <ArchiveBoxIcon className="w-5 h-5" />
                                Archive
                            </button>
                            <button onClick={() => onEditProduct(product)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:text-primary-hover">
                                <PencilIcon className="w-5 h-5" />
                                Edit
                            </button>
                            <button onClick={() => onDeleteProduct(product.id)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose-500 hover:text-rose-600">
                                <TrashIcon className="w-5 h-5" />
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
