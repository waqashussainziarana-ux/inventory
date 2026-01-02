
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Product, ProductStatus, NewProductInfo, Invoice, InvoiceItem, PurchaseOrder, Customer, Category, Supplier, PurchaseOrderStatus } from './types';
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
import AIInsights from './components/AIInsights';
import { downloadPdf } from './utils/pdfGenerator';
import { PlusIcon, SearchIcon, DocumentTextIcon, ClipboardDocumentListIcon, DownloadIcon, BuildingStorefrontIcon } from './components/icons';

type ActiveTab = 'active' | 'sold' | 'products' | 'archive' | 'invoices' | 'purchaseOrders' | 'customers' | 'categories' | 'suppliers';

const App: React.FC = () => {
  // --- Data State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'connected' | 'offline' | 'checking'>('checking');
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
  const [documentToPrint, setDocumentToPrint] = useState<{ type: 'invoice' | 'po', data: Invoice | PurchaseOrder } | null>(null);

  // --- API Handlers ---
  const fetchWithFallback = async (endpoint: string, options?: RequestInit) => {
    try {
      const response = await fetch(`/api/${endpoint}`, options);
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.warn(`Database unreachable at /api/${endpoint}, using local data.`, error);
      const localData = localStorage.getItem(`fallback-${endpoint}`);
      return localData ? JSON.parse(localData) : null;
    }
  };

  const saveData = (endpoint: string, data: any) => {
    localStorage.setItem(`fallback-${endpoint}`, JSON.stringify(data));
  };

  const syncAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await fetch('/api/db-status').then(r => r.json()).catch(() => ({ status: 'error' }));
      setDbStatus(status.status === 'ok' ? 'connected' : 'offline');

      const [p, c, cat, inv, po, sup] = await Promise.all([
        fetchWithFallback('products'),
        fetchWithFallback('customers'),
        fetchWithFallback('categories'),
        fetchWithFallback('invoices'),
        fetchWithFallback('purchase-orders'),
        fetchWithFallback('suppliers')
      ]);

      if (p) { setProducts(p); saveData('products', p); }
      if (c) { setCustomers(c); saveData('customers', c); }
      if (cat) { setCategories(cat); saveData('categories', cat); }
      if (inv) { setInvoices(inv); saveData('invoices', inv); }
      if (po) { setPurchaseOrders(po); saveData('purchase-orders', po); }
      if (sup) { setSuppliers(sup); saveData('suppliers', sup); }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncAllData();
  }, [syncAllData]);

  // Handle Initialize DB
  const handleInitDb = async () => {
    if (!confirm("This will create necessary tables in your online database. Continue?")) return;
    try {
        const res = await fetch('/api/setup', { method: 'POST' });
        const data = await res.json();
        alert(data.message || "Database setup complete!");
        syncAllData();
    } catch (e) {
        alert("Failed to initialize database. Check your DATABASE_URL.");
    }
  };

  // --- CRUD Proxies ---
  const handleAddProducts = async (productData: NewProductInfo, details: any) => {
    const productsToAdd = details.trackingType === 'imei' 
      ? details.imeis.map((imei: string) => ({ ...productData, imei, trackingType: 'imei', quantity: 1, status: ProductStatus.Available }))
      : [{ ...productData, trackingType: 'quantity', quantity: details.quantity, status: ProductStatus.Available }];

    const result = await fetchWithFallback('products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productsToAdd)
    });

    if (result) {
      const updated = [...products, ...(Array.isArray(result) ? result : [result])];
      setProducts(updated);
      saveData('products', updated);
    }
    return result;
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    const result = await fetchWithFallback('products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProduct)
    });

    if (result) {
      const updatedList = products.map(p => p.id === updatedProduct.id ? result : p);
      setProducts(updatedList);
      saveData('products', updatedList);
    }
    setEditModalOpen(false);
    setProductToEdit(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Permanently delete this product?')) return;
    const result = await fetchWithFallback('products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: productId })
    });

    if (result || dbStatus === 'offline') {
      const updated = products.filter(p => p.id !== productId);
      setProducts(updated);
      saveData('products', updated);
    }
  };

  const handleCreateInvoice = async (customerId: string, items: any[]) => {
    const result = await fetchWithFallback('invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, items })
    });

    if (result) {
      setInvoices(prev => [result, ...prev]);
      syncAllData(); // Refresh products status
      setInvoiceModalOpen(false);
      handleDownloadInvoice(result);
    }
  };

  const handleCreatePurchaseOrder = async (poDetails: any, productsData: any) => {
    const result = await fetchWithFallback('purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poDetails, productsData })
    });

    if (result) {
      setPurchaseOrders(prev => [result.po, ...prev]);
      syncAllData();
      setPurchaseOrderModalOpen(false);
      handleDownloadPurchaseOrder(result.po);
    }
  };

  // --- Helpers ---
  const existingImeis = useMemo(() => new Set(products.map(p => p.imei).filter(Boolean)), [products]);
  const availableProducts = useMemo(() => products.filter(p => p.status === ProductStatus.Available), [products]);
  
  const handleDownloadInvoice = (invoice: Invoice) => setDocumentToPrint({ type: 'invoice', data: invoice });
  const handleDownloadPurchaseOrder = (po: PurchaseOrder) => setDocumentToPrint({ type: 'po', data: po });

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    
    switch(activeTab) {
        case 'active':
        case 'sold':
            return <ProductList products={activeTab === 'active' ? availableProducts : products.filter(p => p.status === ProductStatus.Sold)} purchaseOrders={purchaseOrders} onEditProduct={product => { setProductToEdit(product); setEditModalOpen(true); }} listType={activeTab} searchQuery={searchQuery} />;
        case 'products':
            return <ProductManagementList products={products.filter(p => p.status !== ProductStatus.Archived)} onEditProduct={p => { setProductToEdit(p); setEditModalOpen(true); }} onDeleteProduct={handleDeleteProduct} onArchiveProduct={id => handleUpdateProduct({...products.find(p => p.id === id)!, status: ProductStatus.Archived})} />;
        case 'archive':
            return <ArchivedProductList products={products.filter(p => p.status === ProductStatus.Archived)} onUnarchiveProduct={id => handleUpdateProduct({...products.find(p => p.id === id)!, status: ProductStatus.Available})} onDeleteProduct={handleDeleteProduct} />;
        case 'invoices':
            return <InvoiceList invoices={invoices} products={products} searchQuery={searchQuery} onDownloadInvoice={handleDownloadInvoice} />;
        case 'purchaseOrders':
            return <PurchaseOrderList purchaseOrders={purchaseOrders} products={products} suppliers={suppliers} searchQuery={searchQuery} onDownloadPurchaseOrder={handleDownloadPurchaseOrder} />;
        case 'customers':
            return <CustomerList customers={customers} onEdit={c => { setCustomerToEdit(c); setCustomerModalOpen(true); }} onDelete={id => console.log('Delete logic')} onAddCustomer={() => { setCustomerToEdit(null); setCustomerModalOpen(true); }} />;
        case 'suppliers':
            return <SupplierList suppliers={suppliers} purchaseOrders={purchaseOrders} onAddSupplier={() => { setSupplierToEdit(null); setSupplierModalOpen(true); }} onEdit={s => { setSupplierToEdit(s); setSupplierModalOpen(true); }} onDelete={id => console.log('Delete logic')} />;
        case 'categories':
            return (
                <div className="space-y-4">
                    <CategoryManagement categories={categories} products={products} onAddCategory={name => fetchWithFallback('categories', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name }) }).then(syncAllData)} onDeleteCategory={id => console.log('Delete category')} />
                    <div className="pt-8 border-t flex justify-center">
                        <button onClick={handleInitDb} className="text-xs font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">Re-Initialize Cloud Database</button>
                    </div>
                </div>
            );
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

  return (
    <div className="min-h-screen bg-slate-100/60 font-sans antialiased text-slate-900">
        <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-2 rounded-xl shadow-indigo-200 shadow-lg">
                           <BuildingStorefrontIcon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight text-slate-800">Inventory<span className="text-primary">Track</span></span>
                        
                        <div className={`ml-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${dbStatus === 'connected' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                            {dbStatus === 'connected' ? 'Online' : 'Offline Mode'}
                        </div>
                    </div>
                </div>
            </div>
        </header>
        
        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative group">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <SearchIcon className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                </div>
                                <input 
                                  type="search" 
                                  value={searchQuery} 
                                  onChange={(e) => setSearchQuery(e.target.value)} 
                                  placeholder="Search serials, models, clients..." 
                                  className="block w-full bg-slate-50 rounded-2xl border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 pl-11 py-3 text-sm font-medium placeholder:text-slate-400 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setPurchaseOrderModalOpen(true)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-2xl hover:bg-rose-100 transition-all active:scale-95">
                                    <ClipboardDocumentListIcon className="w-5 h-5" /> PO
                                </button>
                                <button onClick={() => setInvoiceModalOpen(true)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-green-700 bg-green-50 border border-green-100 rounded-2xl hover:bg-green-100 transition-all active:scale-95">
                                    <DocumentTextIcon className="w-5 h-5" /> Sell
                                </button>
                                <button onClick={() => setAddProductModalOpen(true)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-primary rounded-2xl shadow-lg shadow-indigo-100 hover:bg-primary-hover hover:-translate-y-0.5 transition-all active:scale-95">
                                    <PlusIcon className="w-5 h-5" /> Stock
                                </button>
                            </div>
                        </div>
                    </div>
                    <Dashboard products={products} invoices={invoices} />
                </div>
                <div className="lg:col-span-4">
                    <AIInsights products={products} invoices={invoices} />
                </div>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/30 px-6 overflow-x-auto">
                    <nav className="-mb-px flex gap-x-8">
                        {['active', 'sold', 'products', 'archive', 'invoices', 'purchaseOrders', 'customers', 'suppliers', 'categories'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`whitespace-nowrap py-5 px-1 border-b-2 font-bold text-sm transition-all relative ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="p-6 min-h-[400px]">
                    {renderContent()}
                </div>
            </section>
        </main>

        <Modal isOpen={isAddProductModalOpen} onClose={() => setAddProductModalOpen(false)} title="Add Products">
            <ProductForm onAddProducts={handleAddProducts} existingImeis={existingImeis} onClose={() => setAddProductModalOpen(false)} categories={categories} onAddCategory={name => fetchWithFallback('categories', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name})})} />
        </Modal>
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Product">
            {productToEdit && <ProductEditForm product={productToEdit} onUpdateProduct={handleUpdateProduct} onClose={() => setEditModalOpen(false)} categories={categories} />}
        </Modal>
        <Modal isOpen={isInvoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="New Invoice">
            <InvoiceForm availableProducts={availableProducts} customers={customers} onCreateInvoice={handleCreateInvoice} onClose={() => setInvoiceModalOpen(false)} onAddNewCustomer={(name, phone) => fetchWithFallback('customers', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name, phone})})} />
        </Modal>
        <Modal isOpen={isPurchaseOrderModalOpen} onClose={() => setPurchaseOrderModalOpen(false)} title="New PO">
            <PurchaseOrderForm suppliers={suppliers} onSaveSupplier={s => fetchWithFallback('suppliers', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(s)})} categories={categories} onAddCategory={name => fetchWithFallback('categories', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name})})} existingImeis={existingImeis} onCreatePurchaseOrder={handleCreatePurchaseOrder} onClose={() => setPurchaseOrderModalOpen(false)} nextPoNumber={`PO-${Date.now().toString().slice(-4)}`} />
        </Modal>
        <Modal isOpen={isCustomerModalOpen} onClose={() => setCustomerModalOpen(false)} title="Customer">
            <CustomerForm customer={customerToEdit} onSave={c => fetchWithFallback('customers', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...c, id: customerToEdit?.id})}).then(syncAllData)} onClose={() => setCustomerModalOpen(false)} />
        </Modal>
        <Modal isOpen={isSupplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Supplier">
            <SupplierForm supplier={supplierToEdit} onSave={s => fetchWithFallback('suppliers', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...s, id: supplierToEdit?.id})}).then(syncAllData)} onClose={() => setSupplierModalOpen(false)} />
        </Modal>
    </div>
  );
};

export default App;
