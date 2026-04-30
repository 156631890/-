import React, { useState } from 'react';
import { ArrowLeft, CheckSquare, Plus, Save, Sparkles } from 'lucide-react';
import { DraftFolder, ManualProductValues } from '../../types';

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
  onSaveManualProduct: (values: ManualProductValues) => void;
  canAnalyzeImages: boolean;
}

const emptyManualValues: ManualProductValues = {
  nameCn: '',
  nameEn: '',
  materialEn: '',
  hsCode: '',
  hsCodeReviewed: false,
  priceRawText: '',
  priceCurrency: 'RMB',
  priceUnit: 'pc',
  priceUnitQuantity: 1,
  priceRmb: 0,
  priceNormalizationNote: '',
  moq: 0,
  shopNo: '',
  boxLength: 0,
  boxWidth: 0,
  boxHeight: 0,
  pcsPerBox: 0,
  taxRate: 0,
};

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
  onSaveManualProduct,
  canAnalyzeImages
}) => {
  const [manualValues, setManualValues] = useState<ManualProductValues>(emptyManualValues);
  const allInFolderIds = folder.images.map(img => img.id);
  const selectedInThisFolder = folder.images.filter(img => selectedImageIds.has(img.id));
  const isAllSelected = allInFolderIds.length > 0 && allInFolderIds.every(id => selectedImageIds.has(id));
  const canSaveManual = manualValues.nameCn.trim() && manualValues.priceRmb > 0 && manualValues.moq > 0 && manualValues.pcsPerBox > 0;

  const updateManualValues = (patch: Partial<ManualProductValues>) => {
    setManualValues((current) => ({ ...current, ...patch }));
  };

  const saveManualProduct = () => {
    if (!canSaveManual) return;
    onSaveManualProduct(manualValues);
    setManualValues(emptyManualValues);
  };

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
        {!canAnalyzeImages && selectedInThisFolder.length > 0 && (
          <div className="m-3 rounded-xl border bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">{labels.manualEntry}</div>
                <div className="text-[10px] text-slate-400">{selectedInThisFolder.length} {labels.selected}</div>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={manualValues.hsCodeReviewed}
                  onChange={(event) => updateManualValues({ hsCodeReviewed: event.target.checked })}
                />
                HS reviewed
              </label>
            </div>
            <input className="w-full rounded-lg border p-2 text-sm" placeholder="Chinese name" value={manualValues.nameCn} onChange={(event) => updateManualValues({ nameCn: event.target.value })} />
            <input className="w-full rounded-lg border p-2 text-sm" placeholder="English name" value={manualValues.nameEn} onChange={(event) => updateManualValues({ nameEn: event.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded-lg border p-2 text-sm" placeholder="Material" value={manualValues.materialEn} onChange={(event) => updateManualValues({ materialEn: event.target.value })} />
              <input className="rounded-lg border p-2 text-sm" placeholder="HS Code" value={manualValues.hsCode} onChange={(event) => updateManualValues({ hsCode: event.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" className="rounded-lg border p-2 text-sm" placeholder="RMB" value={manualValues.priceRmb || ''} onChange={(event) => updateManualValues({ priceRmb: Number(event.target.value) })} />
              <input type="number" className="rounded-lg border p-2 text-sm" placeholder="MOQ" value={manualValues.moq || ''} onChange={(event) => updateManualValues({ moq: Number(event.target.value) })} />
              <input type="number" className="rounded-lg border p-2 text-sm" placeholder="Pcs/Ctn" value={manualValues.pcsPerBox || ''} onChange={(event) => updateManualValues({ pcsPerBox: Number(event.target.value) })} />
            </div>
            <input className="w-full rounded-lg border p-2 text-sm" placeholder="Raw price text, e.g. 30 RMB/dozen" value={manualValues.priceRawText || ''} onChange={(event) => updateManualValues({ priceRawText: event.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <select className="rounded-lg border p-2 text-sm bg-white" value={manualValues.priceCurrency || 'RMB'} onChange={(event) => updateManualValues({ priceCurrency: event.target.value as ManualProductValues['priceCurrency'] })}>
                <option value="RMB">RMB</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
              <select className="rounded-lg border p-2 text-sm bg-white" value={manualValues.priceUnit || 'pc'} onChange={(event) => updateManualValues({ priceUnit: event.target.value as ManualProductValues['priceUnit'] })}>
                <option value="pc">pc</option>
                <option value="box">box</option>
                <option value="set">set</option>
                <option value="dozen">dozen</option>
                <option value="pack">pack</option>
                <option value="carton">carton</option>
                <option value="unknown">unknown</option>
              </select>
              <input type="number" className="rounded-lg border p-2 text-sm" placeholder="Qty/unit" value={manualValues.priceUnitQuantity || ''} onChange={(event) => updateManualValues({ priceUnitQuantity: Number(event.target.value) })} />
            </div>
            <input className="w-full rounded-lg border p-2 text-sm" placeholder="Price normalization note" value={manualValues.priceNormalizationNote || ''} onChange={(event) => updateManualValues({ priceNormalizationNote: event.target.value })} />
            <div className="grid grid-cols-4 gap-2">
              <input type="number" className="rounded-lg border p-2 text-sm" placeholder="L" value={manualValues.boxLength || ''} onChange={(event) => updateManualValues({ boxLength: Number(event.target.value) })} />
              <input type="number" className="rounded-lg border p-2 text-sm" placeholder="W" value={manualValues.boxWidth || ''} onChange={(event) => updateManualValues({ boxWidth: Number(event.target.value) })} />
              <input type="number" className="rounded-lg border p-2 text-sm" placeholder="H" value={manualValues.boxHeight || ''} onChange={(event) => updateManualValues({ boxHeight: Number(event.target.value) })} />
              <input type="number" className="rounded-lg border p-2 text-sm" placeholder="Tax %" value={manualValues.taxRate || ''} onChange={(event) => updateManualValues({ taxRate: Number(event.target.value) })} />
            </div>
            <input className="w-full rounded-lg border p-2 text-sm" placeholder="Shop no. or address" value={manualValues.shopNo} onChange={(event) => updateManualValues({ shopNo: event.target.value })} />
            <button
              onClick={saveManualProduct}
              disabled={!canSaveManual}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500 flex items-center justify-center gap-2"
            >
              <Save size={16} /> {labels.manualEntry}
            </button>
          </div>
        )}
      </div>

      {selectedInThisFolder.length > 0 && canAnalyzeImages && (
        <div className="absolute bottom-6 left-6 right-6 z-30 animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={onProcessSelected}
            className="w-full rounded-2xl py-4 shadow-xl flex items-center justify-center gap-2 font-bold text-sm transition-transform bg-slate-900 text-white active:scale-95"
            title={labels.processSelected}
          >
            <Sparkles size={18} className="text-indigo-300" />
            {labels.processSelected} ({selectedInThisFolder.length})
          </button>
        </div>
      )}
    </div>
  );
};
