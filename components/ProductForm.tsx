
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

/** 
 * Liberal Validation: 2-64 characters. 
 * Allows letters, numbers, and common symbols used in serials (-, /, ., _, :, #, etc.)
 * Specifically excludes commas, semicolons, and whitespace which are used as delimiters.
 */
const ID_VALIDATION_REGEX = /^[^,;\s\n\r]{2,64}$/;
const ID_VALIDATION_MESSAGE = 'Identifier must be 2-64 characters (no spaces or commas).';

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
  const [scanStatus, setScanStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string | null }>({ type: 'idle', message: 'Ready for scanning or paste...' });
  const [bulkImeisInput, setBulkImeisInput] = useState('');
  const [bulkAddStatus, setBulkAddStatus] = useState<{ added: number; duplicates: number; invalid: number } | null>(null);
  const imeiInputRef = useRef<HTMLInputElement>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // Smart processing for potential multiple IDs
  const processNewIdentifiers = (input: string): { valid: string[], invalid: number, duplicates: number } => {
    const rawItems = input.split(/[\s,;\n\r]+/).filter(Boolean);
    const uniqueRaw = Array.from(new Set(rawItems));
    
    const valid: string[] = [];
    let invalid = 0;
    let duplicates = 0;

    uniqueRaw.forEach(item => {
      const trimmed = item.trim();
      if (!ID_VALIDATION_REGEX.test(trimmed)) {
        invalid++;
      } else if (existingImeis.has(trimmed) || imeis.includes(trimmed)) {
        duplicates++;
      } else {
        valid.push(trimmed);
      }
    });

    return { valid, invalid, duplicates };
  };

  useEffect(() => {
    const handleScan = (sCode: string) => {
        if (trackingType !== 'imei') return;
        const trimmed = sCode.trim();
        if (!trimmed) return;
        
        const { valid, invalid, duplicates } = processNewIdentifiers(trimmed);

        if (valid.length > 0) {
            setImeis(prev => [...valid.reverse(), ...prev]);
            setScanStatus({ 
                type: 'success', 
                message: `Added ${valid.length} item(s). ${invalid > 0 ? `(${invalid} invalid)` : ''}` 
            });
        } else if (invalid > 0) {
            setScanStatus({ type: 'error', message: `Invalid ID format detected.` });
        } else if (duplicates > 0) {
            setScanStatus({ type: 'error', message: `Item(s) already in inventory.` });
        }
    };

    try {
        if (typeof onscan !== 'undefined') {
            onscan.attachTo(document, {
                onScan: handleScan,
                reactToPaste: true, // Handle accidental global pastes
                minLength: 2, 
                keyCodeMapper: (e: KeyboardEvent) => onscan.decodeKeyEvent(e),
            });
        }
    } catch(e) {
        console.error("Scanner init failed", e);
    }

    return () => {
        try {
            if (typeof onscan !== 'undefined' && onscan.isAttachedTo(document)) {
                onscan.detachFrom(document);
            }
        } catch(e) {}
    };
  }, [existingImeis, trackingType, imeis]);

  useEffect(() => {
      if (scanStatus.type !== 'idle') {
          const timer = setTimeout(() => setScanStatus({ type: 'idle', message: 'Ready for scanning...' }), 4000);
          return () => clearTimeout(timer);
      }
  }, [scanStatus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumericField = ['purchasePrice', 'sellingPrice'].includes(name);
    setFormData(prev => ({
        ...prev,
        [name]: isNumericField ? (value === '' ? '' : Number(value)) : value,
    }));
  };
  
  const handleImeiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCurrentImei(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setImeiError(null);
      return;
    }
    if (!ID_VALIDATION_REGEX.test(trimmed)) {
      setImeiError(ID_VALIDATION_MESSAGE);
    } else if (existingImeis.has(trimmed) || imeis.includes(trimmed)) {
      setImeiError('Duplicate ID detected.');
    } else {
      setImeiError(null);
    }
  };

  const handleAddImei = () => {
    const trimmed = currentImei.trim();
    if (trimmed && !imeiError) {
      setImeis(prev => [trimmed, ...prev]);
      setCurrentImei('');
      setImeiError(null);
      imeiInputRef.current?.focus();
    }
  };

  const handleBulkAddImeis = () => {
    const { valid, invalid, duplicates } = processNewIdentifiers(bulkImeisInput);
    if (valid.length > 0) {
        setImeis(prev => [...valid.reverse(), ...prev]);
    }
    setBulkAddStatus({ added: valid.length, invalid, duplicates });
    setBulkImeisInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingType === 'imei' && imeis.length === 0) {
      setImeiError('Add at least one IMEI/SN.');
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">Product Name</label>
          <input type="text" name="productName" required className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" value={formData.productName} onChange={handleChange} placeholder="e.g. iPhone 15 Pro" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <div className="flex items-center gap-2 mt-1">
              <select name="category" required value={formData.category} onChange={handleChange} className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
              <button type="button" onClick={() => setIsAddingCategory(true)} className="p-2 text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200"><PlusIcon className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">Date</label>
          <input type="date" name="purchaseDate" required className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm sm:text-sm" value={formData.purchaseDate} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Cost (€)</label>
          <input type="number" name="purchasePrice" step="0.01" required className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm sm:text-sm" value={formData.purchasePrice} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Retail (€)</label>
          <input type="number" name="sellingPrice" step="0.01" required className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm sm:text-sm" value={formData.sellingPrice} onChange={handleChange} />
        </div>
      </div>

      <div className="space-y-6 pt-4">
        <div className="flex bg-slate-100 p-1 rounded-xl">
            <button type="button" onClick={() => setTrackingType('imei')} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${trackingType === 'imei' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}>IMEI / Serial No.</button>
            <button type="button" onClick={() => setTrackingType('quantity')} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${trackingType === 'quantity' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}>General Quantity</button>
        </div>

        {trackingType === 'quantity' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700">Quantity to Add</label>
            <input type="number" min="1" required className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm sm:text-sm" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 text-center space-y-2">
                <BarcodeIcon className="w-8 h-8 mx-auto text-primary opacity-50" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Scanner Link Active</h3>
                <p className="text-xs text-slate-400">Scan devices or paste directly into the app.</p>
                <div className="h-4">
                    {scanStatus.type === 'success' && <p className="text-xs font-bold text-emerald-600">{scanStatus.message}</p>}
                    {scanStatus.type === 'error' && <p className="text-xs font-bold text-rose-600">{scanStatus.message}</p>}
                </div>
            </div>

             <div className="flex gap-2">
                <div className="flex-grow">
                    <input ref={imeiInputRef} type="text" value={currentImei} onChange={handleImeiChange} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImei())} className={`block w-full rounded-xl border-slate-300 shadow-sm sm:text-sm ${imeiError ? 'border-rose-500 ring-rose-500' : ''}`} placeholder="Type IMEI or SN..." />
                    {imeiError && <p className="mt-1 text-[10px] font-bold text-rose-500 uppercase tracking-tight">{imeiError}</p>}
                </div>
                <button type="button" onClick={handleAddImei} disabled={!currentImei.trim() || !!imeiError} className="px-6 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary-hover disabled:opacity-50 transition-all">Add</button>
            </div>

             <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Bulk Paste List</label>
                <textarea rows={3} className="block w-full rounded-2xl border-slate-300 shadow-sm sm:text-sm" placeholder="Paste multiple IDs here. Supports commas, spaces, or new lines." value={bulkImeisInput} onChange={(e) => setBulkImeisInput(e.target.value)} />
                <div className="flex justify-between items-center">
                    <button type="button" onClick={handleBulkAddImeis} disabled={!bulkImeisInput.trim()} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-all">Add All from Paste</button>
                    <div className="text-[10px] font-black uppercase tracking-widest">
                        {bulkAddStatus && ( <> {bulkAddStatus.added > 0 && <span className="text-emerald-600">Added: {bulkAddStatus.added}</span>} {bulkAddStatus.invalid > 0 && <span className="text-rose-500 ml-3">Invalid: {bulkAddStatus.invalid}</span>} {bulkAddStatus.duplicates > 0 && <span className="text-amber-500 ml-3">Duplicates: {bulkAddStatus.duplicates}</span>} </> )}
                    </div>
                </div>
            </div>

             {imeis.length > 0 && (
              <div className="pt-2">
                <div className="flex justify-between items-end mb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch List ({imeis.length})</h4>
                    <button type="button" onClick={() => setImeis([])} className="text-[10px] font-bold text-rose-500 hover:underline">Clear List</button>
                </div>
                <ul className="p-3 bg-white border border-slate-200 rounded-2xl max-h-40 overflow-y-auto space-y-1.5 shadow-inner">
                  {imeis.map(imei => ( 
                    <li key={imei} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg border border-slate-100"> 
                        <span className="font-mono font-bold text-slate-700">{imei}</span> 
                        <button type="button" onClick={() => setImeis(prev => prev.filter(i => i !== imei))} className="text-slate-300 hover:text-rose-500"> <CloseIcon className="w-4 h-4" /> </button> 
                    </li> 
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t mt-6">
        <button type="button" onClick={onClose} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700">Cancel</button>
        <button type="submit" disabled={totalUnits === 0} className="px-8 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-primary-hover active:scale-95 disabled:opacity-50 transition-all">
          Save {totalUnits > 0 ? `${totalUnits} Items` : ''}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
