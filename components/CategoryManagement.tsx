
import React, { useState, useMemo } from 'react';
import { Category, Product } from '../types';
import { PlusIcon, TrashIcon } from './icons';
import Highlight from './Highlight';

interface CategoryManagementProps {
  categories: Category[];
  products: Product[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
  searchQuery: string;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ categories, products, onAddCategory, onDeleteCategory, searchQuery }) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productCountByCategory = useMemo(() => {
    const counts: { [categoryName: string]: number } = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const lowerQuery = searchQuery.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(lowerQuery));
  }, [categories, searchQuery]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onAddCategory(newCategoryName.trim());
        setNewCategoryName('');
      } catch (err) {
        alert("Failed to add category. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row items-center gap-4 mb-10 p-6 sm:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New Category Name..."
          className="flex-grow block w-full rounded-2xl border-slate-200 focus:border-primary focus:ring-primary text-base p-4"
        />
        <button
          type="submit"
          disabled={!newCategoryName.trim() || isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-black uppercase tracking-widest text-white bg-primary border border-transparent rounded-2xl shadow-xl hover:bg-primary-hover focus:outline-none disabled:opacity-50 transition-all active:scale-95"
        >
          {isSubmitting ? 'Adding...' : <><PlusIcon className="w-5 h-5" /> Add Category</>}
        </button>
      </form>
      
      <div className="space-y-4">
        {filteredCategories.length > 0 ? (
          filteredCategories.map(category => {
            const count = productCountByCategory[category.name] || 0;
            const canDelete = count === 0;
            return (
              <div key={category.id} className="flex justify-between items-center p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-lg transition-all duration-300">
                <span className="font-bold text-slate-800 text-base sm:text-xl">
                  <Highlight text={category.name} query={searchQuery} />
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-xs sm:text-sm font-bold text-slate-500 bg-slate-100 px-4 py-2 rounded-xl">
                    {count} unit(s)
                  </span>
                  <button
                    onClick={() => onDeleteCategory(category.id)}
                    disabled={!canDelete}
                    className="p-3 text-rose-500 hover:text-rose-700 disabled:text-slate-200 disabled:cursor-not-allowed transition-colors"
                    title={canDelete ? "Delete category" : "Cannot delete category with products"}
                  >
                    <TrashIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-bold text-lg">
              {searchQuery ? `No categories matching "${searchQuery}"` : 'No categories found.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;
