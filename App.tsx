import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Product, ProductStatus, NewProductInfo, Invoice, InvoiceItem, PurchaseOrder, Customer, Category, Supplier, PurchaseOrderStatus } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import ProductManagementList from './components/ProductManagementList';
import ArchivedProductList from './components/ArchivedProductList';
import Modal from './components/Modal';
import ProductForm from './components/ProductForm';
import ProductEditForm from './components/ProductEditForm';
import InvoiceForm from './components/InvoiceForm';
import InvoiceList from './components/InvoiceList';
import InvoicePDF from './components/InvoicePDF';
import PurchaseOrderForm from './components/PurchaseOrderForm';
import PurchaseOrderList from './components/PurchaseOrderList';
import PurchaseOrderPDF from './components/PurchaseOrderPDF';
import CategoryManagement from './components/CategoryManagement';
import CustomerList from './components/CustomerList';
import CustomerForm from './components/CustomerForm';
import SupplierList from './components/SupplierList';
import SupplierForm from './components/SupplierForm';
import { downloadPdf } from './utils/pdfGenerator';
import { PlusIcon, SearchIcon, DocumentTextIcon, ClipboardDocumentListIcon, DownloadIcon } from './components/icons';

type ActiveTab = 'active' | 'sold' | 'products' | 'archive' | 'invoices' | 'purchaseOrders' | 'customers' | 'categories' | 'suppliers';

