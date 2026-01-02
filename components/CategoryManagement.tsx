
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
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleAdd} className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-lg">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Enter new category name"
          className="flex-grow block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
        <button
          type="submit"
          disabled={!newCategoryName.trim() || isSubmitting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : <><PlusIcon className="w-5 h-5" /> Add Category</>}
        </button>
      </form>
      
      <div className="space-y-3">
        {categories.length > 0 ? (
          categories.map(category => {
            const count = productCountByCategory[category.name] || 0;
            const canDelete = count === 0;
            return (
              <div key={category.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                <span className="font-medium text-slate-800">{category.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {count} product(s)
                  </span>
                  <button
                    onClick={() => onDeleteCategory(category.id)}
                    disabled={!canDelete}
                    className="text-red-600 hover:text-red-800 disabled:text-slate-300 disabled:cursor-not-allowed"
                    title={canDelete ? "Delete category" : "Cannot delete category with products"}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-slate-500">No categories found. Add one above.</p>
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;
