
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Product, ProductStatus, NewProductInfo, Invoice, PurchaseOrder, Customer, Category, Supplier, User } from './types';
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
import AuthScreen from './AuthScreen';
import { api } from './lib/api';
import { BuildingStorefrontIcon, LogoutIcon, CloseIcon, SearchIcon } from './components/icons';

type ActiveTab = 'active' | 'sold' | 'products' | 'archive' | 'invoices' | 'purchaseOrders' | 'customers' | 'categories' | 'suppliers';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);
  const [isInvoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [isPurchaseOrderModalOpen, setPurchaseOrderModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [documentToPrint, setDocumentToPrint] = useState<{ type: 'invoice' | 'po', data: Invoice | PurchaseOrder } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('inventory_user_data');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('inventory_user_data');
        localStorage.removeItem('inventory_user_id');
      }
    }
    setIsAuthChecking(false);
  }, []);

  const syncAllData = useCallback(async () => {
    const storedId = localStorage.getItem('inventory_user_id');
    if (!currentUser || !storedId) return;

    setIsLoading(true);
    setSyncError(null);
    try {
      const [p, c, cat, inv, po, sup] = await Promise.all([
        api.products.list(),
        api.customers.list(),
        api.categories.list(),
        api.invoices.list(),
        api.purchaseOrders.list(),
        api.suppliers.list()
      ]);

      if (Array.isArray(p)) setProducts(p);
      if (Array.isArray(c)) setCustomers(c);
      if (Array.isArray(cat)) setCategories(cat);
      if (Array.isArray(inv)) setInvoices(inv);
      if (Array.isArray(po)) setPurchaseOrders(po);
      if (Array.isArray(sup)) setSuppliers(sup);
    } catch (e: any) {
      console.error("Sync failure:", e);
      setSyncError(e.message || "Failed to synchronize with the database.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) syncAllData();
  }, [currentUser, syncAllData]);

  const handleLogout = () => {
    localStorage.removeItem('inventory_user_id');
    localStorage.removeItem('inventory_user_data');
    setCurrentUser(null);
    setProducts([]);
    setInvoices([]);
    setSyncError(null);
  };

  const handleAddProducts = async (productData: NewProductInfo, details: any) => {
    try {
      if (details.trackingType === 'imei') {
         for (const imei of details.imeis) {
            await api.products.create({ ...productData, imei, trackingType: 'imei', quantity: 1, status: ProductStatus.Available });
         }
      } else {
         await api.products.create({ ...productData, trackingType: 'quantity', quantity: details.quantity, status: ProductStatus.Available });
      }
      syncAllData();
      setAddProductModalOpen(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      await api.products.update(updatedProduct);
      syncAllData();
      setEditModalOpen(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Permanently delete this item?')) return;
    try {
      await api.products.delete(productId);
      syncAllData();
    } catch (err: any) { alert(err.message); }
  };

  const handleCreateInvoice = async (customerId: string, items: any[]) => {
    try {
      await api.invoices.create({ customerId, items });
      syncAllData();
      setInvoiceModalOpen(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleCreatePurchaseOrder = async (poDetails: any, productsData: any) => {
    try {
      await api.purchaseOrders.create({ poDetails, productsData });
      syncAllData();
      setPurchaseOrderModalOpen(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleAddCategory = async (name: string) => {
    try {
      await api.categories.create(name);
      syncAllData();
      setCategoryModalOpen(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleAddCustomer = async (data: any) => {
    try {
      await api.customers.create(data);
      syncAllData();
      setCustomerModalOpen(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleAddSupplier = async (data: any) => {
    try {
      await api.suppliers.create(data);
      syncAllData();
      setSupplierModalOpen(false);
    } catch (err: any) { alert(err.message); }
  };

  const existingImeis = useMemo(() => new Set(products.map(p => p.imei).filter(Boolean)), [products]);
  const availableProducts = useMemo(() => products.filter(p => p.status === ProductStatus.Available), [products]);

  const renderContent = () => {
    if (syncError) return (
        <div className="flex flex-col items-center justify-center py-10 bg-rose-50 rounded-3xl border-2 border-rose-100 p-6 text-center">
            <div className="bg-rose-100 p-2 rounded-xl mb-3"><CloseIcon className="w-6 h-6 text-rose-600" /></div>
            <p className="text-rose-600 font-black uppercase tracking-widest text-xs mb-1">Sync Failed</p>
            <p className="text-slate-500 text-xs sm:text-sm max-w-xs mb-4">{syncError}</p>
            <button onClick={syncAllData} className="px-6 py-2 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg shadow-indigo-100 hover:bg-primary-hover transition-all">Retry</button>
        </div>
    );

    if (isLoading && products.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-slate-400 text-xs sm:text-sm font-medium animate-pulse">Connecting...</p>
        </div>
    );
    
    switch(activeTab) {
        case 'active':
        case 'sold':
            return <ProductList products={activeTab === 'active' ? availableProducts : products.filter(p => p.status === ProductStatus.Sold)} purchaseOrders={purchaseOrders} onEditProduct={p => { setProductToEdit(p); setEditModalOpen(true); }} onDeleteProduct={handleDeleteProduct} listType={activeTab} searchQuery={searchQuery} />;
        case 'products':
            return <ProductManagementList products={products.filter(p => p.status !== ProductStatus.Archived)} onEditProduct={p => { setProductToEdit(p); setEditModalOpen(true); }} onDeleteProduct={handleDeleteProduct} onArchiveProduct={id => handleUpdateProduct({...products.find(p => p.id === id)!, status: ProductStatus.Archived})} />;
        case 'archive':
            return <ArchivedProductList products={products.filter(p => p.status === ProductStatus.Archived)} onUnarchiveProduct={id => handleUpdateProduct({...products.find(p => p.id === id)!, status: ProductStatus.Available})} onDeleteProduct={handleDeleteProduct} />;
        case 'invoices':
            return <InvoiceList invoices={invoices} products={products} searchQuery={searchQuery} onDownloadInvoice={i => setDocumentToPrint({ type: 'invoice', data: i })} />;
        case 'purchaseOrders':
            return <PurchaseOrderList purchaseOrders={purchaseOrders} products={products} suppliers={suppliers} searchQuery={searchQuery} onDownloadPurchaseOrder={po => setDocumentToPrint({ type: 'po', data: po })} />;
        case 'customers':
            return <CustomerList customers={customers} onEdit={c => { setCustomerToEdit(c); setCustomerModalOpen(true); }} onDelete={id => api.customers.delete(id).then(syncAllData)} onAddCustomer={() => { setCustomerToEdit(null); setCustomerModalOpen(true); }} />;
        case 'suppliers':
            return <SupplierList suppliers={suppliers} purchaseOrders={purchaseOrders} onAddSupplier={() => { setSupplierToEdit(null); setSupplierModalOpen(true); }} onEdit={s => { setSupplierToEdit(s); setSupplierModalOpen(true); }} onDelete={id => api.suppliers.delete(id).then(syncAllData)} />;
        case 'categories':
            return <CategoryManagement categories={categories} products={products} onAddCategory={handleAddCategory} onDeleteCategory={id => api.categories.delete(id).then(syncAllData)} />;
        default:
             return <Dashboard products={products} invoices={invoices} />;
    }
  };

  if (isAuthChecking) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  if (!currentUser) return <AuthScreen onAuthSuccess={setCurrentUser} />;

  if (documentToPrint) {
    return (
      <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
        <div className="sticky top-0 p-3 bg-slate-900 flex justify-between items-center z-50">
          <span className="text-white font-bold text-xs sm:text-sm">Preview</span>
          <button onClick={() => setDocumentToPrint(null)} className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full"><CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" /></button>
        </div>
        <div className="flex justify-center p-4 bg-slate-100 min-h-screen">
          <div className="shadow-xl max-w-full overflow-x-auto">
            {documentToPrint.type === 'invoice' ? <InvoicePDF invoice={documentToPrint.data as Invoice} /> : <PurchaseOrderPDF purchaseOrder={documentToPrint.data as PurchaseOrder} products={products} suppliers={suppliers} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
        <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex h-14 sm:h-16 items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-primary p-1.5 rounded-lg"><BuildingStorefrontIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
                        <span className="text-lg sm:text-xl font-black tracking-tight">Inventory<span className="text-primary">Track</span></span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 hidden sm:block truncate max-w-[150px]">{currentUser.name || currentUser.email}</span>
                        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 transition-all"><LogoutIcon className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                    </div>
                </div>
            </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
            <section className="flex flex-col gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                        <input 
                            type="search" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            placeholder="IMEI SEARCH: Type IMEI or Product Name..." 
                            className="block w-full bg-slate-50 rounded-xl border-transparent focus:border-primary pl-9 sm:pl-11 py-2.5 sm:py-3.5 text-sm sm:text-base lg:text-lg font-medium transition-all" 
                        />
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                        <button onClick={() => setPurchaseOrderModalOpen(true)} className="flex-1 py-2.5 sm:py-3.5 text-[10px] sm:text-xs lg:text-sm font-black uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all">PO</button>
                        <button onClick={() => setInvoiceModalOpen(true)} className="flex-1 py-2.5 sm:py-3.5 text-[10px] sm:text-xs lg:text-sm font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all">Sell</button>
                        <button onClick={() => setAddProductModalOpen(true)} className="flex-1 py-2.5 sm:py-3.5 text-[10px] sm:text-xs lg:text-sm font-black uppercase tracking-widest text-white bg-primary rounded-xl shadow-lg hover:bg-primary-hover transition-all">+ Stock</button>
                    </div>
                </div>
                <Dashboard products={products} invoices={invoices} />
            </section>

            <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 p-2 sm:p-4">
                    <nav className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1 sm:gap-2">
                        {[
                          { id: 'active', label: 'Active' },
                          { id: 'sold', label: 'Sold' },
                          { id: 'products', label: 'All Stock' },
                          { id: 'archive', label: 'Archived' },
                          { id: 'invoices', label: 'Invoices' },
                          { id: 'purchaseOrders', label: 'Orders' },
                          { id: 'customers', label: 'Clients' },
                          { id: 'suppliers', label: 'Suppliers' },
                          { id: 'categories', label: 'Cats' }
                        ].map(tab => (
                            <button 
                              key={tab.id} 
                              onClick={() => setActiveTab(tab.id as any)} 
                              className={`py-2 px-1 sm:px-4 sm:py-2.5 rounded-lg font-black text-[9px] sm:text-xs lg:text-sm uppercase tracking-wider transition-all text-center ${activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="p-4 sm:p-8 min-h-[400px]">{renderContent()}</div>
            </section>
        </main>

        <Modal isOpen={isAddProductModalOpen} onClose={() => setAddProductModalOpen(false)} title="Add Products">
            <ProductForm onAddProducts={handleAddProducts} existingImeis={existingImeis} onClose={() => setAddProductModalOpen(false)} categories={categories} onAddCategory={async (name) => { const cat = await api.categories.create(name); syncAllData(); return cat; }} />
        </Modal>
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Product">
            {productToEdit && <ProductEditForm product={productToEdit} onUpdateProduct={handleUpdateProduct} onClose={() => setEditModalOpen(false)} categories={categories} />}
        </Modal>
        <Modal isOpen={isInvoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="New Sales Invoice">
            <InvoiceForm availableProducts={availableProducts} customers={customers} onCreateInvoice={handleCreateInvoice} onClose={() => setInvoiceModalOpen(false)} onAddNewCustomer={async (name, phone) => { const cust = await api.customers.create({ name, phone }); syncAllData(); return cust; }} />
        </Modal>
        <Modal isOpen={isPurchaseOrderModalOpen} onClose={() => setPurchaseOrderModalOpen(false)} title="New Purchase Order">
            <PurchaseOrderForm suppliers={suppliers} onSaveSupplier={handleAddSupplier} categories={categories} onAddCategory={async (name) => { const cat = await api.categories.create(name); syncAllData(); return cat; }} existingImeis={existingImeis} onCreatePurchaseOrder={handleCreatePurchaseOrder} onClose={() => setPurchaseOrderModalOpen(false)} nextPoNumber={`PO-${Date.now().toString().slice(-4)}`} />
        </Modal>
        <Modal isOpen={isCustomerModalOpen} onClose={() => setCustomerModalOpen(false)} title="Customer Details">
            <CustomerForm customer={customerToEdit} onSave={handleAddCustomer} onClose={() => setCustomerModalOpen(false)} />
        </Modal>
        <Modal isOpen={isSupplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Supplier Details">
            <SupplierForm supplier={supplierToEdit} onSave={handleAddSupplier} onClose={() => setSupplierModalOpen(false)} />
        </Modal>
    </div>
  );
};

export default App;
