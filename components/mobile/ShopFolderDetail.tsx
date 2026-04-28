import React from 'react';
import { ArrowLeft, CheckSquare, Plus, Sparkles } from 'lucide-react';
import { DraftFolder } from '../MobileEntry';

interface ShopFolderDetailLabels {
  photos: string;
  selected: string;
  unselectAll: string;
  selectAll: string;
  addPhotos: string;
  processSelected: string;
  manualEntry: string;
}

interface ShopFolderDetailProps {
  folder: DraftFolder;
  selectedImageIds: Set<string>;
  labels: ShopFolderDetailLabels;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onBack: () => void;
  onToggleSelectAll: () => void;
  onToggleImage: (imageId: string) => void;
  onAddPhotos: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProcessSelected: () => void;
  canAnalyzeImages: boolean;
}

export const ShopFolderDetail: React.FC<ShopFolderDetailProps> = ({
  folder,
  selectedImageIds,
  labels,
  fileInputRef,
  onBack,
  onToggleSelectAll,
  onToggleImage,
  onAddPhotos,
  onProcessSelected,
  canAnalyzeImages
}) => {
  const allInFolderIds = folder.images.map(img => img.id);
  const selectedInThisFolder = folder.images.filter(img => selectedImageIds.has(img.id));
  const isAllSelected = allInFolderIds.length > 0 && allInFolderIds.every(id => selectedImageIds.has(id));

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600" aria-label="Back to shops">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-bold text-slate-900 text-sm">{folder.name}</div>
          <div className="text-[10px] text-slate-400">
            {folder.images.length} {labels.photos} ({selectedInThisFolder.length} {labels.selected})
          </div>
        </div>
        <button
          onClick={onToggleSelectAll}
          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${isAllSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600'}`}
        >
          {isAllSelected ? labels.unselectAll : labels.selectAll}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1 pb-32">
        <div className="grid grid-cols-3 gap-1">
          {folder.images.map(img => (
            <div key={img.id} onClick={() => onToggleImage(img.id)} className="aspect-square relative cursor-pointer group">
              <img src={img.url} className="w-full h-full object-cover transition-opacity group-active:opacity-70" />
              <div className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${selectedImageIds.has(img.id) ? 'bg-indigo-600 border-indigo-600 scale-110' : 'bg-black/20 border-white/50 scale-100'}`}>
                {selectedImageIds.has(img.id) && <CheckSquare size={14} className="text-white" />}
              </div>
            </div>
          ))}
          <label className="aspect-square bg-slate-50 flex flex-col items-center justify-center text-indigo-600 cursor-pointer border-2 border-dashed border-indigo-100 rounded-lg hover:bg-indigo-50 transition-colors">
            <Plus size={32} strokeWidth={3} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{labels.addPhotos}</span>
            <input type="file" multiple accept="image/*" onChange={onAddPhotos} className="hidden" ref={fileInputRef} />
          </label>
        </div>
      </div>

      {selectedInThisFolder.length > 0 && (
        <div className="absolute bottom-6 left-6 right-6 z-30 animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={onProcessSelected}
            disabled={!canAnalyzeImages}
            className={`w-full rounded-2xl py-4 shadow-xl flex items-center justify-center gap-2 font-bold text-sm transition-transform ${canAnalyzeImages ? 'bg-slate-900 text-white active:scale-95' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
            title={canAnalyzeImages ? labels.processSelected : 'Image analysis requires a vision-capable proxy'}
          >
            <Sparkles size={18} className="text-indigo-300" />
            {canAnalyzeImages ? labels.processSelected : labels.manualEntry} ({selectedInThisFolder.length})
          </button>
        </div>
      )}
    </div>
  );
};
