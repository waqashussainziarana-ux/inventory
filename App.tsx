
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Product, ProductStatus, NewProductInfo, Invoice, InvoiceItem, PurchaseOrder, Customer, Category, Supplier, PurchaseOrderStatus, User } from './types';
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
import AuthScreen from './components/AuthScreen';
import { supabase } from './lib/supabase';
import { PlusIcon, SearchIcon, DocumentTextIcon, ClipboardDocumentListIcon, BuildingStorefrontIcon, LogoutIcon } from './components/icons';

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
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // --- Auth & Sync ---
  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.full_name,
          });
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.full_name,
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncAllData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [p, c, cat, inv, po, sup] = await Promise.all([
        supabase.from('products').select('*').order('purchaseDate', { ascending: false }),
        supabase.from('customers').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('invoices').select('*, invoice_items(*)').order('issueDate', { ascending: false }),
        supabase.from('purchase_orders').select('*').order('issueDate', { ascending: false }),
        supabase.from('suppliers').select('*').order('name')
      ]);

      if (p.data) setProducts(p.data);
      if (c.data) setCustomers(c.data);
      if (cat.data) setCategories(cat.data);
      if (inv.data) setInvoices(inv.data.map(i => ({ ...i, items: i.invoice_items })));
      if (po.data) setPurchaseOrders(po.data);
      if (sup.data) setSuppliers(sup.data);
    } catch (e) {
      console.error("Sync error", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) syncAllData();
  }, [currentUser, syncAllData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setProducts([]);
    setInvoices([]);
    setCustomers([]);
    setSuppliers([]);
    setCategories([]);
    setPurchaseOrders([]);
  };

  // --- CRUD Handlers (Supabase) ---
  const handleAddProducts = async (productData: NewProductInfo, details: any) => {
    const productsToAdd = details.trackingType === 'imei' 
      ? details.imeis.map((imei: string) => ({ ...productData, imei, trackingType: 'imei', quantity: 1, status: ProductStatus.Available, userId: currentUser?.id }))
      : [{ ...productData, trackingType: 'quantity', quantity: details.quantity, status: ProductStatus.Available, userId: currentUser?.id }];

    const { data, error } = await supabase.from('products').insert(productsToAdd).select();
    if (error) {
        alert(error.message);
        return null;
    }
    syncAllData();
    return data;
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    const { data, error } = await supabase.from('products').update(updatedProduct).eq('id', updatedProduct.id).select().single();
    if (error) alert(error.message);
    else syncAllData();
    setEditModalOpen(false);
    setProductToEdit(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Permanently delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) alert(error.message);
    else syncAllData();
  };

  const handleDeleteResource = async (table: string, id: string) => {
    if (!confirm(`Permanently delete this ${table.slice(0, -1)}?`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) alert(error.message);
    else syncAllData();
  };

  const handleCreateInvoice = async (customerId: string, items: any[]) => {
    const customer = customers.find(c => c.id === customerId);
    const total = items.reduce((sum, it) => sum + it.sellingPrice * it.quantity, 0);
    
    const { data: invoice, error: invError } = await supabase.from('invoices').insert({
      userId: currentUser?.id,
      invoiceNumber: `INV-${Date.now()}`,
      customerId,
      customerName: customer?.name || 'Customer',
      totalAmount: total,
      issueDate: new Date().toISOString()
    }).select().single();

    if (invError) return alert(invError.message);

    const itemsToAdd = items.map(it => ({
      invoiceId: invoice.id,
      productId: it.productId,
      productName: it.productName || 'Product',
      imei: it.imei || null,
      quantity: it.quantity,
      sellingPrice: it.sellingPrice
    }));

    await supabase.from('invoice_items').insert(itemsToAdd);
    
    // Update product statuses
    for (const it of items) {
        await supabase.from('products').update({ 
            status: ProductStatus.Sold, 
            invoiceId: invoice.id, 
            customerName: customer?.name 
        }).eq('id', it.productId);
    }

    syncAllData();
    setInvoiceModalOpen(false);
    handleDownloadInvoice({ ...invoice, items: itemsToAdd });
  };

  const handleCreatePurchaseOrder = async (poDetails: any, productsData: any) => {
      const { data: po, error } = await supabase.from('purchase_orders').insert({
          ...poDetails,
          userId: currentUser?.id,
          issueDate: new Date().toISOString()
      }).select().single();

      if (error) return alert(error.message);

      for (const batch of productsData) {
          await handleAddProducts(batch.productInfo, { ...batch.details, purchaseOrderId: po.id });
      }

      syncAllData();
      setPurchaseOrderModalOpen(false);
      handleDownloadPurchaseOrder(po);
  };

  const existingImeis = useMemo(() => new Set(products.map(p => p.imei).filter(Boolean)), [products]);
  const availableProducts = useMemo(() => products.filter(p => p.status === ProductStatus.Available), [products]);
  const handleDownloadInvoice = (invoice: Invoice) => setDocumentToPrint({ type: 'invoice', data: invoice });
  const handleDownloadPurchaseOrder = (po: PurchaseOrder) => setDocumentToPrint({ type: 'po', data: po });

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    
    switch(activeTab) {
        case 'active':
        case 'sold':
            return (
              <ProductList 
                products={activeTab === 'active' ? availableProducts : products.filter(p => p.status === ProductStatus.Sold)} 
                purchaseOrders={purchaseOrders} 
                onEditProduct={product => { setProductToEdit(product); setEditModalOpen(true); }} 
                onDeleteProduct={handleDeleteProduct}
                listType={activeTab} 
                searchQuery={searchQuery} 
              />
            );
        case 'products':
            return <ProductManagementList products={products.filter(p => p.status !== ProductStatus.Archived)} onEditProduct={p => { setProductToEdit(p); setEditModalOpen(true); }} onDeleteProduct={handleDeleteProduct} onArchiveProduct={id => handleUpdateProduct({...products.find(p => p.id === id)!, status: ProductStatus.Archived})} />;
        case 'archive':
            return <ArchivedProductList products={products.filter(p => p.status === ProductStatus.Archived)} onUnarchiveProduct={id => handleUpdateProduct({...products.find(p => p.id === id)!, status: ProductStatus.Available})} onDeleteProduct={handleDeleteProduct} />;
        case 'invoices':
            return <InvoiceList invoices={invoices} products={products} searchQuery={searchQuery} onDownloadInvoice={handleDownloadInvoice} />;
        case 'purchaseOrders':
            return <PurchaseOrderList purchaseOrders={purchaseOrders} products={products} suppliers={suppliers} searchQuery={searchQuery} onDownloadPurchaseOrder={handleDownloadPurchaseOrder} />;
        case 'customers':
            return <CustomerList customers={customers} onEdit={c => { setCustomerToEdit(c); setCustomerModalOpen(true); }} onDelete={id => handleDeleteResource('customers', id)} onAddCustomer={() => { setCustomerToEdit(null); setCustomerModalOpen(true); }} />;
        case 'suppliers':
            return <SupplierList suppliers={suppliers} purchaseOrders={purchaseOrders} onAddSupplier={() => { setSupplierToEdit(null); setSupplierModalOpen(true); }} onEdit={s => { setSupplierToEdit(s); setSupplierModalOpen(true); }} onDelete={id => handleDeleteResource('suppliers', id)} />;
        case 'categories':
            return (
                <div className="space-y-4">
                    <CategoryManagement 
                        categories={categories} 
                        products={products} 
                        onAddCategory={name => supabase.from('categories').insert({ name, userId: currentUser?.id }).then(syncAllData)} 
                        onDeleteCategory={id => handleDeleteResource('categories', id)} 
                    />
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 mt-8">
                        <h3 className="text-amber-800 font-bold mb-2">First time setup?</h3>
                        <p className="text-amber-700 text-sm mb-4">You need to create the tables in your Supabase SQL Editor for the app to work.</p>
                        <button 
                            onClick={() => {
                                const sql = `-- Paste this in Supabase SQL Editor\nCREATE TABLE products (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID, "productName" TEXT, category TEXT, "purchaseDate" DATE, "purchasePrice" NUMERIC, "sellingPrice" NUMERIC, status TEXT, notes TEXT, "invoiceId" TEXT, "purchaseOrderId" TEXT, "trackingType" TEXT, imei TEXT, quantity INTEGER, "customerName" TEXT);\nCREATE TABLE customers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID, name TEXT, phone TEXT);\nCREATE TABLE suppliers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID, name TEXT, email TEXT, phone TEXT);\nCREATE TABLE categories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID, name TEXT);\nCREATE TABLE invoices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID, "invoiceNumber" TEXT, "customerId" UUID, "customerName" TEXT, "issueDate" TIMESTAMP, "totalAmount" NUMERIC);\nCREATE TABLE invoice_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "invoiceId" UUID, "productId" UUID, "productName" TEXT, imei TEXT, quantity INTEGER, "sellingPrice" NUMERIC);\nCREATE TABLE purchase_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID, "poNumber" TEXT, "supplierId" UUID, "supplierName" TEXT, "issueDate" TIMESTAMP, "totalCost" NUMERIC, status TEXT, notes TEXT);`;
                                navigator.clipboard.writeText(sql);
                                alert("SQL Schema copied to clipboard! Paste it into your Supabase SQL Editor.");
                            }}
                            className="text-xs font-bold uppercase tracking-widest text-amber-900 bg-amber-200/50 px-4 py-2 rounded-lg hover:bg-amber-200"
                        >
                            Copy SQL Schema
                        </button>
                    </div>
                </div>
            );
        default:
             return <Dashboard products={products} invoices={invoices} />;
    }
  };

  if (isAuthChecking) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  if (!currentUser) return <AuthScreen onAuthSuccess={(u) => setCurrentUser(u)} />;

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
                        
                        <div className="ml-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
                            Supabase Cloud
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-slate-900">{currentUser.name || currentUser.email}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Active Member</p>
                        </div>
                        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Log Out">
                            <LogoutIcon className="w-6 h-6" />
                        </button>
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
            <ProductForm onAddProducts={handleAddProducts} existingImeis={existingImeis} onClose={() => setAddProductModalOpen(false)} categories={categories} onAddCategory={name => supabase.from('categories').insert({ name, userId: currentUser?.id }).then(syncAllData)} />
        </Modal>
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Product">
            {productToEdit && <ProductEditForm product={productToEdit} onUpdateProduct={handleUpdateProduct} onClose={() => setEditModalOpen(false)} categories={categories} />}
        </Modal>
        <Modal isOpen={isInvoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="New Invoice">
            <InvoiceForm availableProducts={availableProducts} customers={customers} onCreateInvoice={handleCreateInvoice} onClose={() => setInvoiceModalOpen(false)} onAddNewCustomer={(name, phone) => supabase.from('customers').insert({ name, phone, userId: currentUser?.id }).then(syncAllData)} />
        </Modal>
        <Modal isOpen={isPurchaseOrderModalOpen} onClose={() => setPurchaseOrderModalOpen(false)} title="New PO">
            <PurchaseOrderForm suppliers={suppliers} onSaveSupplier={s => supabase.from('suppliers').insert({ ...s, userId: currentUser?.id }).then(syncAllData)} categories={categories} onAddCategory={name => supabase.from('categories').insert({ name, userId: currentUser?.id }).then(syncAllData)} existingImeis={existingImeis} onCreatePurchaseOrder={handleCreatePurchaseOrder} onClose={() => setPurchaseOrderModalOpen(false)} nextPoNumber={`PO-${Date.now().toString().slice(-4)}`} />
        </Modal>
        <Modal isOpen={isCustomerModalOpen} onClose={() => setCustomerModalOpen(false)} title="Customer">
            <CustomerForm customer={customerToEdit} onSave={c => supabase.from('customers').upsert({ ...c, id: customerToEdit?.id, userId: currentUser?.id }).then(syncAllData)} onClose={() => setCustomerModalOpen(false)} />
        </Modal>
        <Modal isOpen={isSupplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Supplier">
            <SupplierForm supplier={supplierToEdit} onSave={s => supabase.from('suppliers').upsert({ ...s, id: supplierToEdit?.id, userId: currentUser?.id }).then(syncAllData)} onClose={() => setSupplierModalOpen(false)} />
        </Modal>
    </div>
  );
};

export default App;
