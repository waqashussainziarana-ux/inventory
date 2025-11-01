import React from 'react';
import { PurchaseOrder, Product, Supplier } from '../types';
import PurchaseOrderListItem from './PurchaseOrderListItem';

interface PurchaseOrderListProps {
    purchaseOrders: PurchaseOrder[];
    products: Product[];
    suppliers: Supplier[];
    searchQuery: string;
    onDownloadPurchaseOrder: (po: PurchaseOrder) => void;
}

const PurchaseOrderList: React.FC<PurchaseOrderListProps> = ({ purchaseOrders, products, suppliers, searchQuery, onDownloadPurchaseOrder }) => {
    const sortedPOs = React.useMemo(() => {
        return [...purchaseOrders].sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }, [purchaseOrders]);
    
    const filteredPOs = React.useMemo(() => {
        if (!searchQuery) return sortedPOs;
        const lowerCaseQuery = searchQuery.toLowerCase();
        return sortedPOs.filter(po => 
            po.poNumber.toLowerCase().includes(lowerCaseQuery) ||
            po.supplierName.toLowerCase().includes(lowerCaseQuery)
        );
    }, [sortedPOs, searchQuery]);

    if (filteredPOs.length === 0) {
        let message = 'No purchase orders found.';
        if(searchQuery) message = 'No purchase orders match your search query.';
        else message = 'No purchase orders have been created yet.';

        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-slate-700">{message}</h3>
                <p className="text-sm text-slate-500 mt-1">
                    {searchQuery ? 'Try another search term.' : 'Click "Create PO" to start.'}
                </p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {filteredPOs.map(po => (
                <PurchaseOrderListItem 
                    key={po.id} 
                    purchaseOrder={po} 
                    products={products} 
                    suppliers={suppliers}
                    onDownload={onDownloadPurchaseOrder}
                />
            ))}
        </div>
    );
};

export default PurchaseOrderList;
