import React from 'react';
import { ChevronRight, Database, Folder, FolderPlus, Grid, ScanLine, Store } from 'lucide-react';
import { DraftFolder, Language } from '../../types';

interface ShopFolderListLabels {
  myShops: string;
  newShop: string;
  manualEntry: string;
  scanCardToCreate: string;
  emptyFolders: string;
  photos: string;
  history: string;
}

interface ShopFolderListProps {
  folders: DraftFolder[];
  currentLang: Language;
  labels: ShopFolderListLabels;
  onToggleLanguage: () => void;
  canAnalyzeImages: boolean;
  onCreateFolder: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateManualFolder: () => void;
  onOpenFolder: (folderId: string) => void;
  cardInputRef: React.RefObject<HTMLInputElement | null>;
  isDesktopMode?: boolean;
  onOpenHistory: () => void;
}

export const ShopFolderList: React.FC<ShopFolderListProps> = ({
  folders,
  currentLang,
  labels,
  onToggleLanguage,
  canAnalyzeImages,
  onCreateFolder,
  onCreateManualFolder,
  onOpenFolder,
  cardInputRef,
  isDesktopMode,
  onOpenHistory
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold">{labels.myShops}</h1>
        <button onClick={onToggleLanguage} className="text-xs font-bold px-2.5 py-1.5 bg-slate-50 rounded-lg border">
          {currentLang.toUpperCase()}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        <div className="bg-indigo-600 rounded-2xl p-4 flex items-center justify-between shadow-lg text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Store size={24} />
            </div>
            <div>
              <div className="font-bold">{labels.newShop}</div>
              <div className="text-xs opacity-70">{canAnalyzeImages ? labels.scanCardToCreate : labels.manualEntry}</div>
            </div>
          </div>
          {canAnalyzeImages ? (
            <label
              className="bg-white text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              aria-label="Scan business card"
              title="Scan business card"
            >
              <ScanLine size={20} />
              <input type="file" accept="image/*" className="hidden" ref={cardInputRef} onChange={onCreateFolder} aria-label="Scan business card" />
            </label>
          ) : (
            <button
              onClick={onCreateManualFolder}
              className="bg-white text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Create folder manually"
              title="Create folder manually"
            >
              <FolderPlus size={20} />
            </button>
          )}
        </div>
        {folders.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FolderPlus size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">{labels.emptyFolders}</p>
          </div>
        ) : (
          folders.map(f => (
            <div
              key={f.id}
              className="bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between"
              onClick={() => onOpenFolder(f.id)}
            >
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 text-amber-600 p-2.5 rounded-lg">
                  <Folder size={20} fill="currentColor" className="opacity-80" />
                </div>
                <div>
                  <div className="font-bold text-sm">{f.name}</div>
                  <div className="text-xs text-slate-400">{f.images.length} {labels.photos}</div>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300" />
            </div>
          ))
        )}
      </div>
      {!isDesktopMode && (
        <nav className="glass-nav absolute bottom-0 w-full pb-8 pt-4 px-12 flex justify-between items-center z-10">
          <button className="flex flex-col items-center gap-1.5 text-indigo-600 relative" aria-label={labels.myShops}>
            <div className="absolute -top-1 w-8 h-1 bg-indigo-600 rounded-full" />
            <Grid size={24} strokeWidth={2.5} />
            <span className="text-[10px] font-bold">{labels.myShops}</span>
          </button>
          <button onClick={onOpenHistory} className="flex flex-col items-center gap-1.5 text-slate-300" aria-label={labels.history}>
            <Database size={24} />
            <span className="text-[10px] font-bold">{labels.history}</span>
          </button>
        </nav>
      )}
    </div>
  );
};
