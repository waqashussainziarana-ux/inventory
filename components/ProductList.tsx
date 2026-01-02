
import React from 'react';
import { Product, ProductGroup, ProductStatus, PurchaseOrder } from '../types';
import ProductGroupItem from './ProductGroupItem';

interface ProductListProps {
  products: Product[];
  purchaseOrders: PurchaseOrder[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  listType: 'active' | 'sold' | 'search';
  searchQuery: string;
}

const getProductGroupKey = (p: Product) => 
  `${p.productName.toLowerCase().trim()}|${p.category.toLowerCase().trim()}|${p.purchasePrice}|${p.sellingPrice}|${p.trackingType}`;

const ProductList: React.FC<ProductListProps> = ({ products, purchaseOrders, onEditProduct, onDeleteProduct, listType, searchQuery }) => {
  const activeProducts = products.filter(p => p.status !== ProductStatus.Archived);

  const groupedProducts = React.useMemo(() => {
      const groups: Record<string, ProductGroup> = {};
      activeProducts.forEach(product => {
          const key = getProductGroupKey(product);
          if (!groups[key]) {
              groups[key] = {
                  key,
                  productName: product.productName,
                  category: product.category,
                  purchasePrice: product.purchasePrice,
                  sellingPrice: product.sellingPrice,
                  items: [],
              };
          }
          groups[key].items.push(product);
      });
      return Object.values(groups).sort((a, b) => a.productName.localeCompare(b.productName));
  }, [activeProducts]);


  if (activeProducts.length === 0 && listType !== 'search') {
    let message = 'No active products found. Add a new product to get started.';
    if (listType === 'sold') message = 'No sales history found. Sold products will appear here.';
    
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-slate-700">{message}</h3>
      </div>
    );
  }

  if (groupedProducts.length === 0) {
     return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-slate-700">No products found for your search.</h3>
        <p className="text-sm text-slate-500 mt-1">Try searching for another IMEI or product name.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedProducts.map(group => (
        <ProductGroupItem 
            key={group.key} 
            group={group} 
            purchaseOrders={purchaseOrders}
            onEditProduct={onEditProduct}
            onDeleteProduct={onDeleteProduct}
            searchQuery={searchQuery}
        />
      ))}
    </div>
  );
};

export default ProductList;
