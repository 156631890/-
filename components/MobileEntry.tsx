import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, Box, Home, Plus, Layers, Loader2, ImagePlus, ChevronRight, Package, Tag, Store, DollarSign, Zap, X, ArrowLeft, CheckSquare, Square, Trash2, Sparkles, Download, RefreshCw, FileText, Database, Printer, Contact, UserCircle, Briefcase, Globe, ScanLine, Edit2, Folder, FolderPlus, ArrowUpRight, Grid, Image as ImageIcon, Eraser, FileDown } from 'lucide-react';
import { Product, ProcessingStatus, SupplierInfo, Language } from '../types';
import { analyzeImage, enrichProductData, analyzeBusinessCard } from '../services/geminiService';
import { translations } from '../utils/i18n';

// Declare globals for CDN libraries
declare const ExcelJS: any;
declare const saveAs: any;
declare const jspdf: any;

interface DraftImage {
  id: string;
  url: string;
  timestamp: number;
}

interface DraftFolder {
  id: string;
  name: string;
  supplier: SupplierInfo;
  images: DraftImage[];
  timestamp: number;
}

interface MobileEntryProps {
  onSave: (product: Product) => void;
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (ids: string[]) => void;
  isDesktopMode?: boolean;
  onClose?: () => void;
  products?: Product[];
  currentLang?: Language;
  onLanguageChange?: (lang: Language) => void;
}

