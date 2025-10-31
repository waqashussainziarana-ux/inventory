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
import { PlusIcon, SearchIcon, DocumentTextIcon, ClipboardDocumentListIcon } from './components/icons';

type ActiveTab = 'active' | 'sold' | 'products' | 'archive' | 'invoices' | 'purchaseOrders' | 'customers' | 'categories' | 'suppliers';

const App: React.FC = () => {
  const [products, setProducts] = useLocalStorage<Product[]>('inventory-products', []);
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>('inventory-invoices', []);
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('inventory-purchase-orders', []);
  const [customers, setCustomers] = useLocalStorage<Customer[]>('inventory-customers', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('inventory-categories', []);
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('inventory-suppliers', []);

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
      }, 100); // Small delay to ensure the component has rendered
      return () => clearTimeout(timer);
    }
  }, [documentToPrint]);

  const handleDownloadInvoice = (invoice: Invoice) => {
    setDocumentToPrint({ type: 'invoice', data: invoice });
  };
  const handleDownloadPurchaseOrder = (po: PurchaseOrder) => {
    setDocumentToPrint({ type: 'po', data: po });
  };


  const existingImeis = useMemo(() => new Set(products.map(p => p.imei).filter(Boolean)), [products]);
  const availableProducts = useMemo(() => products.filter(p => p.status === ProductStatus.Available), [products]);
  const soldProducts = useMemo(() => products.filter(p => p.status === ProductStatus.Sold), [products]);
  const archivedProducts = useMemo(() => products.filter(p => p.status === ProductStatus.Archived), [products]);

  // CRUD Handlers
  const handleAddProducts = useCallback((productData: NewProductInfo, details: { trackingType: 'imei', imeis: string[] } | { trackingType: 'quantity', quantity: number }, purchaseOrderId?: string) => {
    let newProducts: Product[] = [];
    if (details.trackingType === 'imei') {
        newProducts = details.imeis.map(imei => ({
            ...productData,
            id: `${new Date().toISOString()}-${imei}`,
            imei: imei,
            trackingType: 'imei',
            quantity: 1,
            status: ProductStatus.Available,
            purchaseOrderId,
        }));
    } else {
        const id = `${new Date().toISOString()}-QTY-${Math.random()}`;
        newProducts.push({
            ...productData,
            id,
            trackingType: 'quantity',
            quantity: details.quantity,
            status: ProductStatus.Available,
            purchaseOrderId,
        });
    }

    setProducts(prevProducts => [...prevProducts, ...newProducts]);
    return newProducts;
  }, [setProducts]);

  const handleOpenEditModal = (product: Product) => {
    setProductToEdit(product);
    setEditModalOpen(true);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    setEditModalOpen(false);
    setProductToEdit(null);
  };
  
  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this product? This action cannot be undone.')) {
        const productToDelete = products.find(p => p.id === productId);
        if (productToDelete && productToDelete.status === ProductStatus.Sold) {
            alert("Cannot delete a product that has been sold.");
            return;
        }
        setProducts(prev => prev.filter(p => p.id !== productId));
    }
  };

   const handleArchiveProduct = (productId: string) => {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: ProductStatus.Archived } : p));
    };

    const handleUnarchiveProduct = (productId: string) => {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: ProductStatus.Available } : p));
    };

  const handleCreateInvoice = useCallback((customerId: string, items: Omit<InvoiceItem, 'productName' | 'imei'>[]) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
        alert("Customer not found.");
        return;
    }

    const newInvoiceId = `INV-${Date.now()}`;
    let totalAmount = 0;
    const invoiceItems: InvoiceItem[] = [];

    setProducts(prevProducts => {
        const updatedProducts = [...prevProducts];

        for (const item of items) {
            const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
            if (productIndex === -1) continue;

            const product = updatedProducts[productIndex];
            
            invoiceItems.push({
                ...item,
                productName: product.productName,
                imei: product.imei
            });
            totalAmount += item.sellingPrice * item.quantity;
            
            if (product.trackingType === 'imei') {
                updatedProducts[productIndex] = { ...product, status: ProductStatus.Sold, customerName: customer.name, invoiceId: newInvoiceId };
            } else {
                const newQuantity = product.quantity - item.quantity;
                updatedProducts[productIndex] = { ...product, quantity: newQuantity, status: newQuantity > 0 ? ProductStatus.Available : ProductStatus.Sold };
            }
        }
        return updatedProducts;
    });

    const newInvoice: Invoice = {
      id: newInvoiceId,
      invoiceNumber: `#${invoices.length + 1}`,
      customerId,
      customerName: customer.name,
      issueDate: new Date().toISOString(),
      items: invoiceItems,
      totalAmount,
    };

    setInvoices(prev => [newInvoice, ...prev]);
    setInvoiceModalOpen(false);
    handleDownloadInvoice(newInvoice);
  }, [customers, invoices, setProducts, setInvoices]);

 const handleCreatePurchaseOrder = useCallback((
    poDetails: Omit<PurchaseOrder, 'id' | 'productIds' | 'totalCost' | 'supplierName' | 'issueDate'>,
    productsData: { productInfo: NewProductInfo, details: { trackingType: 'imei', imeis: string[] } | { trackingType: 'quantity', quantity: number } }[]
) => {
    const supplier = suppliers.find(s => s.id === poDetails.supplierId);
    if (!supplier) {
        alert("Supplier not found.");
        return;
    }

    const poId = `PO-${Date.now()}`;
    let allNewProducts: Product[] = [];

    productsData.forEach(batch => {
        const newProductsForBatch = handleAddProducts(batch.productInfo, batch.details, poId);
        allNewProducts = [...allNewProducts, ...newProductsForBatch];
    });

    const totalCost = allNewProducts.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);

    const newPO: PurchaseOrder = {
        ...poDetails,
        id: poId,
        supplierName: supplier.name,
        issueDate: new Date().toISOString(),
        productIds: allNewProducts.map(p => p.id),
        totalCost,
    };

    setPurchaseOrders(prev => [newPO, ...prev]);
    setPurchaseOrderModalOpen(false);
    handleDownloadPurchaseOrder(newPO);
}, [suppliers, handleAddProducts, setPurchaseOrders]);
  
  // Category Handlers
  const handleAddCategory = (name: string) => {
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert("Category already exists.");
        return;
    }
    const newCategory: Category = { id: `CAT-${Date.now()}`, name };
    setCategories(prev => [...prev, newCategory]);
    return newCategory;
  };
  const handleDeleteCategory = (id: string) => {
    const category = categories.find(c => c.id === id);
    if (products.some(p => p.category === category?.name)) {
        alert("Cannot delete category as it is used by some products.");
        return;
    }
    setCategories(prev => prev.filter(c => c.id !== id));
  };
  
  // Customer Handlers
  const handleSaveCustomer = (customer: Omit<Customer, 'id'>) => {
    if(customerToEdit) {
        setCustomers(prev => prev.map(c => c.id === customerToEdit.id ? { ...customer, id: c.id } : c));
    } else {
        const newCustomer = { ...customer, id: `CUST-${Date.now()}`};
        setCustomers(prev => [...prev, newCustomer]);
    }
    setCustomerModalOpen(false);
    setCustomerToEdit(null);
  };

  const handleAddCustomer = (name: string, phone: string): Customer | undefined => {
    if (customers.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert("A customer with this name already exists.");
        return undefined;
    }
    const newCustomer: Customer = { id: `CUST-${Date.now()}`, name, phone };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  };

  const handleOpenAddCustomerModal = () => {
    setCustomerToEdit(null);
    setCustomerModalOpen(true);
  };
  
  const handleDeleteCustomer = (id: string) => {
    if (invoices.some(inv => inv.customerId === id)) {
        alert("Cannot delete customer with existing invoices.");
        return;
    }
    setCustomers(prev => prev.filter(c => c.id !== id));
  };
  
  // Supplier Handlers
 const handleSaveSupplier = (supplierData: Omit<Supplier, 'id'>) => {
    if (supplierToEdit) {
        setSuppliers(prev => prev.map(s => s.id === supplierToEdit.id ? { ...supplierData, id: s.id } : s));
    } else {
        if (suppliers.some(s => s.name.toLowerCase() === supplierData.name.toLowerCase())) {
            alert("A supplier with this name already exists.");
            return;
        }
        const newSupplier = { ...supplierData, id: `SUP-${Date.now()}` };
        setSuppliers(prev => [...prev, newSupplier]);
    }
    setSupplierModalOpen(false);
    setSupplierToEdit(null);
  };

  const handleOpenAddSupplierModal = () => {
    setSupplierToEdit(null);
    setSupplierModalOpen(true);
  };

  const handleDeleteSupplier = (id: string) => {
    if (purchaseOrders.some(po => po.supplierId === id)) {
        alert("Cannot delete supplier with existing purchase orders.");
        return;
    }
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  const filteredProducts = useMemo(() => {
    const sourceProducts = 
        activeTab === 'active' ? availableProducts :
        activeTab === 'sold' ? soldProducts :
        activeTab === 'archive' ? archivedProducts :
        products;

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
  
  const totalActiveStock = useMemo(() => 
    availableProducts.reduce((sum, p) => sum + p.quantity, 0), 
  [availableProducts]);
  
  const totalSoldUnits = useMemo(() => 
    invoices.reduce((total, invoice) => 
      total + invoice.items.reduce((subtotal, item) => subtotal + item.quantity, 0), 
    0),
  [invoices]);

  const totalArchivedUnits = useMemo(() =>
    archivedProducts.reduce((sum, p) => sum + p.quantity, 0),
  [archivedProducts]);

  const totalProductLines = useMemo(() =>
    products.reduce((sum, p) => sum + p.quantity, 0),
  [products]);
  
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
            return (
                <div className="space-y-6">
                    <Dashboard products={products} invoices={invoices} />
                    <ProductList products={filteredProducts} purchaseOrders={purchaseOrders} onEditProduct={handleOpenEditModal} listType={searchQuery ? 'search' : activeTab} searchQuery={searchQuery} />
                </div>
            );
        case 'sold':
            return <ProductList products={filteredProducts} purchaseOrders={purchaseOrders} onEditProduct={handleOpenEditModal} listType={searchQuery ? 'search' : activeTab} searchQuery={searchQuery} />;
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
            return <SupplierList suppliers={suppliers} purchaseOrders={purchaseOrders} onEdit={(s) => { setSupplierToEdit(s); setSupplierModalOpen(true); }} onDelete={handleDeleteSupplier} onAddSupplier={handleOpenAddSupplierModal} />;
        default:
            return null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-100/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Inventory Pro</h1>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button onClick={() => setPurchaseOrderModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                <ClipboardDocumentListIcon className="w-5 h-5" /> Create PO
            </button>
            <button onClick={() => setInvoiceModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
              <DocumentTextIcon className="w-5 h-5" /> Create Invoice
            </button>
             <button onClick={() => setAddProductModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
              <PlusIcon className="w-5 h-5" /> Add Product(s)
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm">
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {mainTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => clearSearch(tab.id as ActiveTab)}
                    className={`whitespace-nowrap flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-base transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {tab.label}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${activeTab === tab.id ? tab.color : 'bg-slate-200 text-slate-600'}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="pt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-x-6 gap-y-4">
              {managementTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => clearSearch(tab.id as ActiveTab)}
                  className="text-left group focus:outline-none"
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${activeTab === tab.id ? 'text-primary' : 'text-slate-600 group-hover:text-slate-900'}`}>{tab.label}</p>
                    <span className={`${tab.color} text-xs font-bold px-2 py-0.5 rounded-full`}>
                      {tab.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by Product, IMEI, Customer, Category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border-slate-300 pl-10 shadow-sm focus:border-primary focus:ring-primary sm:text-sm py-2.5"
            />
          </div>
            
          {renderContent()}

        </div>
      </main>

      <Modal isOpen={isAddProductModalOpen} onClose={() => setAddProductModalOpen(false)} title="Add New Product Batch">
        <ProductForm onAddProducts={handleAddProducts} existingImeis={existingImeis} onClose={() => setAddProductModalOpen(false)} categories={categories} onAddCategory={handleAddCategory} />
      </Modal>

      <Modal isOpen={isInvoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="Create New Invoice">
        <InvoiceForm 
          availableProducts={availableProducts}
          customers={customers}
          onCreateInvoice={handleCreateInvoice}
          onClose={() => setInvoiceModalOpen(false)}
          onAddNewCustomer={handleAddCustomer} 
        />
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
            nextPoNumber={`PO-${purchaseOrders.length + 1}`}
          />
      </Modal>
      
      <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Product">
        {productToEdit && (
            <ProductEditForm
                product={productToEdit}
                categories={categories}
                onUpdateProduct={handleUpdateProduct}
                onClose={() => setEditModalOpen(false)}
            />
        )}
      </Modal>
      
       <Modal isOpen={isCustomerModalOpen} onClose={() => { setCustomerModalOpen(false); setCustomerToEdit(null); }} title={customerToEdit ? "Edit Customer" : "Add New Customer"}>
        <CustomerForm 
            onSave={handleSaveCustomer} 
            onClose={() => { setCustomerModalOpen(false); setCustomerToEdit(null); }} 
            customer={customerToEdit}
        />
      </Modal>
       <Modal isOpen={isSupplierModalOpen} onClose={() => { setSupplierModalOpen(false); setSupplierToEdit(null); }} title={supplierToEdit ? "Edit Supplier" : "Add New Supplier"}>
        <SupplierForm 
            onSave={handleSaveSupplier} 
            onClose={() => { setSupplierModalOpen(false); setSupplierToEdit(null); }} 
            supplier={supplierToEdit}
        />
      </Modal>

      {/* PDF Generation Templates (positioned off-screen) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0', zIndex: -1 }}>
        {documentToPrint?.type === 'invoice' && <InvoicePDF invoice={documentToPrint.data as Invoice} />}
        {documentToPrint?.type === 'po' && <PurchaseOrderPDF purchaseOrder={documentToPrint.data as PurchaseOrder} products={products} suppliers={suppliers} />}
      </div>
    </div>
  );
};

export default App;