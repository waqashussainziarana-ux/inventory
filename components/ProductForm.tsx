
import React, { useState, useRef, useEffect } from 'react';
import { NewProductInfo, Category, ProductStatus } from '../types';
import { CloseIcon, BarcodeIcon, PlusIcon } from './icons';
import onscan from 'onscan.js';

interface ProductFormProps {
  onAddProducts: (productData: NewProductInfo, details: { trackingType: 'imei', imeis: string[] } | { trackingType: 'quantity', quantity: number }) => Promise<any>;
  existingImeis: Set<string>;
  onClose: () => void;
  categories: Category[];
  onAddCategory: (name: string) => Promise<Category | undefined>;
}

// More permissive regex for IMEI/Serial Numbers: 3-40 chars, alphanumeric + common symbols
const ID_VALIDATION_REGEX = /^[a-zA-Z0-9\-\/\.\_\:\ ]{3,40}$/;
const ID_VALIDATION_MESSAGE = 'Format: 3-40 characters (letters, numbers, and - / . _ allowed).';

const ProductForm: React.FC<ProductFormProps> = ({ onAddProducts, existingImeis, onClose, categories, onAddCategory }) => {
  const [formData, setFormData] = useState<Omit<NewProductInfo, 'customerName'>>({
    productName: '',
    category: categories.length > 0 ? categories[0].name : '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: 0,
    sellingPrice: 0,
    notes: '',
  });

  const [trackingType, setTrackingType] = useState<'imei' | 'quantity'>('imei');
  const [quantity, setQuantity] = useState(1);

  const [currentImei, setCurrentImei] = useState('');
  const [imeis, setImeis] = useState<string[]>([]);
  const [imeiError, setImeiError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string | null }>({ type: 'idle', message: 'Waiting for scan...' });
  const [bulkImeisInput, setBulkImeisInput] = useState('');
  const [bulkAddStatus, setBulkAddStatus] = useState<{ added: number; duplicates: number; invalid: number } | null>(null);
  const imeiInputRef = useRef<HTMLInputElement>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // Effect for barcode scanner integration
  useEffect(() => {
    let statusTimeout: number;

    const handleScan = (sCode: string) => {
        if (trackingType !== 'imei') return;
        const trimmedImei = sCode.trim();
        if (!trimmedImei) return;
        
        const isValidImei = ID_VALIDATION_REGEX.test(trimmedImei);
        if (!isValidImei) {
          setScanStatus({ type: 'error', message: `Invalid format: ${trimmedImei}` });
          return;
        }

        setImeis(prevImeis => {
            if (existingImeis.has(trimmedImei)) {
                setScanStatus({ type: 'error', message: `Duplicate in inventory: ${trimmedImei}` });
                return prevImeis;
            }
            if (prevImeis.includes(trimmedImei)) {
                setScanStatus({ type: 'error', message: `Duplicate in this batch: ${trimmedImei}` });
                return prevImeis;
            }
            
            setScanStatus({ type: 'success', message: `Successfully added: ${trimmedImei}` });
            return [trimmedImei, ...prevImeis];
        });
    };

    try {
        if (typeof onscan !== 'undefined') {
            onscan.attachTo(document, {
                onScan: handleScan,
                reactToPaste: true,
                minLength: 3, 
                keyCodeMapper: (e: KeyboardEvent) => onscan.decodeKeyEvent(e),
            });
        }
    } catch(e) {
        console.error("onscan.js failed to attach.", e);
        setScanStatus({ type: 'error', message: "Barcode scanner could not be initialized." });
    }

    return () => {
        clearTimeout(statusTimeout);
        try {
            if (typeof onscan !== 'undefined' && onscan.isAttachedTo(document)) {
                onscan.detachFrom(document);
            }
        } catch(e) {
            console.error("onscan.js failed to detach.", e);
        }
    };
  }, [existingImeis, trackingType]);

  // Effect to clear status messages after a delay
  useEffect(() => {
      if (scanStatus.type !== 'idle') {
          const timer = setTimeout(() => {
              setScanStatus({ type: 'idle', message: 'Waiting for scan...' });
          }, 3000);
          return () => clearTimeout(timer);
      }
  }, [scanStatus]);

  // Effect to clear bulk add status message after a delay
  useEffect(() => {
    if (bulkAddStatus) {
        const timer = setTimeout(() => {
            setBulkAddStatus(null);
        }, 5000);
        return () => clearTimeout(timer);
    }
  }, [bulkAddStatus]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumericField = ['purchasePrice', 'sellingPrice'].includes(name);

    setFormData(prev => ({
        ...prev,
        [name]: isNumericField ? (value === '' ? '' : Number(value)) : value,
    }));
  };
  
  const handleImeiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newImei = e.target.value.trim();
    setCurrentImei(e.target.value);
    if (!newImei) {
      setImeiError(null);
      return;
    }

    const isValidImei = ID_VALIDATION_REGEX.test(newImei);
    if (!isValidImei) {
      setImeiError(ID_VALIDATION_MESSAGE);
    } else if (existingImeis.has(newImei)) {
      setImeiError('This identifier already exists in your inventory.');
    } else if (imeis.includes(newImei)) {
      setImeiError('This identifier has already been added to this batch.');
    } else {
      setImeiError(null);
    }
  };

  const handleAddNewCategory = async () => {
    if (newCategoryName.trim()) {
        const newCategory = await onAddCategory(newCategoryName.trim());
        if (newCategory) {
            setFormData(prev => ({...prev, category: newCategory.name}));
        }
        setNewCategoryName("");
        setIsAddingCategory(false);
    }
  };

  const handleAddImei = () => {
    const trimmedImei = currentImei.trim();
    if (trimmedImei && !imeiError) {
      setImeis(prev => [trimmedImei, ...prev]);
      setCurrentImei('');
      setImeiError(null);
      imeiInputRef.current?.focus();
    }
  };

  const handleImeiKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddImei();
    }
  };

  const handleRemoveImei = (imeiToRemove: string) => {
    setImeis(prev => prev.filter(i => i !== imeiToRemove));
  };
  
  const handleBulkAddImeis = () => {
    if (!bulkImeisInput.trim()) return;

    // Support comma, space, and newline as separators
    const potentialImeis = bulkImeisInput.trim().split(/[\s,;\n]+/).filter(Boolean);
    const uniquePotentialImeis = Array.from(new Set(potentialImeis));

    const newImeisToAdd: string[] = [];
    const stats = { added: 0, duplicates: 0, invalid: 0 };

    uniquePotentialImeis.forEach(imei => {
        const trimmedImei = String(imei).trim();
        if (!ID_VALIDATION_REGEX.test(trimmedImei)) {
            stats.invalid++;
        } else if (existingImeis.has(trimmedImei) || imeis.includes(trimmedImei)) {
            stats.duplicates++;
        } else {
            newImeisToAdd.push(trimmedImei);
        }
    });

    if (newImeisToAdd.length > 0) {
        setImeis(prev => [...newImeisToAdd.reverse(), ...prev]);
        stats.added = newImeisToAdd.length;
    }

    setBulkAddStatus(stats);
    setBulkImeisInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (trackingType === 'imei' && imeis.length === 0) {
      setImeiError('Please add at least one IMEI/SN number.');
      imeiInputRef.current?.focus();
      return;
    }
    if (trackingType === 'quantity' && (!quantity || quantity <= 0)) {
        alert('Please enter a valid quantity greater than 0.');
        return;
    }
    if (!formData.category) {
        alert('Please select or add a category.');
        return;
    }

    const details = trackingType === 'imei' 
        ? { trackingType: 'imei' as const, imeis }
        : { trackingType: 'quantity' as const, quantity: Number(quantity) };

    await onAddProducts(formData, details);
    onClose();
  };
  
  const totalUnits = trackingType === 'imei' ? imeis.length : (quantity || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-slate-700">Product Name</label>
          <input type="text" name="productName" id="productName" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value={formData.productName} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-slate-700">Category</label>
          {isAddingCategory ? (
            <div className="flex items-center gap-2 mt-1">
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} autoFocus className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="New category name" />
                <button type="button" onClick={handleAddNewCategory} className="px-3 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-hover">Add</button>
                <button type="button" onClick={() => setIsAddingCategory(false)} className="text-slate-500 hover:text-slate-700"><CloseIcon className="w-5 h-5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
                <select name="category" id="category" required value={formData.category} onChange={handleChange} className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                    {categories.length === 0 && <option value="" disabled>No categories available</option>}
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
                <button type="button" onClick={() => setIsAddingCategory(true)} className="p-2 text-slate-500 bg-slate-100 rounded-md hover:bg-slate-200"><PlusIcon className="w-5 h-5" /></button>
            </div>
          )}
        </div>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="purchaseDate" className="block text-sm font-medium text-slate-700">Purchase Date</label>
          <input type="date" name="purchaseDate" id="purchaseDate" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value={formData.purchaseDate} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="purchasePrice" className="block text-sm font-medium text-slate-700">Purchase Price (€)</label>
          <input type="number" name="purchasePrice" id="purchasePrice" step="0.01" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value={formData.purchasePrice} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="sellingPrice" className="block text-sm font-medium text-slate-700">Selling Price (€)</label>
          <input type="number" name="sellingPrice" id="sellingPrice" step="0.01" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value={formData.sellingPrice} onChange={handleChange} />
        </div>
      </div>
       <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Notes / Description (Optional)</label>
          <textarea name="notes" id="notes" rows={2} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value={formData.notes} onChange={handleChange}></textarea>
        </div>

      {/* Tracking Type Section */}
      <div className="pt-2 space-y-6">
        <div>
          <label className="text-base font-medium text-slate-900">Tracking Type</label>
          <p className="text-sm text-slate-500">How should this product be tracked in the inventory?</p>
          <fieldset className="mt-4">
            <legend className="sr-only">Tracking type</legend>
            <div className="space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-4">
              <div className="flex items-center">
                <input id="imei-tracking" name="tracking-method" type="radio" checked={trackingType === 'imei'} onChange={() => setTrackingType('imei')} className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"/>
                <label htmlFor="imei-tracking" className="ml-3 block text-sm font-medium text-slate-700">IMEI / SN</label>
              </div>
              <div className="flex items-center">
                <input id="quantity-tracking" name="tracking-method" type="radio" checked={trackingType === 'quantity'} onChange={() => setTrackingType('quantity')} className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"/>
                <label htmlFor="quantity-tracking" className="ml-3 block text-sm font-medium text-slate-700">Quantity</label>
              </div>
            </div>
          </fieldset>
        </div>

        {/* Conditional Fields */}
        {trackingType === 'quantity' ? (
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">Quantity</label>
            <input type="number" name="quantity" id="quantity" min="1" step="1" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)} />
          </div>
        ) : (
          <div className="pt-2 space-y-6">
            <div className="p-4 border rounded-lg bg-slate-50 text-center space-y-3 shadow-inner">
                <BarcodeIcon className="w-10 h-10 mx-auto text-slate-400" />
                <h3 className="text-lg font-medium text-slate-800">Barcode Scanning Active</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">Just scan an item to add it to the list automatically.</p>
                <div className="h-5">
                    {scanStatus.type === 'success' && <p className="text-sm font-medium text-green-600">{scanStatus.message}</p>}
                    {scanStatus.type === 'error' && <p className="text-sm font-medium text-red-600">{scanStatus.message}</p>}
                    {scanStatus.type === 'idle' && <p className="text-sm text-slate-500">{scanStatus.message}</p>}
                </div>
            </div>
             <div className="flex items-start gap-2">
              <div className="flex-grow">
                <label htmlFor="imei" className="sr-only">Enter IMEI / SN</label>
                <input ref={imeiInputRef} type="text" name="imei" id="imei" value={currentImei} onChange={handleImeiChange} onKeyDown={handleImeiKeyDown} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${imeiError ? 'border-red-500 ring-red-500' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'}`} placeholder="Enter identifier and press Add" />
                {imeiError && <p className="mt-1 text-sm text-red-600">{imeiError}</p>}
              </div>
              <button type="button" onClick={handleAddImei} disabled={!currentImei.trim() || !!imeiError} className="mt-1 shrink-0 px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none disabled:opacity-50">Add</button>
            </div>
             <div className="pt-4 space-y-2">
                <label htmlFor="bulkImei" className="block text-sm font-medium text-slate-700">Or Paste a List of IMEI/SN Numbers</label>
                <textarea id="bulkImei" name="bulkImei" rows={3} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm" placeholder="Separate multiple IDs with commas, spaces, or new lines." value={bulkImeisInput} onChange={(e) => setBulkImeisInput(e.target.value)} aria-describedby="bulk-add-status"/>
                <div className="flex justify-between items-center gap-4 pt-1">
                    <button type="button" onClick={handleBulkAddImeis} disabled={!bulkImeisInput.trim()} className="px-4 py-2 text-sm font-medium text-white bg-primary border rounded-md shadow-sm hover:bg-primary-hover focus:outline-none disabled:opacity-50">Add from List</button>
                    <div id="bulk-add-status" className="text-sm text-slate-600 text-right">
                        {bulkAddStatus && ( <> {bulkAddStatus.added > 0 && <span className="text-green-600 font-medium">Added: {bulkAddStatus.added}</span>} {bulkAddStatus.duplicates > 0 && <span className="text-amber-600 ml-3">Duplicates: {bulkAddStatus.duplicates}</span>} {bulkAddStatus.invalid > 0 && <span className="text-red-600 ml-3">Invalid: {bulkAddStatus.invalid}</span>} </> )}
                    </div>
                </div>
            </div>
             {imeis.length > 0 && (
              <div className="pt-2">
                <h4 className="font-medium text-slate-700 text-sm">{imeis.length} ID(s) ready to be added:</h4>
                <ul className="mt-2 p-2 border rounded-md max-h-32 overflow-y-auto bg-white space-y-1">
                  {imeis.map(imei => ( <li key={imei} className="flex justify-between items-center text-sm p-1.5 bg-slate-100 rounded"> <span className="font-mono text-slate-800">{imei}</span> <button type="button" onClick={() => handleRemoveImei(imei)} className="text-slate-400 hover:text-red-600" aria-label={`Remove ${imei}`}> <CloseIcon className="w-4 h-4" /> </button> </li> ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-transparent rounded-md hover:bg-slate-200 focus:outline-none">
          Cancel
        </button>
        <button type="submit" disabled={totalUnits === 0} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none disabled:opacity-50">
          Add {totalUnits > 0 ? `${totalUnits} Product(s)` : 'Product(s)'}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
