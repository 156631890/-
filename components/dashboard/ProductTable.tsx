import React from 'react';
import { CheckSquare, Edit, Globe, Save as SaveIcon, Sparkles, Square, X } from 'lucide-react';
import { Product } from '../../types';
import { ProductMetrics } from '../../utils/productMetrics';

interface ProductTableLabels {
  productName: string;
  details: string;
  cost: string;
  landed: string;
  actions: string;
}

interface ProductTableProps {
  products: Product[];
  selectedIds: Set<string>;
  editingId: string | null;
  editForm: Partial<Product>;
  processingId: string | null;
  searchQuery: string;
  labels: ProductTableLabels;
  getMetrics: (product: Product) => ProductMetrics;
  onToggleSelection: (productId: string) => void;
  onToggleAll: () => void;
  onPreviewImage: (imageUrl: string) => void;
  onStartEdit: (product: Product) => void;
  onEditChange: (patch: Partial<Product>) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEnrich: (product: Product) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  selectedIds,
  editingId,
  editForm,
  processingId,
  searchQuery,
  labels,
  getMetrics,
  onToggleSelection,
  onToggleAll,
  onPreviewImage,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onEnrich,
}) => {
  const allVisibleSelected = products.length > 0 && products.every((product) => selectedIds.has(product.id));

  return (
    <table className="w-full text-left text-sm whitespace-nowrap">
      <thead className="bg-slate-50 border-b">
        <tr>
          <th className="px-6 py-4 w-10">
            <button
              onClick={onToggleAll}
              className="text-slate-400"
              aria-label={allVisibleSelected ? 'Deselect all visible products' : 'Select all visible products'}
              title={allVisibleSelected ? 'Deselect all visible products' : 'Select all visible products'}
            >
              {allVisibleSelected ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
          </th>
          <th className="px-4 py-3">{labels.productName}</th>
          <th className="px-4 py-3">{labels.details}</th>
          <th className="px-4 py-3 text-right">{labels.cost}</th>
          <th className="px-4 py-3 text-right">{labels.landed}</th>
          <th className="px-6 py-3 text-center">{labels.actions}</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {products.map((product) => {
          const metrics = getMetrics(product);
          const isEditing = editingId === product.id;
          const isSelected = selectedIds.has(product.id);
          const isProcessing = processingId === product.id;

          return (
            <tr key={product.id} className={`${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
              <td className="px-6 py-4">
                <button
                  onClick={() => onToggleSelection(product.id)}
                  className={isSelected ? 'text-indigo-600' : 'text-slate-300'}
                  aria-label={`${isSelected ? 'Deselect' : 'Select'} ${product.sku || product.nameCn}`}
                  title={isSelected ? 'Deselect product' : 'Select product'}
                >
                  <CheckSquare size={18} />
                </button>
              </td>
              <td className="px-4 py-4">
                <div className="flex gap-4">
                  <img
                    src={product.photoUrl}
                    alt={product.nameEn || product.nameCn || product.sku}
                    onClick={() => onPreviewImage(product.photoUrl)}
                    className="w-16 h-16 rounded border object-cover cursor-pointer bg-white"
                  />
                  <div>
                    <div className="font-bold">{product.sku}</div>
                    <div className="text-[10px] text-slate-500">{product.nameCn}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 max-w-[200px] truncate">
                <div className="flex flex-col gap-1">
                  {isEditing ? (
                    <input
                      className="w-full border p-1"
                      value={editForm.nameEn || ''}
                      onChange={(event) => onEditChange({ nameEn: event.target.value })}
                    />
                  ) : (
                    product.nameEn || '-'
                  )}
                  {product.groundingUrls && product.groundingUrls.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.groundingUrls.map((link, index) => (
                        <a
                          key={index}
                          href={link.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-indigo-500 hover:underline flex items-center gap-0.5"
                          title={link.title}
                        >
                          <Globe size={8} /> Source {index + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 text-right font-mono">RMB {product.priceRmb}</td>
              <td className="px-4 py-4 text-right font-mono text-emerald-600 font-bold">
                EUR {metrics.landedCostEuro.toFixed(2)}
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        onClick={onSaveEdit}
                        className="p-1.5 bg-green-100 text-green-700 rounded"
                        aria-label={`Save ${product.sku || product.nameCn}`}
                        title="Save"
                      >
                        <SaveIcon size={14} />
                      </button>
                      <button
                        onClick={onCancelEdit}
                        className="p-1.5 bg-red-100 text-red-700 rounded"
                        aria-label={`Cancel editing ${product.sku || product.nameCn}`}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onEnrich(product)}
                        disabled={isProcessing}
                        className="p-1.5 bg-indigo-50 text-indigo-600 rounded disabled:opacity-50"
                        aria-label={`AI enrich ${product.sku || product.nameCn}`}
                        title="AI enrich"
                      >
                        <Sparkles size={14} className={isProcessing ? 'animate-spin' : undefined} />
                      </button>
                      <button
                        onClick={() => onStartEdit(product)}
                        className="p-1.5 bg-slate-100 text-slate-600 rounded"
                        aria-label={`Edit ${product.sku || product.nameCn}`}
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
        {products.length === 0 && (
          <tr>
            <td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-400">
              {searchQuery ? 'No products match your search.' : 'No products yet.'}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};
