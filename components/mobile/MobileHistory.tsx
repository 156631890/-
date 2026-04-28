import React from 'react';
import { CheckSquare, Database, Download, Grid, Square, X } from 'lucide-react';
import { Product } from '../../types';
import { ExportType } from '../../services/export/exportTypes';

interface MobileHistoryLabels {
  exportOptions: string;
  history: string;
  cancel: string;
  select: string;
  myShops: string;
}

interface MobileHistoryProps {
  products: Product[];
  selectedIds: Set<string>;
  isSelectMode: boolean;
  showExportMenu: boolean;
  labels: MobileHistoryLabels;
  onToggleSelectMode: () => void;
  onToggleProduct: (productId: string) => void;
  setShowExportMenu: (show: boolean) => void;
  onExport: (format: 'excel' | 'pdf', type: ExportType) => void;
  onOpenFolders: () => void;
}

export const MobileHistory: React.FC<MobileHistoryProps> = ({
  products,
  selectedIds,
  isSelectMode,
  showExportMenu,
  labels,
  onToggleSelectMode,
  onToggleProduct,
  setShowExportMenu,
  onExport,
  onOpenFolders
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {showExportMenu && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end justify-center pb-8">
          <div className="bg-white w-[90%] max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">{labels.exportOptions}</h3>
              <button onClick={() => setShowExportMenu(false)} className="p-1 text-slate-400" aria-label="Close export options">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onExport('excel', 'quotation')} className="py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold">QTN.xlsx</button>
                <button onClick={() => onExport('pdf', 'quotation')} className="py-3 bg-red-600 text-white rounded-xl text-xs font-bold">QTN.pdf</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onExport('excel', 'packinglist')} className="py-3 bg-green-600 text-white rounded-xl text-xs font-bold">PKL.xlsx</button>
                <button onClick={() => onExport('pdf', 'packinglist')} className="py-3 bg-red-600 text-white rounded-xl text-xs font-bold">PKL.pdf</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="px-6 py-4 bg-white shadow-sm flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-xl font-bold">{labels.history}</h2>
        <button onClick={onToggleSelectMode} className="text-sm font-medium px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600">
          {isSelectMode ? labels.cancel : labels.select}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
        {products.map(p => (
          <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm border flex gap-3">
            {isSelectMode && (
              <div onClick={() => onToggleProduct(p.id)} className="flex items-center">
                {selectedIds.has(p.id) ? <CheckSquare className="text-indigo-600" /> : <Square className="text-slate-300" />}
              </div>
            )}
            <img src={p.photoUrl} className="w-20 h-20 rounded-lg object-cover border" />
            <div className="flex-1 py-1">
              <div className="font-bold text-sm">{p.sku}</div>
              <p className="text-xs text-slate-500">{p.nameEn || p.nameCn}</p>
              <div className="font-bold text-indigo-600 text-sm mt-1">RMB {p.priceRmb}</div>
            </div>
          </div>
        ))}
      </div>
      {isSelectMode ? (
        <div className="absolute bottom-24 w-full px-4 flex gap-3">
          <button onClick={() => setShowExportMenu(true)} className="flex-1 bg-indigo-600 text-white rounded-xl h-12 flex items-center justify-center gap-2 font-bold shadow-lg">
            <Download size={20} /> {labels.exportOptions}
          </button>
        </div>
      ) : (
        <nav className="glass-nav absolute bottom-0 w-full pb-8 pt-4 px-12 flex justify-between items-center z-20">
          <button onClick={onOpenFolders} className="flex flex-col items-center gap-1.5 text-slate-300" aria-label={labels.myShops}>
            <Grid size={24} />
            <span className="text-[10px] font-bold">{labels.myShops}</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 text-indigo-600 relative" aria-label={labels.history}>
            <div className="absolute -top-1 w-8 h-1 bg-indigo-600 rounded-full" />
            <Database size={24} strokeWidth={2.5} />
            <span className="text-[10px] font-bold">{labels.history}</span>
          </button>
        </nav>
      )}
    </div>
  );
};