const MobileEntry: React.FC<MobileEntryProps> = ({ 
  onSave, onUpdateProduct, onDeleteProduct, isDesktopMode, onClose, products = [], 
  currentLang = 'en', onLanguageChange 
}) => {
  const t = translations[currentLang];
  
  // --- STATE ---
  const [viewMode, setViewMode] = useState<'folders' | 'folderDetail' | 'history'>('folders');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<DraftFolder[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({ current: 0, total: 0, text: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const isMounted = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // --- HELPERS ---

  const calculateMetrics = (p: Partial<Product>) => {
    const rate = 7.8; 
    const cbm = (p.boxLength && p.boxWidth && p.boxHeight) ? (p.boxLength * p.boxWidth * p.boxHeight) / 1000000 : 0;
    const priceStockUsd = (p.priceRmb || 0) > 0 ? (p.priceRmb || 0) / 7.2 : 0;
    return { cbm: Number(cbm.toFixed(4)), priceStockUsd: Number(priceStockUsd.toFixed(3)) };
  };

  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(event.target?.result as string); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  // --- HANDLERS ---

  const handleCreateFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessing(true);
      setProcessingStatus({ current: 0, total: 1, text: String(t.analyzingCard) });
      try {
        const base64 = await processImageFile(e.target.files[0] as File);
        const info = await analyzeBusinessCard(base64);
        const newFolder: DraftFolder = {
          id: Date.now().toString(),
          name: info.companyName || "New Shop " + (folders.length + 1),
          supplier: info,
          images: [],
          timestamp: Date.now()
        };
        setFolders(prev => [newFolder, ...prev]);
        setActiveFolderId(newFolder.id);
        setViewMode('folderDetail');
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeFolderId) return;
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const newImages: DraftImage[] = [];
      for (const file of files) {
        const b64 = await processImageFile(file);
        newImages.push({
          id: Math.random().toString(36).substr(2, 9) + Date.now(),
          url: b64,
          timestamp: Date.now()
        });
      }
      setFolders(prev => prev.map(f => f.id === activeFolderId ? { ...f, images: [...f.images, ...newImages] } : f));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleToggleSelectAllInFolder = () => {
    if (!activeFolderId) return;
    const folder = folders.find(f => f.id === activeFolderId);
    if (!folder) return;

    const allInFolderIds = folder.images.map(img => img.id);
    const someSelected = allInFolderIds.some(id => selectedImageIds.has(id));
    const allSelected = allInFolderIds.every(id => selectedImageIds.has(id));

    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        // Deselect all in this folder
        allInFolderIds.forEach(id => next.delete(id));
      } else {
        // Select all in this folder
        allInFolderIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleImageSelection = (imgId: string) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(imgId)) next.delete(imgId);
      else next.add(imgId);
      return next;
    });
  };

  const handleProcessSelected = async () => {
    if (selectedImageIds.size === 0) return;
    setIsProcessing(true);
    let processed = 0; const total = selectedImageIds.size;
    const queue: { img: DraftImage, supplier: SupplierInfo }[] = [];
    folders.forEach(f => { f.images.forEach(img => { if (selectedImageIds.has(img.id)) queue.push({ img, supplier: f.supplier }); }); });
    
    for (const item of queue) {
      if (!isMounted.current) break;
      setProcessingStatus({ current: processed + 1, total, text: `Analyzing item ${processed + 1}/${total}` });
      try {
        const aiData = await analyzeImage(item.img.url);
        const newProduct: Product = { 
          id: Date.now().toString() + "_" + Math.random().toString(36).substr(2, 5), 
          sku: `YW-${Math.floor(Math.random() * 90000) + 10000}`, 
          photoUrl: item.img.url, 
          supplier: item.supplier, 
          nameCn: aiData.nameCn, 
          nameEn: aiData.nameEn, 
          materialEn: aiData.materialEn, 
          priceRmb: aiData.priceRmb, 
          moq: aiData.moq, 
          shopNo: item.supplier.address || "TBD", 
          hsCode: aiData.hsCode, 
          boxLength: aiData.boxLength, 
          boxWidth: aiData.boxWidth, 
          boxHeight: aiData.boxHeight, 
          pcsPerBox: aiData.pcsPerBox, 
          status: ProcessingStatus.DRAFT, 
          timestamp: Date.now() 
        };
        onSave({ ...newProduct, ...calculateMetrics(newProduct) });
        // Clean up processed draft
        setFolders(prev => prev.map(f => ({ ...f, images: f.images.filter(img => img.id !== item.img.id) })).filter(f => f.images.length > 0));
        setSelectedImageIds(prev => { const next = new Set(prev); next.delete(item.img.id); return next; });
      } catch (e) { console.error(e); }
      processed++;
    }
    setIsProcessing(false); 
    if (isMounted.current) { alert(t.batchComplete); setViewMode('history'); }
  };

  const handleExport = async (format: 'excel' | 'pdf', type: 'quotation' | 'packinglist' | 'invoice') => {
    if (format === 'excel') {
      if (typeof ExcelJS === 'undefined') return;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(type.toUpperCase());
      const items = selectedIds.size > 0 ? products.filter(p => selectedIds.has(p.id)) : products;
      sheet.columns = [{ header: 'Image', key: 'img', width: 20 }, { header: 'SKU', key: 'sku', width: 15 }, { header: 'Description', key: 'name', width: 35 }];
      items.forEach((p, i) => {
        const row = sheet.addRow({ sku: p.sku, name: p.nameEn || p.nameCn });
        row.height = 100;
        if (p.photoUrl && p.photoUrl.startsWith('data:image')) {
          try {
            const base64 = p.photoUrl.split(',')[1];
            const imgId = workbook.addImage({ base64, extension: 'jpeg' });
            sheet.addImage(imgId, { tl: { col: 0, row: i + 1 }, br: { col: 1, row: i + 2 }, editAs: 'twoCell' });
          } catch(e) {}
        }
      });
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Yiwu_${type}.xlsx`);
    } else {
      if (typeof jspdf === 'undefined') return;
      const items = selectedIds.size > 0 ? products.filter(p => selectedIds.has(p.id)) : products;
      const doc = new jspdf.jsPDF('p', 'mm', 'a4');
      doc.text(type.toUpperCase(), 14, 20);
      const body = items.map((p, i) => ['', i+1, p.sku, p.nameEn || p.nameCn]);
      (doc as any).autoTable({
        head: [['Image', 'No.', 'SKU', 'Description']],
        body: body,
        startY: 30,
        columnStyles: { 0: { cellWidth: 30 } },
        didDrawCell: (data: any) => {
          if (data.column.index === 0 && data.cell.section === 'body') {
            const p = items[data.row.index];
            if (p.photoUrl) doc.addImage(p.photoUrl, 'JPEG', data.cell.x+2, data.cell.y+2, 26, 26);
          }
        },
        bodyStyles: { minCellHeight: 30 }
      });
      doc.save(`Yiwu_${type}.pdf`);
    }
    setShowExportMenu(false);
  };

  // --- RENDER VIEWS ---

  if (isProcessing) {
    return (
      <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center text-indigo-600">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-bold text-lg text-slate-800">{processingStatus.text}</p>
        <div className="w-64 h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${(processingStatus.current / processingStatus.total) * 100}%` }}></div>
        </div>
      </div>
    );
  }

  if (viewMode === 'folders') {
    return (
      <div className="flex flex-col h-full bg-slate-50 relative">
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20">
          <h1 className="text-xl font-bold">{t.myShops}</h1>
          <button onClick={() => { if(currentLang==='en') onLanguageChange?.('zh'); else onLanguageChange?.('en'); }} className="text-xs font-bold px-2.5 py-1.5 bg-slate-50 rounded-lg border">{currentLang.toUpperCase()}</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          <div className="bg-indigo-600 rounded-2xl p-4 flex items-center justify-between shadow-lg text-white">
            <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"><Store size={24} /></div><div><div className="font-bold">{t.newShop}</div><div className="text-xs opacity-70">{t.scanCardToCreate}</div></div></div>
            <label className="bg-white text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform"><ScanLine size={20} /><input type="file" accept="image/*" className="hidden" ref={cardInputRef} onChange={handleCreateFolder} /></label>
          </div>
          {folders.length === 0 ? (
            <div className="text-center py-20 text-slate-400"><FolderPlus size={48} className="mx-auto mb-3 opacity-20" /><p className="text-sm">{t.emptyFolders}</p></div>
          ) : (
            folders.map(f => (
              <div key={f.id} className="bg-white rounded-2xl border p-4 shadow-sm flex items-center justify-between" onClick={() => { setActiveFolderId(f.id); setViewMode('folderDetail'); }}>
                <div className="flex items-center gap-3"><div className="bg-amber-100 text-amber-600 p-2.5 rounded-lg"><Folder size={20} fill="currentColor" className="opacity-80"/></div><div><div className="font-bold text-sm">{f.name}</div><div className="text-xs text-slate-400">{f.images.length} {t.photos}</div></div></div>
                <ChevronRight size={20} className="text-slate-300" />
              </div>
            ))
          )}
        </div>
        {!isDesktopMode && (
          <nav className="glass-nav absolute bottom-0 w-full pb-8 pt-4 px-12 flex justify-between items-center z-10">
            <button className="flex flex-col items-center gap-1.5 text-indigo-600 relative"><div className="absolute -top-1 w-8 h-1 bg-indigo-600 rounded-full"></div><Grid size={24} strokeWidth={2.5} /><span className="text-[10px] font-bold">{t.myShops}</span></button>
            <button onClick={() => setViewMode('history')} className="flex flex-col items-center gap-1.5 text-slate-300"><Database size={24} /><span className="text-[10px] font-bold">{t.history}</span></button>
          </nav>
        )}
      </div>
    );
  }

  if (viewMode === 'folderDetail' && activeFolderId) {
    const folder = folders.find(f => f.id === activeFolderId);
    if (!folder) { setViewMode('folders'); return null; }
    
    const allInFolderIds = folder.images.map(img => img.id);
    const selectedInThisFolder = folder.images.filter(img => selectedImageIds.has(img.id));
    const isAllSelected = allInFolderIds.length > 0 && allInFolderIds.every(id => selectedImageIds.has(id));

    return (
      <div className="flex flex-col h-full bg-white relative">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setViewMode('folders')} className="p-2 -ml-2 text-slate-600"><ArrowLeft size={20} /></button>
          <div className="text-center">
            <div className="font-bold text-slate-900 text-sm">{folder.name}</div>
            <div className="text-[10px] text-slate-400">{folder.images.length} {t.photos} ({selectedInThisFolder.length} {t.selected})</div>
          </div>
          <button 
            onClick={handleToggleSelectAllInFolder}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${isAllSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600'}`}
          >
            {isAllSelected ? t.unselectAll : t.selectAll}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-1 pb-32">
          <div className="grid grid-cols-3 gap-1">
            {folder.images.map(img => (
              <div key={img.id} onClick={() => toggleImageSelection(img.id)} className="aspect-square relative cursor-pointer group">
                <img src={img.url} className="w-full h-full object-cover transition-opacity group-active:opacity-70" />
                <div className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${selectedImageIds.has(img.id) ? 'bg-indigo-600 border-indigo-600 scale-110' : 'bg-black/20 border-white/50 scale-100'}`}>
                  {selectedImageIds.has(img.id) && <CheckSquare size={14} className="text-white"/>}
                </div>
              </div>
            ))}
            <label className="aspect-square bg-slate-50 flex flex-col items-center justify-center text-indigo-600 cursor-pointer border-2 border-dashed border-indigo-100 rounded-lg hover:bg-indigo-50 transition-colors">
              <Plus size={32} strokeWidth={3} />
              <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{t.addPhotos}</span>
              <input type="file" multiple accept="image/*" onChange={handleAddPhotos} className="hidden" ref={fileInputRef} />
            </label>
          </div>
        </div>
        
        {selectedImageIds.size > 0 && (
          <div className="absolute bottom-6 left-6 right-6 z-30 animate-in slide-in-from-bottom-4 duration-300">
            <button 
              onClick={handleProcessSelected} 
              className="w-full bg-slate-900 text-white rounded-2xl py-4 shadow-xl flex items-center justify-center gap-2 font-bold text-sm active:scale-95 transition-transform"
            >
              <Sparkles size={18} className="text-indigo-300"/> 
              {t.processSelected} ({selectedImageIds.size})
            </button>
          </div>
        )}
      </div>
    );
  }

  // History / List View
  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {showExportMenu && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end justify-center pb-8">
           <div className="bg-white w-[90%] max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex justify-between items-center"><h3 className="font-bold text-lg">{t.exportOptions}</h3><button onClick={()=>setShowExportMenu(false)} className="p-1 text-slate-400"><X size={20}/></button></div>
              <div className="space-y-3">
                 <div className="grid grid-cols-2 gap-2"><button onClick={()=>handleExport('excel', 'quotation')} className="py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold">QTN.xlsx</button><button onClick={()=>handleExport('pdf', 'quotation')} className="py-3 bg-red-600 text-white rounded-xl text-xs font-bold">QTN.pdf</button></div>
                 <div className="grid grid-cols-2 gap-2"><button onClick={()=>handleExport('excel', 'packinglist')} className="py-3 bg-green-600 text-white rounded-xl text-xs font-bold">PKL.xlsx</button><button onClick={()=>handleExport('pdf', 'packinglist')} className="py-3 bg-red-600 text-white rounded-xl text-xs font-bold">PKL.pdf</button></div>
              </div>
           </div>
        </div>
      )}
      <div className="px-6 py-4 bg-white shadow-sm flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-xl font-bold">{t.history}</h2>
        <button onClick={() => setIsSelectMode(!isSelectMode)} className="text-sm font-medium px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600">{isSelectMode ? t.cancel : t.select}</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
        {products.map(p => (
          <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm border flex gap-3">
            {isSelectMode && (<div onClick={()=>{ const s = new Set(selectedIds); if(s.has(p.id)) s.delete(p.id); else s.add(p.id); setSelectedIds(s); }} className="flex items-center">{selectedIds.has(p.id) ? <CheckSquare className="text-indigo-600"/> : <Square className="text-slate-300"/>}</div>)}
            <img src={p.photoUrl} className="w-20 h-20 rounded-lg object-cover border" />
            <div className="flex-1 py-1"><div className="font-bold text-sm">{p.sku}</div><p className="text-xs text-slate-500">{p.nameEn || p.nameCn}</p><div className="font-bold text-indigo-600 text-sm mt-1">¥{p.priceRmb}</div></div>
          </div>
        ))}
      </div>
      {isSelectMode ? (
        <div className="absolute bottom-24 w-full px-4 flex gap-3"><button onClick={()=>setShowExportMenu(true)} className="flex-1 bg-indigo-600 text-white rounded-xl h-12 flex items-center justify-center gap-2 font-bold shadow-lg"><Download size={20}/> {t.exportOptions}</button></div>
      ) : (
        <nav className="glass-nav absolute bottom-0 w-full pb-8 pt-4 px-12 flex justify-between items-center z-20">
          <button onClick={() => setViewMode('folders')} className="flex flex-col items-center gap-1.5 text-slate-300"><Grid size={24} /><span className="text-[10px] font-bold">{t.myShops}</span></button>
          <button className="flex flex-col items-center gap-1.5 text-indigo-600 relative"><div className="absolute -top-1 w-8 h-1 bg-indigo-600 rounded-full"></div><Database size={24} strokeWidth={2.5} /><span className="text-[10px] font-bold">{t.history}</span></button>
        </nav>
      )}
    </div>
  );
};

export default MobileEntry;