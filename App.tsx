
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
import InvoiceEditForm from './components/InvoiceEditForm';
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
import { BuildingStorefrontIcon, LogoutIcon, CloseIcon, SearchIcon, DownloadIcon, UploadIcon } from './components/icons';
import { downloadPdf } from './utils/pdfGenerator';

type ActiveTab = 'active' | 'sold' | 'products' | 'archive' | 'invoices' | 'purchaseOrders' | 'customers' | 'categories' | 'suppliers' | 'data';

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
  const [isInvoiceEditModalOpen, setInvoiceEditModalOpen] = useState(false);
  const [isPurchaseOrderModalOpen, setPurchaseOrderModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
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

  const handleExportData = async () => {
    try {
        setIsLoading(true);
        const data = await api.data.export();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inventory-track-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err: any) {
        alert("Export failed: " + err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const content = event.target?.result as string;
            const data = JSON.parse(content);

            if (!confirm("WARNING: Importing this file will PERMANENTLY REPLACE all your current cloud data. This action cannot be undone. Proceed?")) {
                return;
            }

            setIsLoading(true);
            await api.data.import(data);
            await syncAllData();
            alert("Cloud database successfully restored from backup.");
            setActiveTab('active');
        } catch (err: any) {
            alert("Import failed: Ensure the file is a valid InventoryTrack backup JSON.");
        } finally {
            setIsLoading(false);
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = '';
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

  const handleUpdateInvoice = async (id: string, customerData: { customerId: string, customerName: string }) => {
    try {
      await api.invoices.update(id, customerData);
      syncAllData();
      setInvoiceEditModalOpen(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Permanently delete this item?')) return;
    try {
      await api.products.delete(productId);
      syncAllData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Permanently delete this invoice? Associated unique items will be returned to stock.')) return;
    try {
      await api.invoices.delete(invoiceId);
      syncAllData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDeletePurchaseOrder = async (poId: string) => {
    if (!confirm('Permanently delete this purchase order? WARNING: All inventory items associated with this PO will also be deleted.')) return;
    try {
      await api.purchaseOrders.delete(poId);
      syncAllData();
    } catch (err: any) { alert(err.message); }
  };

  const handleCreateInvoice = async (customerId: string, items: any[]) => {
    try {
      const result = await api.invoices.create({ customerId, items });
      await syncAllData();
      setInvoiceModalOpen(false);
      if (result && result.invoice) {
          setDocumentToPrint({ type: 'invoice', data: result.invoice });
      } else if (result && result.id) {
          const newInvoice = invoices.find(i => i.id === result.id);
          if (newInvoice) setDocumentToPrint({ type: 'invoice', data: newInvoice });
      }
    } catch (err: any) { alert(err.message); }
  };

  const handleDownloadInvoiceById = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (inv) {
        setDocumentToPrint({ type: 'invoice', data: inv });
    } else {
        alert("Invoice not found in current session. Try refreshing or check the Invoices tab.");
    }
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
      const cat = await api.categories.create(name);
      syncAllData();
      setCategoryModalOpen(false);
      return cat;
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
            <button onClick={syncAllData} className="px-6 py-2 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 hover:bg-primary-hover transition-all">Retry</button>
        </div>
    );

    if (isLoading && products.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-slate-400 text-sm font-medium animate-pulse">Connecting...</p>
        </div>
    );
    
    switch(activeTab) {
        case 'active':
        case 'sold':
            return <ProductList 
                products={activeTab === 'active' ? availableProducts : products.filter(p => p.status === ProductStatus.Sold)} 
                purchaseOrders={purchaseOrders} 
                onEditProduct={p => { setProductToEdit(p); setEditModalOpen(true); }} 
                onDeleteProduct={handleDeleteProduct} 
                onDownloadInvoice={handleDownloadInvoiceById}
                listType={activeTab} 
                searchQuery={searchQuery} 
            />;
        case 'products':
            return <ProductManagementList 
                products={products.filter(p => p.status !== ProductStatus.Archived)} 
                onEditProduct={p => { setProductToEdit(p); setEditModalOpen(true); }} 
                onDeleteProduct={handleDeleteProduct} 
                onDownloadInvoice={handleDownloadInvoiceById}
                onArchiveProduct={id => handleUpdateProduct({...products.find(p => p.id === id)!, status: ProductStatus.Archived})} 
                searchQuery={searchQuery} 
            />;
        case 'archive':
            return <ArchivedProductList products={products.filter(p => p.status === ProductStatus.Archived)} onUnarchiveProduct={id => handleUpdateProduct({...products.find(p => p.id === id)!, status: ProductStatus.Available})} onDeleteProduct={handleDeleteProduct} searchQuery={searchQuery} />;
        case 'invoices':
            return <InvoiceList 
                invoices={invoices} 
                products={products} 
                searchQuery={searchQuery} 
                onDownloadInvoice={i => setDocumentToPrint({ type: 'invoice', data: i })} 
                onEditInvoice={i => { setInvoiceToEdit(i); setInvoiceEditModalOpen(true); }}
                onDeleteInvoice={handleDeleteInvoice}
            />;
        case 'purchaseOrders':
            return <PurchaseOrderList 
                purchaseOrders={purchaseOrders} 
                products={products} 
                suppliers={suppliers} 
                searchQuery={searchQuery} 
                onDownloadPurchaseOrder={po => setDocumentToPrint({ type: 'po', data: po })} 
                onDeletePurchaseOrder={handleDeletePurchaseOrder}
            />;
        case 'customers':
            return <CustomerList customers={customers} onEdit={c => { setCustomerToEdit(c); setCustomerModalOpen(true); }} onDelete={id => api.customers.delete(id).then(syncAllData)} onAddCustomer={() => { setCustomerToEdit(null); setCustomerModalOpen(true); }} searchQuery={searchQuery} />;
        case 'suppliers':
            return <SupplierList suppliers={suppliers} purchaseOrders={purchaseOrders} onAddSupplier={() => { setSupplierToEdit(null); setSupplierModalOpen(true); }} onEdit={s => { setSupplierToEdit(s); setSupplierModalOpen(true); }} onDelete={id => api.suppliers.delete(id).then(syncAllData)} searchQuery={searchQuery} />;
        case 'categories':
            return <CategoryManagement categories={categories} products={products} onAddCategory={handleAddCategory} onDeleteCategory={id => api.categories.delete(id).then(syncAllData)} searchQuery={searchQuery} />;
        case 'data':
            return (
                <div className="max-w-4xl mx-auto py-10 space-y-10">
                    <div className="text-center space-y-3 mb-10">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Data Management</h2>
                        <p className="text-slate-500 font-medium">Export local backups or restore your cloud database from a file.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Export Card */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <DownloadIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Cloud Export</h3>
                            <p className="text-sm text-slate-500 mb-8 flex-grow">Download all your records including products, invoices, and clients in a single JSON file.</p>
                            <button 
                                onClick={handleExportData}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95"
                            >
                                Generate Backup
                            </button>
                        </div>

                        {/* Import Card */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <UploadIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Cloud Restore</h3>
                            <p className="text-sm text-slate-500 mb-8 flex-grow">Restore your database from a previously saved JSON file. <span className="text-rose-500 font-bold underline">Replaces all current data.</span></p>
                            <label className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-hover transition-all active:scale-95 cursor-pointer text-center">
                                Select Backup File
                                <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                            </label>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                        <div className="p-2 bg-white rounded-lg border border-slate-200"><CloseIcon className="w-4 h-4 text-slate-400 rotate-45" /></div>
                        <div className="text-xs text-slate-500 leading-relaxed">
                            <p className="font-bold text-slate-700 mb-1">Important Privacy Note:</p>
                            Your backups are saved directly to your machine. No personal data is stored locally by the browser after export. Restoring data uses an atomic transaction to ensure your inventory remains consistent even if the upload is interrupted.
                        </div>
                    </div>
                </div>
            );
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
          <span className="text-white font-bold text-sm">Preview</span>
          <div className="flex items-center gap-3">
              <button 
                onClick={() => downloadPdf(documentToPrint.type === 'invoice' ? 'invoice-pdf' : 'po-pdf', `${documentToPrint.type}-${documentToPrint.data.id}.pdf`)} 
                className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-lg"
              >
                  <DownloadIcon className="w-4 h-4" /> Download PDF
              </button>
              <button onClick={() => setDocumentToPrint(null)} className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full"><CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" /></button>
          </div>
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
        {isLoading && (
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-black uppercase tracking-widest text-xs">Synchronizing Database...</p>
            </div>
        )}

        <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex h-14 sm:h-16 items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-primary p-1.5 rounded-lg"><BuildingStorefrontIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
                        <span className="text-lg sm:text-xl font-black tracking-tight">Inventory<span className="text-primary">Track</span></span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-xs font-bold text-slate-500 hidden sm:block truncate max-w-[150px]">{currentUser.name || currentUser.email}</span>
                        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 transition-all"><LogoutIcon className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                    </div>
                </div>
            </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
            <section className="flex flex-col gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                            type="search" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            placeholder="Search by Product Name, IMEI/SN, or Client..." 
                            className="block w-full bg-slate-50 rounded-xl border-transparent focus:border-primary pl-10 sm:pl-11 py-3.5 sm:py-4 text-sm sm:text-base lg:text-lg font-medium transition-all" 
                        />
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                        <button onClick={() => setPurchaseOrderModalOpen(true)} className="flex-1 py-3.5 sm:py-4 text-xs lg:text-sm font-black uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all">PO</button>
                        <button onClick={() => setInvoiceModalOpen(true)} className="flex-1 py-3.5 sm:py-4 text-xs lg:text-sm font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all">Sell</button>
                        <button onClick={() => setAddProductModalOpen(true)} className="flex-1 py-3.5 sm:py-4 text-xs lg:text-sm font-black uppercase tracking-widest text-white bg-primary rounded-xl shadow-lg hover:bg-primary-hover transition-all">+ Stock</button>
                    </div>
                </div>
                <Dashboard products={products} invoices={invoices} />
            </section>

            <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 p-2 sm:p-4">
                    <nav className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                        {[
                          { id: 'active', label: 'Active' },
                          { id: 'sold', label: 'Sold' },
                          { id: 'products', label: 'All Stock' },
                          { id: 'archive', label: 'Archived' },
                          { id: 'invoices', label: 'Invoices' },
                          { id: 'purchaseOrders', label: 'Orders' },
                          { id: 'customers', label: 'Clients' },
                          { id: 'suppliers', label: 'Suppliers' },
                          { id: 'categories', label: 'Cats' },
                          { id: 'data', label: 'Data' }
                        ].map(tab => (
                            <button 
                              key={tab.id} 
                              onClick={() => setActiveTab(tab.id as any)} 
                              className={`py-3 px-1 sm:px-4 sm:py-2.5 rounded-lg font-black text-xs sm:text-sm lg:text-base uppercase tracking-wider transition-all text-center ${activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
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
            <ProductForm onAddProducts={handleAddProducts} existingImeis={existingImeis} onClose={() => setAddProductModalOpen(false)} categories={categories} onAddCategory={handleAddCategory} />
        </Modal>
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Product">
            {productToEdit && <ProductEditForm product={productToEdit} onUpdateProduct={handleUpdateProduct} onClose={() => setEditModalOpen(false)} categories={categories} />}
        </Modal>
        <Modal isOpen={isInvoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="New Sales Invoice">
            <InvoiceForm availableProducts={availableProducts} customers={customers} onCreateInvoice={handleCreateInvoice} onClose={() => setInvoiceModalOpen(false)} onAddNewCustomer={async (name, phone) => { const cust = await api.customers.create({ name, phone }); syncAllData(); return cust; }} />
        </Modal>
        <Modal isOpen={isInvoiceEditModalOpen} onClose={() => setInvoiceEditModalOpen(false)} title="Edit Invoice Details">
            {invoiceToEdit && (
                <InvoiceEditForm 
                    invoice={invoiceToEdit} 
                    customers={customers} 
                    onUpdateInvoice={handleUpdateInvoice} 
                    onClose={() => setInvoiceEditModalOpen(false)} 
                    onAddNewCustomer={async (name, phone) => { const cust = await api.customers.create({ name, phone }); syncAllData(); return cust; }} 
                />
            )}
        </Modal>
        <Modal isOpen={isPurchaseOrderModalOpen} onClose={() => setPurchaseOrderModalOpen(false)} title="New Purchase Order">
            <PurchaseOrderForm suppliers={suppliers} onSaveSupplier={handleAddSupplier} categories={categories} onAddCategory={handleAddCategory} existingImeis={existingImeis} onCreatePurchaseOrder={handleCreatePurchaseOrder} onClose={() => setPurchaseOrderModalOpen(false)} nextPoNumber={`PO-${Date.now().toString().slice(-4)}`} />
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