const App: React.FC = () => {
  // --- Data Management (using localStorage) ---
  const [products, setProducts] = useLocalStorage<Product[]>('inventory-products', []);
  const [customers, setCustomers] = useLocalStorage<Customer[]>('inventory-customers', [{ id: 'walk-in', name: 'Walk-in Customer', phone: 'N/A' }]);
  const [categories, setCategories] = useLocalStorage<Category[]>('inventory-categories', [
    { id: 'cat-1', name: 'Smartphones' }, { id: 'cat-2', name: 'Laptops' }, { id: 'cat-3', name: 'Accessories' }, { id: 'cat-4', name: 'Tablets' }
  ]);
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>('inventory-invoices', []);
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('inventory-purchaseOrders', []);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('inventory-suppliers', [{ id: 'sup-1', name: 'Default Supplier', email: 'contact@default.com', phone: '123-456-7890' }]);
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);
  const [isInvoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [isPurchaseOrderModalOpen, setPurchaseOrderModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
  
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  
  // PDF Generation State
  const [documentToPrint, setDocumentToPrint] = useState<{ type: 'invoice' | 'po', data: Invoice | PurchaseOrder } | null>(null);

  useEffect(() => {
    if (documentToPrint) {
      const timer = setTimeout(() => {
        const id = documentToPrint.type === 'invoice' ? 'invoice-pdf' : 'po-pdf';
        const fileName = documentToPrint.type === 'invoice' 
            ? `Invoice-${(documentToPrint.data as Invoice).invoiceNumber}.pdf`
            : `PO-${(documentToPrint.data as PurchaseOrder).poNumber}.pdf`;
        
        downloadPdf(id, fileName).then(() => {
          setDocumentToPrint(null);
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [documentToPrint]);

  const handleDownloadInvoice = (invoice: Invoice) => {
    setDocumentToPrint({ type: 'invoice', data: invoice });
  };
  const handleDownloadPurchaseOrder = (po: PurchaseOrder) => {
    setDocumentToPrint({ type: 'po', data: po });
  };

  const handleExportToCSV = () => {
    if (products.length === 0) {
        alert("There is no inventory data to export.");
        return;
    }

    const headers = [
        "ID", "Product Name", "Category", "Purchase Date", "Purchase Price",
        "Selling Price", "Status", "Tracking Type", "IMEI", "Quantity",
        "Customer Name", "Invoice ID", "Purchase Order ID", "Notes"
    ];

    const csvRows = [headers.join(',')];

    const formatCsvField = (field: any): string => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (/[",\n]/.test(stringField)) return `"${stringField.replace(/"/g, '""')}"`;
        return stringField;
    };

    for (const product of products) {
        const row = [
            formatCsvField(product.id),
            formatCsvField(product.productName),
            formatCsvField(product.category),
            formatCsvField(product.purchaseDate),
            formatCsvField(product.purchasePrice),
            formatCsvField(product.sellingPrice),
            formatCsvField(product.status),
            formatCsvField(product.trackingType),
            formatCsvField(product.imei),
            formatCsvField(product.quantity),
            formatCsvField(product.customerName),
            formatCsvField(product.invoiceId),
            formatCsvField(product.purchaseOrderId),
            formatCsvField(product.notes),
        ];
        csvRows.push(row.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `inventory-export-${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const existingImeis = useMemo(() => new Set(products.map(p => p.imei).filter(Boolean)), [products]);
  const availableProducts = useMemo(() => products.filter(p => p.status === ProductStatus.Available), [products]);
  const soldProducts = useMemo(() => products.filter(p => p.status === ProductStatus.Sold), [products]);
  const archivedProducts = useMemo(() => products.filter(p => p.status === ProductStatus.Archived), [products]);

  // --- CRUD Handlers (LocalStorage) ---
  const handleAddProducts = useCallback(async (productData: NewProductInfo, details: { trackingType: 'imei', imeis: string[] } | { trackingType: 'quantity', quantity: number }) => {
    let newProductsBatch: Omit<Product, 'id'>[] = [];
    if (details.trackingType === 'imei') {
        newProductsBatch = details.imeis.map(imei => ({
            ...productData, imei, trackingType: 'imei', quantity: 1, status: ProductStatus.Available,
        }));
    } else {
        newProductsBatch.push({ ...productData, trackingType: 'quantity', quantity: details.quantity, status: ProductStatus.Available });
    }

    const newProductsWithIds = newProductsBatch.map(p => ({ ...p, id: crypto.randomUUID() }));
    setProducts(prev => [...prev, ...newProductsWithIds]);
    return newProductsWithIds;
  }, [setProducts]);

  const handleOpenEditModal = (product: Product) => {
    setProductToEdit(product);
    setEditModalOpen(true);
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    setEditModalOpen(false);
    setProductToEdit(null);
  };
  
  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this product? This action cannot be undone.')) {
        setProducts(prev => prev.filter(p => p.id !== productId));
    }
  };

   const handleArchiveProduct = (productId: string) => {
        const productToArchive = products.find(p => p.id === productId);
        if (productToArchive) {
            handleUpdateProduct({ ...productToArchive, status: ProductStatus.Archived });
        }
    };

    const handleUnarchiveProduct = (productId: string) => {
        const productToUnarchive = products.find(p => p.id === productId);
        if (productToUnarchive) {
            handleUpdateProduct({ ...productToUnarchive, status: ProductStatus.Available });
        }
    };

  const handleCreateInvoice = useCallback(async (customerId: string, items: Omit<InvoiceItem, 'productName' | 'imei'>[]) => {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) { alert('Customer not found'); return; }

      const newInvoiceId = crypto.randomUUID();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`;
      let totalAmount = 0;
      const invoiceItems: InvoiceItem[] = [];
      const updatedProducts = [...products];

      for (const item of items) {
          const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
          if (productIndex === -1) continue;
          const product = updatedProducts[productIndex];

          if (product.trackingType === 'imei') {
              updatedProducts[productIndex] = { ...product, status: ProductStatus.Sold, customerName: customer.name, invoiceId: newInvoiceId };
              invoiceItems.push({ ...item, productName: product.productName, imei: product.imei });
              totalAmount += item.sellingPrice;
          } else {
              const newQuantity = product.quantity - item.quantity;
              if (newQuantity < 0) { alert(`Insufficient stock for ${product.productName}`); return; }
              const newStatus = newQuantity > 0 ? ProductStatus.Available : ProductStatus.Sold;
              updatedProducts[productIndex] = { ...product, quantity: newQuantity, status: newStatus, invoiceId: newInvoiceId };
              invoiceItems.push({ ...item, productName: product.productName });
              totalAmount += item.sellingPrice * item.quantity;
          }
      }
      
      const newInvoice: Invoice = {
          id: newInvoiceId, invoiceNumber, customerId, customerName: customer.name,
          issueDate: new Date().toISOString(), items: invoiceItems, totalAmount
      };

      setProducts(updatedProducts);
      setInvoices(prev => [...prev, newInvoice]);
      setInvoiceModalOpen(false);
      handleDownloadInvoice(newInvoice);
  }, [products, customers, invoices.length, setProducts, setInvoices]);

 const handleCreatePurchaseOrder = useCallback(async (
    poDetails: Omit<PurchaseOrder, 'id' | 'productIds' | 'totalCost' | 'supplierName' | 'issueDate'>,
    productsData: { productInfo: NewProductInfo, details: { trackingType: 'imei', imeis: string[] } | { trackingType: 'quantity', quantity: number } }[]
) => {
    const supplier = suppliers.find(s => s.id === poDetails.supplierId);
    if (!supplier) { alert('Supplier not found.'); return; }

    const newPoId = crypto.randomUUID();
    let totalCost = 0;
    const allNewProducts: Product[] = [];

    for (const batch of productsData) {
        const commonData = { ...batch.productInfo, status: ProductStatus.Available, purchaseOrderId: newPoId };
        if (batch.details.trackingType === 'imei') {
            for (const imei of batch.details.imeis) {
                allNewProducts.push({ ...commonData, id: crypto.randomUUID(), imei, quantity: 1, trackingType: 'imei' });
                totalCost += commonData.purchasePrice;
            }
        } else {
            allNewProducts.push({ ...commonData, id: crypto.randomUUID(), quantity: batch.details.quantity, trackingType: 'quantity' });
            totalCost += commonData.purchasePrice * batch.details.quantity;
        }
    }

    const newPO: PurchaseOrder = {
        ...poDetails, id: newPoId, issueDate: new Date().toISOString(),
        supplierName: supplier.name, productIds: allNewProducts.map(p => p.id), totalCost
    };

    setProducts(prev => [...prev, ...allNewProducts]);
    setPurchaseOrders(prev => [...prev, newPO]);
    setPurchaseOrderModalOpen(false);
    handleDownloadPurchaseOrder(newPO);
}, [products, suppliers, setProducts, setPurchaseOrders]);
  
  const handleAddCategory = async (name: string) => {
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) { alert("Category already exists."); return; }
    const newCategory = { id: crypto.randomUUID(), name };
    setCategories(prev => [...prev, newCategory]);
    return newCategory;
  };

  const handleDeleteCategory = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (products.some(p => p.category === category?.name)) { alert("Cannot delete category as it is used by some products."); return; }
    setCategories(prev => prev.filter(c => c.id !== id));
  };
  
  const handleSaveCustomer = async (customerData: Omit<Customer, 'id'>) => {
    if (customerToEdit) {
        setCustomers(prev => prev.map(c => c.id === customerToEdit.id ? { ...c, ...customerData } : c));
    } else {
        setCustomers(prev => [...prev, { ...customerData, id: crypto.randomUUID() }]);
    }
    setCustomerModalOpen(false);
    setCustomerToEdit(null);
  };

  const handleAddCustomer = async (name: string, phone: string) => {
    if (customers.some(c => c.name.toLowerCase() === name.toLowerCase())) { alert("A customer with this name already exists."); return; }
    const newCustomer = { id: crypto.randomUUID(), name, phone };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  };

  const handleOpenAddCustomerModal = () => {
    setCustomerToEdit(null);
    setCustomerModalOpen(true);
  };
  
  const handleDeleteCustomer = async (id: string) => {
    if (invoices.some(inv => inv.customerId === id)) { alert("Cannot delete customer with existing invoices."); return; }
    setCustomers(prev => prev.filter(c => c.id !== id));
  };
  
 const handleSaveSupplier = async (supplierData: Omit<Supplier, 'id'>) => {
    if (supplierToEdit) {
        setSuppliers(prev => prev.map(s => s.id === supplierToEdit.id ? { ...s, ...supplierData } : s));
    } else {
        setSuppliers(prev => [...prev, { ...supplierData, id: crypto.randomUUID() }]);
    }
    setSupplierModalOpen(false);
    setSupplierToEdit(null);
  };

  const handleOpenAddSupplierModal = () => {
    setSupplierToEdit(null);
    setSupplierModalOpen(true);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (purchaseOrders.some(po => po.supplierId === id)) { alert("Cannot delete supplier with existing purchase orders."); return; }
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  const filteredProducts = useMemo(() => {
    const sourceProducts = activeTab === 'active' ? availableProducts : activeTab === 'sold' ? soldProducts : activeTab === 'archive' ? archivedProducts : products;
    if (!searchQuery) return sourceProducts;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return sourceProducts.filter(p =>
        (p.imei && p.imei.toLowerCase().includes(lowerCaseQuery)) ||
        p.productName.toLowerCase().includes(lowerCaseQuery) ||
        (p.customerName && p.customerName.toLowerCase().includes(lowerCaseQuery)) ||
        p.category.toLowerCase().includes(lowerCaseQuery)
    );
  }, [products, searchQuery, activeTab, availableProducts, soldProducts, archivedProducts]);

  const clearSearch = (tab: ActiveTab) => {
    setSearchQuery('');
    setActiveTab(tab);
  }
  
  const totalActiveStock = useMemo(() => availableProducts.reduce((sum, p) => sum + p.quantity, 0), [availableProducts]);
  const totalSoldUnits = useMemo(() => invoices.reduce((total, inv) => total + inv.items.reduce((subtotal, item) => subtotal + item.quantity, 0), 0), [invoices]);
  const totalArchivedUnits = useMemo(() => archivedProducts.reduce((sum, p) => sum + p.quantity, 0), [archivedProducts]);
  const totalProductLines = useMemo(() => products.reduce((sum, p) => sum + p.quantity, 0), [products]);
  
  const TABS: { id: ActiveTab; label: string; count: number; color: string }[] = [
    { id: 'active', label: 'Active Inventory', count: totalActiveStock, color: 'bg-indigo-100 text-primary-text' },
    { id: 'sold', label: 'Sales History', count: totalSoldUnits, color: 'bg-amber-100 text-amber-800' },
    { id: 'products', label: 'All Products', count: totalProductLines, color: 'bg-slate-200 text-slate-700' },
    { id: 'archive', label: 'Archive', count: totalArchivedUnits, color: 'bg-gray-200 text-gray-700' },
    { id: 'invoices', label: 'Invoices', count: invoices.length, color: 'bg-green-100 text-green-800' },
    { id: 'purchaseOrders', label: 'Purchase Orders', count: purchaseOrders.length, color: 'bg-rose-100 text-rose-800' },
    { id: 'customers', label: 'Customers', count: customers.length, color: 'bg-cyan-100 text-cyan-800' },
    { id: 'categories', label: 'Categories', count: categories.length, color: 'bg-purple-100 text-purple-800' },
    { id: 'suppliers', label: 'Suppliers', count: suppliers.length, color: 'bg-teal-100 text-teal-800' },
  ];
  
  const mainTabs = TABS.filter(tab => tab.id === 'active' || tab.id === 'sold');
  const managementTabs = TABS.filter(tab => tab.id !== 'active' && tab.id !== 'sold');

  const renderContent = () => {
    switch(activeTab) {
        case 'active':
        case 'sold':
            return <ProductList products={filteredProducts} purchaseOrders={purchaseOrders} onEditProduct={handleOpenEditModal} listType={activeTab} searchQuery={searchQuery} />;
        case 'products':
            return <ProductManagementList products={filteredProducts} onEditProduct={handleOpenEditModal} onDeleteProduct={handleDeleteProduct} onArchiveProduct={handleArchiveProduct} />;
        case 'archive':
            return <ArchivedProductList products={filteredProducts} onUnarchiveProduct={handleUnarchiveProduct} onDeleteProduct={handleDeleteProduct} />;
        case 'invoices':
            return <InvoiceList invoices={invoices} products={products} searchQuery={searchQuery} onDownloadInvoice={handleDownloadInvoice} />;
        case 'purchaseOrders':
            return <PurchaseOrderList purchaseOrders={purchaseOrders} products={products} suppliers={suppliers} searchQuery={searchQuery} onDownloadPurchaseOrder={handleDownloadPurchaseOrder} />;
        case 'customers':
            return <CustomerList customers={customers} onEdit={(c) => { setCustomerToEdit(c); setCustomerModalOpen(true); }} onDelete={handleDeleteCustomer} onAddCustomer={handleOpenAddCustomerModal} />;
        case 'categories':
            return <CategoryManagement categories={categories} products={products} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} />;
        case 'suppliers':
            return <SupplierList suppliers={suppliers} purchaseOrders={purchaseOrders} onAddSupplier={handleOpenAddSupplierModal} onEdit={(s) => { setSupplierToEdit(s); setSupplierModalOpen(true); }} onDelete={handleDeleteSupplier} />;
        default:
             return <Dashboard products={products} invoices={invoices} />;
    }
  };

  if (documentToPrint) {
    const documentComponent = documentToPrint.type === 'invoice'
      ? <InvoicePDF invoice={documentToPrint.data as Invoice} />
      : <PurchaseOrderPDF purchaseOrder={documentToPrint.data as PurchaseOrder} products={products} suppliers={suppliers} />;
    return <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">{documentComponent}</div>;
  }

  const nextPoNumber = `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(4, '0')}`;

  return (
    <div className="min-h-screen bg-slate-50">
        <header className="bg-white shadow-sm sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-3">
                    <h1 className="text-2xl font-bold text-primary">Inventory Pro</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={handleExportToCSV} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200" title="Download all products as CSV">
                            <DownloadIcon className="w-4 h-4" /> Export CSV
                        </button>
                    </div>
                </div>
            </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <div className="relative w-full">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by IMEI, product, customer..." className="block w-full rounded-md border-slate-300 pl-10 shadow-sm sm:text-sm py-2.5"/>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setPurchaseOrderModalOpen(true)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md shadow-sm hover:bg-rose-700">
                        <ClipboardDocumentListIcon className="w-5 h-5" /> PO
                    </button>
                    <button onClick={() => setInvoiceModalOpen(true)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700">
                        <DocumentTextIcon className="w-5 h-5" /> Invoice
                    </button>
                    <button onClick={() => setAddProductModalOpen(true)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-hover">
                        <PlusIcon className="w-5 h-5" /> Product
                    </button>
                </div>
            </div>

            <div className="mt-6">
                <Dashboard products={products} invoices={invoices} />
            </div>

            <div className="mt-8">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex flex-wrap gap-x-6" aria-label="Tabs">
                        {[...mainTabs, ...managementTabs].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => clearSearch(tab.id)}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                {tab.label}
                                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${tab.color}`}>{tab.count}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="mt-6">
                    {renderContent()}
                </div>
            </div>
        </main>

        {/* Modals */}
        <Modal isOpen={isAddProductModalOpen} onClose={() => setAddProductModalOpen(false)} title="Add New Product(s)">
            <ProductForm onAddProducts={handleAddProducts} existingImeis={existingImeis} onClose={() => setAddProductModalOpen(false)} categories={categories} onAddCategory={handleAddCategory} />
        </Modal>
        <Modal isOpen={isEditModalOpen} onClose={() => { setEditModalOpen(false); setProductToEdit(null); }} title="Edit Product">
            {productToEdit && <ProductEditForm product={productToEdit} onUpdateProduct={handleUpdateProduct} onClose={() => { setEditModalOpen(false); setProductToEdit(null); }} categories={categories} />}
        </Modal>
        <Modal isOpen={isInvoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="Create New Invoice">
            <InvoiceForm availableProducts={availableProducts} customers={customers} onCreateInvoice={handleCreateInvoice} onClose={() => setInvoiceModalOpen(false)} onAddNewCustomer={handleAddCustomer} />
        </Modal>
        <Modal isOpen={isPurchaseOrderModalOpen} onClose={() => setPurchaseOrderModalOpen(false)} title="Create New Purchase Order">
            <PurchaseOrderForm 
                suppliers={suppliers}
                onSaveSupplier={handleSaveSupplier}
                categories={categories}
                onAddCategory={handleAddCategory}
                existingImeis={existingImeis}
                onCreatePurchaseOrder={handleCreatePurchaseOrder}
                onClose={() => setPurchaseOrderModalOpen(false)}
                nextPoNumber={nextPoNumber}
            />
        </Modal>
        <Modal isOpen={isCustomerModalOpen} onClose={() => { setCustomerModalOpen(false); setCustomerToEdit(null); }} title={customerToEdit ? 'Edit Customer' : 'Add New Customer'}>
            <CustomerForm customer={customerToEdit} onSave={handleSaveCustomer} onClose={() => { setCustomerModalOpen(false); setCustomerToEdit(null); }} />
        </Modal>
        <Modal isOpen={isSupplierModalOpen} onClose={() => { setSupplierModalOpen(false); setSupplierToEdit(null); }} title={supplierToEdit ? 'Edit Supplier' : 'Add New Supplier'}>
            <SupplierForm supplier={supplierToEdit} onSave={handleSaveSupplier} onClose={() => { setSupplierModalOpen(false); setSupplierToEdit(null); }} />
        </Modal>
    </div>
  );
};

export default App;