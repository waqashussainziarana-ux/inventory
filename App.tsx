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
import LoginScreen from './components/LoginScreen';
import { downloadPdf } from './utils/pdfGenerator';
import { PlusIcon, SearchIcon, DocumentTextIcon, ClipboardDocumentListIcon, LogoutIcon } from './components/icons';

type ActiveTab = 'active' | 'sold' | 'products' | 'archive' | 'invoices' | 'purchaseOrders' | 'customers' | 'categories' | 'suppliers';

const App: React.FC = () => {
  // --- Data Management ---
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [needsDbSetup, setNeedsDbSetup] = useState<boolean>(false);
  const [isSettingUpDb, setIsSettingUpDb] = useState<boolean>(false);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
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
    const sessionActive = sessionStorage.getItem('inventory-pro-session') === 'true';
    setIsAuthenticated(sessionActive);
  }, []);
  
  // Effect to fetch all data from the database
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setDataError(null);
      setNeedsDbSetup(false);

      const endpoints = [
        'products', 'customers', 'categories', 
        'suppliers', 'invoices', 'purchase-orders'
      ];
      const responses = await Promise.all(endpoints.map(ep => fetch(`/api/${ep}`)));

      for (const res of responses) {
          if (res.status === 404) {
              const errorData = await res.json();
              if (errorData.code === 'DB_TABLE_NOT_FOUND') {
                  setNeedsDbSetup(true);
                  return;
              }
          }
          if (!res.ok) {
              const err = await res.json();
              throw new Error(`Failed to fetch ${res.url}: ${err.error || 'Unknown error'}`);
          }
      }
      
      const [
          productsData, customersData, categoriesData, 
          suppliersData, invoicesData, purchaseOrdersData
      ] = await Promise.all(responses.map(res => res.json()));
      
      setProducts(productsData);
      setCustomers(customersData);
      setCategories(categoriesData);
      setSuppliers(suppliersData);
      setInvoices(invoicesData);
      setPurchaseOrders(purchaseOrdersData);

    } catch (err: any) {
      setDataError(err.message || 'An unexpected error occurred while fetching data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

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

  const handleInitializeDb = async () => {
    try {
        setIsSettingUpDb(true);
        setDataError(null);
        const response = await fetch('/api/setup', { method: 'POST' });
        if (!response.ok) {
            throw new Error('Failed to initialize the database.');
        }
        await fetchData();
    } catch (err: any) {
        setDataError(err.message || 'An unexpected error occurred during database setup.');
    } finally {
        setIsSettingUpDb(false);
    }
  };

  const handleLogin = (password: string): boolean => {
    if (password === 'admin123') {
        sessionStorage.setItem('inventory-pro-session', 'true');
        setIsAuthenticated(true);
        return true;
    }
    return false;
  };

  const handleLogout = () => {
    sessionStorage.removeItem('inventory-pro-session');
    setIsAuthenticated(false);
    setProducts([]);
    setCustomers([]);
    setCategories([]);
    setInvoices([]);
    setPurchaseOrders([]);
    setSuppliers([]);
  };

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
  const handleAddProducts = useCallback(async (productData: NewProductInfo, details: { trackingType: 'imei', imeis: string[] } | { trackingType: 'quantity', quantity: number }) => {
    let newProducts: Omit<Product, 'id'>[] = [];
    if (details.trackingType === 'imei') {
        newProducts = details.imeis.map(imei => ({
            ...productData,
            imei: imei,
            trackingType: 'imei',
            quantity: 1,
            status: ProductStatus.Available,
        }));
    } else {
        newProducts.push({
            ...productData,
            trackingType: 'quantity',
            quantity: details.quantity,
            status: ProductStatus.Available,
        });
    }

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProducts),
        });
        if (!response.ok) throw new Error('Failed to save new products.');
        await fetchData();
        return await response.json();
    } catch (error) {
        console.error('Error adding products:', error);
        alert('Error: Could not save products to the database.');
        return [];
    }
  }, [fetchData]);

  const handleOpenEditModal = (product: Product) => {
    setProductToEdit(product);
    setEditModalOpen(true);
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
        const response = await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProduct),
        });
        if (!response.ok) throw new Error('Failed to update product.');
        
        await fetchData(); // Refresh all data to ensure consistency
        
        setEditModalOpen(false);
        setProductToEdit(null);
    } catch (error) {
        console.error('Error updating product:', error);
        alert('Error: Could not update the product in the database.');
    }
  };
  
  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this product? This action cannot be undone.')) {
        try {
            const response = await fetch('/api/products', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: productId }),
            });
            if (!response.ok) {
                throw new Error('Failed to delete product from the database.');
            }
            await fetchData(); // Refresh data after deletion
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error: Could not delete the product.');
        }
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
      try {
        const response = await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId, items }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || 'An unknown error occurred on the server.');
        }
        const newInvoice = await response.json();
        
        await fetchData();

        setInvoiceModalOpen(false);
        handleDownloadInvoice(newInvoice);
      } catch (error: any) {
          console.error('Error creating invoice:', error);
          alert(`Error: Could not create the invoice.\n\n${error.message}`);
      }
  }, [fetchData]);

 const handleCreatePurchaseOrder = useCallback(async (
    poDetails: Omit<PurchaseOrder, 'id' | 'productIds' | 'totalCost' | 'supplierName' | 'issueDate'>,
    productsData: { productInfo: NewProductInfo, details: { trackingType: 'imei', imeis: string[] } | { trackingType: 'quantity', quantity: number } }[]
) => {
    try {
        const response = await fetch('/api/purchase-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ poDetails, productsData }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || 'An unknown error occurred on the server.');
        }
        const { po: newPO } = await response.json();

        await fetchData(); // Refresh all data for consistency

        setPurchaseOrderModalOpen(false);
        handleDownloadPurchaseOrder(newPO);
    } catch (error: any) {
        console.error('Error creating purchase order:', error);
        alert(`Error: Could not create the purchase order.\n\n${error.message}`);
    }
}, [fetchData]);
  
  // Category Handlers
  const handleAddCategory = async (name: string) => {
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert("Category already exists.");
        return undefined;
    }
    try {
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('Failed to save category.');
        const newCategory = await response.json();
        setCategories(prev => [...prev, newCategory]);
        return newCategory;
    } catch (error) {
        console.error(error);
        alert('Error: Could not save category.');
        return undefined;
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (products.some(p => p.category === category?.name)) {
        alert("Cannot delete category as it is used by some products.");
        return;
    }
    try {
        await fetch('/api/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        setCategories(prev => prev.filter(c => c.id !== id));
    } catch (error) { console.error(error); alert('Error: Could not delete category.'); }
  };
  
  // Customer Handlers
  const handleSaveCustomer = async (customerData: Omit<Customer, 'id'>) => {
    const customerToSave = customerToEdit ? { ...customerData, id: customerToEdit.id } : customerData;
    try {
        const response = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerToSave),
        });
        if (!response.ok) throw new Error('Failed to save customer.');
        const savedCustomer = await response.json();
        if (customerToEdit) {
            setCustomers(prev => prev.map(c => c.id === savedCustomer.id ? savedCustomer : c));
        } else {
            setCustomers(prev => [...prev, savedCustomer]);
        }
        setCustomerModalOpen(false);
        setCustomerToEdit(null);
    } catch (error) { console.error(error); alert('Error: Could not save customer.'); }
  };

  const handleAddCustomer = async (name: string, phone: string): Promise<Customer | undefined> => {
    if (customers.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert("A customer with this name already exists.");
        return undefined;
    }
    try {
        const response = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone }),
        });
        if (!response.ok) throw new Error('Failed to save customer.');
        const newCustomer = await response.json();
        setCustomers(prev => [...prev, newCustomer]);
        return newCustomer;
    } catch (error) {
        console.error(error);
        alert('Error: Could not add customer.');
        return undefined;
    }
  };

  const handleOpenAddCustomerModal = () => {
    setCustomerToEdit(null);
    setCustomerModalOpen(true);
  };
  
  const handleDeleteCustomer = async (id: string) => {
    if (invoices.some(inv => inv.customerId === id)) {
        alert("Cannot delete customer with existing invoices.");
        return;
    }
    try {
        await fetch('/api/customers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (error) { console.error(error); alert('Error: Could not delete customer.'); }
  };
  
  // Supplier Handlers
 const handleSaveSupplier = async (supplierData: Omit<Supplier, 'id'>) => {
    const supplierToSave = supplierToEdit ? { ...supplierData, id: supplierToEdit.id } : supplierData;
    try {
        const response = await fetch('/api/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(supplierToSave),
        });
        if (!response.ok) throw new Error('Failed to save supplier.');
        const savedSupplier = await response.json();
        if (supplierToEdit) {
            setSuppliers(prev => prev.map(s => s.id === savedSupplier.id ? savedSupplier : s));
        } else {
             // Handle case where supplier might already exist from another session
            const supplierExists = suppliers.some(s => s.id === savedSupplier.id);
            if (supplierExists) {
                setSuppliers(prev => prev.map(s => s.id === savedSupplier.id ? savedSupplier : s));
            } else {
                setSuppliers(prev => [...prev, savedSupplier]);
            }
        }
        setSupplierModalOpen(false);
        setSupplierToEdit(null);
    } catch (error) {
        console.error(error);
        alert('Error: Could not save supplier.');
    }
  };

  const handleOpenAddSupplierModal = () => {
    setSupplierToEdit(null);
    setSupplierModalOpen(true);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (purchaseOrders.some(po => po.supplierId === id)) {
        alert("Cannot delete supplier with existing purchase orders.");
        return;
    }
     try {
        await fetch('/api/suppliers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch (error) { console.error(error); alert('Error: Could not delete supplier.'); }
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
    if (isLoading) {
      return <div className="text-center py-20"><p className="text-lg font-medium text-slate-600">Loading inventory from database...</p></div>;
    }
    if (dataError) {
      return (
        <div className="text-center py-20 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-lg font-semibold text-red-700">Failed to load inventory</p>
          <p className="text-sm text-red-600 mt-2">{dataError}</p>
          <p className="text-xs text-slate-500 mt-4">Please ensure your database is running and the `DATABASE_URL` is correctly set in your Vercel environment variables.</p>
        </div>
      );
    }
    if (needsDbSetup) {
        return (
            <div className="text-center py-20 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h2 className="text-xl font-semibold text-blue-800">Welcome to Inventory Pro!</h2>
                <p className="text-slate-600 mt-2 max-w-md mx-auto">Your database is connected, but the necessary tables haven't been created yet. Click the button below to set them up automatically.</p>
                <button
                    onClick={handleInitializeDb}
                    disabled={isSettingUpDb}
                    className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                    {isSettingUpDb ? 'Initializing...' : 'Initialize Database'}
                </button>
            </div>
        );
    }

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

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-100/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Inventory Pro</h1>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-200 rounded-lg shadow-sm hover:bg-slate-300 focus:outline-none">
              <LogoutIcon className="w-5 h-5" /> Logout
            </button>
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
            nextPoNumber={`PO-${String(purchaseOrders.length + 1).padStart(4, '0')}`}
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

      {documentToPrint?.type === 'invoice' && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <InvoicePDF invoice={documentToPrint.data as Invoice} />
        </div>
      )}
      {documentToPrint?.type === 'po' && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <PurchaseOrderPDF purchaseOrder={documentToPrint.data as PurchaseOrder} products={products} suppliers={suppliers} />
        </div>
      )}
      
    </div>
  );
};

export default App;