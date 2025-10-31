

import React, { useState } from 'react';
import { Product, ProductStatus } from '../types';
import { PencilIcon } from './icons';

interface ProductItemProps {
  product: Product;
  onEditProduct: (product: Product) => void;
}

const ProductItem: React.FC<ProductItemProps> = ({ product, onEditProduct }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <div className="bg-white rounded-lg shadow-md transition-shadow duration-300 hover:shadow-lg">
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex-1 mb-2 md:mb-0">
            <p className="text-lg font-semibold text-primary">{product.productName}</p>
            <p className="text-sm text-slate-500">{product.category}</p>
          </div>
          <div className="flex-1 text-left md:text-center mb-2 md:mb-0">
            <p className="text-sm font-mono bg-slate-100 px-2 py-1 rounded inline-block text-slate-700">
              IMEI: {product.imei}
            </p>
          </div>
          <div className="flex-1 text-left md:text-right">
            {product.status === ProductStatus.Available ? (
              <p className="font-semibold text-green-600">{formatCurrency(product.sellingPrice)}</p>
            ) : (
              <p className="font-semibold text-slate-700">{formatCurrency(product.sellingPrice)}</p>
            )}
            <p className="text-sm text-slate-400">Cost: {formatCurrency(product.purchasePrice)}</p>
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div><strong>Purchase Date:</strong> {new Date(product.purchaseDate).toLocaleDateString()}</div>
                <div><strong>Status:</strong> <span className={`px-2 py-1 text-xs font-semibold rounded-full ${product.status === ProductStatus.Available ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{product.status}</span></div>
                {product.customerName && <div><strong>Customer:</strong> {product.customerName}</div>}
                {product.notes && <div className="md:col-span-2"><strong>Notes:</strong> {product.notes}</div>}
              </div>
              <button onClick={() => onEditProduct(product)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100">
                <PencilIcon className="w-3 h-3" />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductItem;