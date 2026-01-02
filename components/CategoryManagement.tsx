
import React, { useState } from 'react';
import { Category, Product } from '../types';
import { PlusIcon, TrashIcon } from './icons';

interface CategoryManagementProps {
  categories: Category[];
  products: Product[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ categories, products, onAddCategory, onDeleteCategory }) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productCountByCategory = React.useMemo(() => {
    const counts: { [categoryName: string]: number } = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

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
    <div className="max-w-2xl mx-auto py-4 sm:py-6">
      <form onSubmit={handleAdd} className="flex items-center gap-4 mb-8 p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Enter new category name"
          className="flex-grow block w-full rounded-xl border-slate-300 shadow-sm focus:border-primary focus:ring-primary text-sm sm:text-base p-3"
        />
        <button
          type="submit"
          disabled={!newCategoryName.trim() || isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-bold text-white bg-primary border border-transparent rounded-xl shadow-sm hover:bg-primary-hover focus:outline-none disabled:opacity-50 transition-all"
        >
          {isSubmitting ? 'Adding...' : <><PlusIcon className="w-5 h-5" /> Add</>}
        </button>
      </form>
      
      <div className="space-y-4">
        {categories.length > 0 ? (
          categories.map(category => {
            const count = productCountByCategory[category.name] || 0;
            const canDelete = count === 0;
            return (
              <div key={category.id} className="flex justify-between items-center p-4 sm:p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <span className="font-bold text-slate-800 text-sm sm:text-lg">{category.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs sm:text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {count} unit(s)
                  </span>
                  <button
                    onClick={() => onDeleteCategory(category.id)}
                    disabled={!canDelete}
                    className="p-2 text-rose-500 hover:text-rose-700 disabled:text-slate-200 disabled:cursor-not-allowed transition-colors"
                    title={canDelete ? "Delete category" : "Cannot delete category with products"}
                  >
                    <TrashIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-slate-500 font-medium py-10">No categories found. Add one above.</p>
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;
