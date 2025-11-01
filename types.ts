export enum ProductStatus {
  Available = 'Available',
  Sold = 'Sold',
  Archived = 'Archived',
}

export interface Product {
  id: string;
  productName: string;
  category: string;
  purchaseDate: string;
  purchasePrice: number;
  sellingPrice: number;
  status: ProductStatus;
  notes?: string;
  invoiceId?: string;
  purchaseOrderId?: string;
  
  trackingType: 'imei' | 'quantity';
  imei?: string;
  quantity: number;

  customerName?: string;
}

export type NewProduct = Omit<Product, 'id'>;
export type NewProductInfo = Omit<NewProduct, 'id' | 'imei' | 'purchaseOrderId' | 'quantity' | 'trackingType' | 'status'>;


export interface ProductGroup {
  key: string;
  productName: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  items: Product[];
}

export interface InvoiceItem {
    productId: string;
    quantity: number;
    sellingPrice: number;
    productName: string;
    imei?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string; 
  customerName: string;
  issueDate: string;
  items: InvoiceItem[];
  totalAmount: number;
}

export interface Category {
    id: string;
    name: string;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
}

export interface Supplier {
    id: string;
    name: string;
    email?: string;
    phone?: string;
}

export type PurchaseOrderStatus = 'Draft' | 'Ordered' | 'Completed';

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    supplierId: string;
    supplierName: string;
    issueDate: string;
    productIds: string[];
    totalCost: number;
    status: PurchaseOrderStatus;
    notes?: string;
}
