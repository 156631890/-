import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, Box, Home, Plus, Layers, Loader2, ImagePlus, ChevronRight, Package, Tag, Store, DollarSign, Zap, X, ArrowLeft, CheckSquare, Square, Trash2, Sparkles, Download, RefreshCw, FileText, Database, Printer, Contact, UserCircle, Briefcase, Globe, ScanLine, Edit2, Folder, FolderPlus, ArrowUpRight, Grid, Image as ImageIcon } from 'lucide-react';
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
  
  // Folders (Shops) State - Locally persisted in memory for this session
  // In a real app, you might want to sync this to IDB as well.
  const [folders, setFolders] = useState<DraftFolder[]>([]);
  
  // Selection State (Global: can select images from different folders)
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  
  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({ current: 0, total: 0, text: '' });

  // History / Product List State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 });
  
  // Refs & Utils
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
    const freight = 150; 
    const duty = p.taxRate || 0;

    const cbm = (p.boxLength && p.boxWidth && p.boxHeight) 
      ? (p.boxLength * p.boxWidth * p.boxHeight) / 1000000 
      : 0;
    const freightPerPc = (cbm > 0 && (p.pcsPerBox || 1) > 0) ? (freight * cbm) / (p.pcsPerBox || 1) : 0;
    const baseCostEuro = (p.priceRmb || 0) > 0 ? (p.priceRmb || 0) / rate : 0;
    const dutyCost = baseCostEuro * (duty / 100);
    const landedCostEuro = baseCostEuro + freightPerPc + dutyCost;
    const priceSpainEuro = landedCostEuro * 1.2;
    const priceStockUsd = (p.priceRmb || 0) > 0 ? (p.priceRmb || 0) / 7.2 : 0;

    return {
      cbm: Number(cbm.toFixed(4)),
      freightPerPc: Number(freightPerPc.toFixed(4)),
      landedCostEuro: Number(landedCostEuro.toFixed(3)),
      priceSpainEuro: Number(priceSpainEuro.toFixed(2)),
      priceStockUsd: Number(priceStockUsd.toFixed(3))
    };
  };

  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
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
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // --- ACTIONS: FOLDERS ---

  const handleCreateFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsProcessing(true);
      setProcessingStatus({ current: 0, total: 1, text: t.analyzingCard });
      
      try {
        const base64 = await processImageFile(file);
        const info = await analyzeBusinessCard(base64);
        
        const newFolder: DraftFolder = {
          id: Date.now().toString(),
          name: info.companyName || "New Shop " + (folders.length + 1),
          supplier: info,
          images: [],
          timestamp: Date.now()
        };
        
        if (isMounted.current) {
          setFolders(prev => [newFolder, ...prev]);
          setActiveFolderId(newFolder.id); // Auto enter folder
          setViewMode('folderDetail');
        }
      } catch (err) {
        console.error(err);
        alert("Failed to analyze card, created generic folder.");
        const newFolder: DraftFolder = {
          id: Date.now().toString(),
          name: "New Shop " + (folders.length + 1),
          supplier: { companyName: "", contactPerson: "", phone: "", address: "" },
          images: [],
          timestamp: Date.now()
        };
        setFolders(prev => [newFolder, ...prev]);
        setActiveFolderId(newFolder.id);
        setViewMode('folderDetail');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleDeleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this folder and all its photos?")) {
       setFolders(prev => prev.filter(f => f.id !== id));
       // Also remove selected images that were in this folder
       const folder = folders.find(f => f.id === id);
       if (folder) {
         const idsToRemove = new Set(folder.images.map(img => img.id));
         setSelectedImageIds(prev => {
           const next = new Set(prev);
           idsToRemove.forEach(i => next.delete(i));
           return next;
         });
       }
    }
  };
  
  const handleRenameFolder = (id: string, newName: string) => {
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName, supplier: { ...f.supplier, companyName: newName } } : f));
  };

  // --- ACTIONS: IMAGES ---

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeFolderId) return;
    if (e.target.files && e.target.files.length > 0) {
      // Cast to File[] to avoid TypeScript inference issues
      const files: File[] = Array.from(e.target.files);
      // Optimistically add placeholders or process sequentially
      const newImages: DraftImage[] = [];
      
      for (const file of files) {
         try {
           const base64 = await processImageFile(file);
           newImages.push({
             id: Math.random().toString(36).substr(2, 9) + Date.now(),
             url: base64,
             timestamp: Date.now()
           });
         } catch (err) {
           console.error("Img error", err);
         }
      }
      
      setFolders(prev => prev.map(f => {
        if (f.id === activeFolderId) {
          return { ...f, images: [...newImages, ...f.images] };
        }
        return f;
      }));
      
      // Clear input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleImageSelection = (imgId: string) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(imgId)) next.delete(imgId);
      else next.add(imgId);
      return next;
    });
  };

  const toggleFolderSelection = (folderId: string) => {
     const folder = folders.find(f => f.id === folderId);
     if (!folder) return;
     
     // Check if all selected
     const allSelected = folder.images.every(img => selectedImageIds.has(img.id));
     
     setSelectedImageIds(prev => {
        const next = new Set(prev);
        if (allSelected) {
           // Unselect all
           folder.images.forEach(img => next.delete(img.id));
        } else {
           // Select all
           folder.images.forEach(img => next.add(img.id));
        }
        return next;
     });
  };

  // --- ACTIONS: PROCESSING ---

  const handleProcessSelected = async () => {
    if (selectedImageIds.size === 0) return;
    
    setIsProcessing(true);
    let processed = 0;
    const total = selectedImageIds.size;
    
    // Flatten all images with their supplier info
    const queue: { img: DraftImage, supplier: SupplierInfo }[] = [];
    
    folders.forEach(f => {
      f.images.forEach(img => {
        if (selectedImageIds.has(img.id)) {
          queue.push({ img, supplier: f.supplier });
        }
      });
    });

    setProcessingStatus({ current: 0, total, text: "Initializing..." });

    for (const item of queue) {
      if (!isMounted.current) break;
      setProcessingStatus({ current: processed + 1, total, text: `Analyzing item ${processed + 1}/${total}` });
      
      try {
        // AI Analysis
        const aiData = await analyzeImage(item.img.url);
        
        // Construct Product
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
        
        const metrics = calculateMetrics(newProduct);
        onSave({ ...newProduct, ...metrics });

        // Remove from folder? Or keep marked as done?
        // For this flow, let's remove the draft image once processed successfully to avoid duplicates
        setFolders(prev => prev.map(f => ({
           ...f,
           images: f.images.filter(img => img.id !== item.img.id)
        })));
        
        setSelectedImageIds(prev => {
           const next = new Set(prev);
           next.delete(item.img.id);
           return next;
        });

      } catch (e) {
        console.error("Processing error", e);
      }
      processed++;
    }

    setIsProcessing(false);
    
    // Switch to history view to see results
    if (isMounted.current) {
        alert(t.batchComplete);
        setViewMode('history');
    }
  };

  // --- ACTIONS: HISTORY & EXPORT ---

  const handleBulkEnrich = async () => {
    if (selectedIds.size === 0) return;
    setIsEnriching(true);
    setEnrichProgress({ current: 0, total: selectedIds.size });
    
    const ids = Array.from(selectedIds);
    const items = products.filter(p => ids.includes(p.id));

    for (let i = 0; i < items.length; i++) {
        if (!isMounted.current) break;
        const p = items[i];
        setEnrichProgress({ current: i + 1, total: items.length });
        try {
             // Basic AI enrichment based on name
             const enriched = await enrichProductData(p.nameCn);
             if (onUpdateProduct) {
                 const updated = { ...p, ...enriched };
                 const metrics = calculateMetrics(updated);
                 onUpdateProduct({ ...updated, ...metrics, status: ProcessingStatus.REVIEW_NEEDED });
             }
        } catch (e) {
            console.error("Bulk enrich error", e);
        }
    }
    
    setIsEnriching(false);
    setIsSelectMode(false);
    setSelectedIds(new Set());
    alert(t.batchComplete);
  };

  const handleExport = async (method: 'excel', type: 'master' | 'quotation' | 'packinglist' | 'invoice') => {
      if (typeof ExcelJS === 'undefined') return alert("ExcelJS not ready");
      
      const items = selectedIds.size > 0 
        ? products.filter(p => selectedIds.has(p.id)) 
        : products;
        
      if (items.length === 0) return;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(type.toUpperCase());
      
      // Basic columns based on type
      if (type === 'quotation') {
        sheet.columns = [
           { header: 'Image', key: 'img', width: 15 },
           { header: 'SKU', key: 'sku', width: 15 },
           { header: 'Description', key: 'desc', width: 30 },
           { header: 'Price', key: 'price', width: 10 },
           { header: 'Qty', key: 'qty', width: 10 },
           { header: 'Total', key: 'total', width: 12 },
        ];
      } else {
        sheet.columns = [
           { header: 'Image', key: 'img', width: 15 },
           { header: 'SKU', key: 'sku', width: 15 },
           { header: 'Name (CN)', key: 'nameCn', width: 20 },
           { header: 'Name (EN)', key: 'nameEn', width: 20 },
           { header: 'Specs', key: 'specs', width: 20 },
           { header: 'CBM', key: 'cbm', width: 10 },
           { header: 'G.W', key: 'gw', width: 10 },
        ];
      }
      
      for (let i = 0; i < items.length; i++) {
         const p = items[i];
         const m = calculateMetrics(p);
         const rowIdx = i + 2;
         
         const rowValues = type === 'quotation' 
            ? { 
                sku: p.sku, 
                desc: p.nameEn || p.nameCn, 
                price: m.priceStockUsd, 
                qty: p.moq, 
                total: (m.priceStockUsd || 0) * (p.moq || 0) 
              }
            : { 
                sku: p.sku, 
                nameCn: p.nameCn, 
                nameEn: p.nameEn,
                specs: `${p.boxLength}x${p.boxWidth}x${p.boxHeight}`,
                cbm: m.cbm,
                gw: p.gwKg
              };
         
         const row = sheet.addRow(rowValues);
         row.height = 80;
         
         if (p.photoUrl && p.photoUrl.startsWith('data:image')) {
             try {
                const base64 = p.photoUrl.split(',')[1];
                const imgId = workbook.addImage({ base64, extension: 'jpeg' });
                // @ts-ignore
                sheet.addImage(imgId, {
                    tl: { col: 0.1, row: rowIdx - 1 + 0.1 },
                    br: { col: 0.9, row: rowIdx - 0.1 }
                });
             } catch(e) {}
         }
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Yiwu_Mobile_Export_${type}.xlsx`);
      setShowExportMenu(false);
  };

  const toggleLanguage = () => {
     if (!onLanguageChange) return;
     if (currentLang === 'en') onLanguageChange('zh');
     else if (currentLang === 'zh') onLanguageChange('es');
     else onLanguageChange('en');
  };


  // --- RENDER HELPERS ---

  if (isProcessing) {
     return (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center text-indigo-600">
           <Loader2 className="animate-spin mb-4" size={48} />
           <p className="font-bold text-lg text-slate-800">{processingStatus.text}</p>
           <div className="w-64 h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-300" 
                style={{ width: `${(processingStatus.current / processingStatus.total) * 100}%` }}
              ></div>
           </div>
           <p className="text-xs text-slate-400 mt-2">{processingStatus.current} / {processingStatus.total}</p>
        </div>
     );
  }

  // --- VIEW: FOLDERS LIST ---
  if (viewMode === 'folders') {
    return (
      <div className="flex flex-col h-full bg-slate-50 font-sans relative">
         {/* Header */}
         <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
             <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t.myShops}</h1>
             <div className="flex items-center gap-2">
                 {/* Select All Button across all folders? Maybe overkill. Just show count. */}
                 {selectedImageIds.size > 0 && <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">{selectedImageIds.size}</span>}
                 {!isDesktopMode && onClose && (
                      <button onClick={onClose} className="p-1.5 bg-slate-50 rounded-full text-slate-600 active:bg-slate-200">
                          <Home size={18}/>
                      </button>
                 )}
                 <button onClick={toggleLanguage} className="text-xs font-bold px-2.5 py-1.5 bg-slate-50 rounded-lg text-slate-600 flex items-center gap-1 border border-slate-100">
                    <Globe size={13}/> {currentLang.toUpperCase()}
                 </button>
             </div>
         </div>

         {/* Content */}
         <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
             {/* New Shop Button */}
             <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 p-0.5">
                 <div className="bg-white rounded-[14px] p-4 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                           <Store size={24} />
                        </div>
                        <div>
                           <div className="font-bold text-slate-900">{t.newShop}</div>
                           <div className="text-xs text-slate-500">{t.scanCardToCreate}</div>
                        </div>
                     </div>
                     <label className="bg-slate-900 text-white w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-md active:scale-95 transition-transform">
                        <ScanLine size={20} />
                        <input type="file" accept="image/*" className="hidden" ref={cardInputRef} onChange={handleCreateFolder} />
                     </label>
                 </div>
             </div>

             {/* Folder List */}
             {folders.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                   <FolderPlus size={48} className="mx-auto mb-3 opacity-20" />
                   <p>{t.emptyFolders}</p>
                </div>
             ) : (
                <div className="space-y-3">
                   {folders.map(folder => {
                      const selectedCount = folder.images.filter(img => selectedImageIds.has(img.id)).length;
                      const hasSelection = selectedCount > 0;
                      
                      return (
                        <div key={folder.id} className={`bg-white rounded-2xl border ${hasSelection ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-100'} shadow-sm overflow-hidden`}>
                           {/* Folder Header */}
                           <div className="p-4 flex items-start justify-between">
                              <div 
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                                onClick={() => { setActiveFolderId(folder.id); setViewMode('folderDetail'); }}
                              >
                                 <div className="bg-amber-100 text-amber-600 p-2.5 rounded-lg">
                                    <Folder size={20} fill="currentColor" className="opacity-80"/>
                                 </div>
                                 <div className="min-w-0">
                                    <div className="font-bold text-slate-800 text-sm truncate">{folder.name}</div>
                                    <div className="text-xs text-slate-400">{folder.images.length} {t.photos}</div>
                                 </div>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                 {/* Batch Select Checkbox */}
                                 <button onClick={() => toggleFolderSelection(folder.id)} className={`p-2 rounded-full ${hasSelection ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300'}`}>
                                    {selectedCount === folder.images.length && folder.images.length > 0 ? <CheckSquare size={20}/> : <Square size={20}/>}
                                 </button>
                                 {/* Enter Button */}
                                 <button 
                                   onClick={() => { setActiveFolderId(folder.id); setViewMode('folderDetail'); }}
                                   className="p-2 text-slate-300 hover:text-slate-600"
                                 >
                                    <ChevronRight size={20} />
                                 </button>
                              </div>
                           </div>
                           
                           {/* Quick Preview Strip */}
                           {folder.images.length > 0 && (
                             <div className="px-4 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
                                {folder.images.slice(0, 5).map(img => (
                                   <div 
                                     key={img.id} 
                                     onClick={() => toggleImageSelection(img.id)}
                                     className={`w-12 h-12 rounded-lg shrink-0 overflow-hidden border relative ${selectedImageIds.has(img.id) ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-slate-100'}`}
                                   >
                                      <img src={img.url} className="w-full h-full object-cover" />
                                      {selectedImageIds.has(img.id) && <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center"><CheckSquare size={16} className="text-white drop-shadow-md"/></div>}
                                   </div>
                                ))}
                                {folder.images.length > 5 && (
                                   <div 
                                      onClick={() => { setActiveFolderId(folder.id); setViewMode('folderDetail'); }}
                                      className="w-12 h-12 rounded-lg shrink-0 bg-slate-50 flex items-center justify-center text-xs text-slate-400 font-bold border border-slate-100"
                                   >
                                      +{folder.images.length - 5}
                                   </div>
                                )}
                             </div>
                           )}
                           
                           {/* Actions Footer */}
                           <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                              <span className="text-[10px] text-slate-400">{new Date(folder.timestamp).toLocaleTimeString()}</span>
                              <button onClick={(e) => handleDeleteFolder(folder.id, e)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                           </div>
                        </div>
                      );
                   })}
                </div>
             )}
         </div>

         {/* Batch Action Bar */}
         {selectedImageIds.size > 0 && (
            <div className="absolute bottom-24 left-6 right-6 z-30 animate-in slide-in-from-bottom-4">
               <button 
                 onClick={handleProcessSelected}
                 className="w-full bg-slate-900 text-white rounded-2xl py-4 shadow-xl flex items-center justify-center gap-2 font-bold text-sm active:scale-[0.98] transition-all"
               >
                 <Sparkles size={18} className="text-indigo-300"/> 
                 {t.processSelected} ({selectedImageIds.size})
               </button>
            </div>
         )}

         {/* Bottom Nav */}
         {!isDesktopMode && (
            <nav className="glass-nav absolute bottom-0 w-full pb-8 pt-4 px-12 flex justify-between items-center z-10">
              <button onClick={() => setViewMode('folders')} className="flex flex-col items-center gap-1.5 text-indigo-600 relative">
                 <div className="absolute -top-1 w-8 h-1 bg-indigo-600 rounded-full"></div>
                 <Grid size={24} strokeWidth={2.5} />
                 <span className="text-[10px] font-bold tracking-wide">{t.myShops}</span>
              </button>
              <button onClick={() => setViewMode('history')} className="flex flex-col items-center gap-1.5 text-slate-300 active:text-slate-500 transition-colors">
                 <Database size={24} />
                 <span className="text-[10px] font-bold tracking-wide">{t.history}</span>
              </button>
            </nav>
         )}
      </div>
    );
  }

  // --- VIEW: FOLDER DETAIL ---
  if (viewMode === 'folderDetail' && activeFolderId) {
    const folder = folders.find(f => f.id === activeFolderId);
    if (!folder) { setViewMode('folders'); return null; }
    
    const selectedInThisFolder = folder.images.filter(img => selectedImageIds.has(img.id));
    const isAllSelected = selectedInThisFolder.length === folder.images.length && folder.images.length > 0;

    return (
      <div className="flex flex-col h-full bg-white font-sans relative">
         {/* Detail Header */}
         <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
             <button onClick={() => setViewMode('folders')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-full">
                <ArrowLeft size={20} />
             </button>
             <div className="text-center">
                <div className="font-bold text-slate-900 text-sm">{folder.name}</div>
                <div className="text-[10px] text-slate-400">{folder.images.length} {t.photos}</div>
             </div>
             <button onClick={() => toggleFolderSelection(folder.id)} className="text-xs font-bold text-indigo-600">
                {isAllSelected ? t.unselectAll : t.selectAll}
             </button>
         </div>

         {/* Editable Supplier Info Card */}
         <div className="p-4 bg-slate-50 border-b border-slate-100">
             <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{t.sessionHeader}</span>
                    <ScanLine size={14} className="text-slate-400" />
                 </div>
                 <input 
                   className="w-full text-sm font-bold border-none p-0 focus:ring-0 placeholder:text-slate-300" 
                   value={folder.supplier.companyName}
                   onChange={(e) => {
                      const newSupplier = { ...folder.supplier, companyName: e.target.value };
                      setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, name: e.target.value, supplier: newSupplier } : f));
                   }}
                   placeholder={t.companyName}
                 />
                 <div className="flex gap-2 text-xs">
                    <input 
                       className="flex-1 bg-slate-50 rounded px-2 py-1.5 border-none" 
                       value={folder.supplier.contactPerson} 
                       onChange={(e) => {
                          const newSupplier = { ...folder.supplier, contactPerson: e.target.value };
                          setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, supplier: newSupplier } : f));
                       }}
                       placeholder={t.contactPerson}
                    />
                    <input 
                       className="flex-1 bg-slate-50 rounded px-2 py-1.5 border-none" 
                       value={folder.supplier.phone} 
                       onChange={(e) => {
                          const newSupplier = { ...folder.supplier, phone: e.target.value };
                          setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, supplier: newSupplier } : f));
                       }}
                       placeholder={t.phone}
                    />
                 </div>
             </div>
         </div>

         {/* Photo Grid */}
         <div className="flex-1 overflow-y-auto p-1 pb-32">
             <div className="grid grid-cols-3 gap-1">
                {folder.images.map(img => (
                   <div 
                      key={img.id} 
                      onClick={() => toggleImageSelection(img.id)}
                      className={`aspect-square relative cursor-pointer ${selectedImageIds.has(img.id) ? 'opacity-100' : 'opacity-100'}`}
                   >
                      <img src={img.url} className="w-full h-full object-cover" />
                      <div className={`absolute top-1 right-1 w-5 h-5 rounded-full border border-white flex items-center justify-center ${selectedImageIds.has(img.id) ? 'bg-indigo-600' : 'bg-black/20 backdrop-blur-sm'}`}>
                         {selectedImageIds.has(img.id) && <CheckSquare size={12} className="text-white"/>}
                      </div>
                   </div>
                ))}
                
                {/* Add Photo Button (Grid Item) */}
                <label className="aspect-square bg-slate-100 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-200 transition-colors">
                    <Camera size={24} className="mb-1"/>
                    <span className="text-[10px] font-bold">{t.addPhotos}</span>
                    <input type="file" multiple accept="image/*" onChange={handleAddPhotos} className="hidden" ref={fileInputRef} />
                </label>
             </div>
         </div>

         {/* Floating Batch Action */}
         {selectedImageIds.size > 0 && (
            <div className="absolute bottom-6 left-6 right-6 z-30">
               <button 
                 onClick={handleProcessSelected}
                 className="w-full bg-slate-900 text-white rounded-2xl py-4 shadow-xl flex items-center justify-center gap-2 font-bold text-sm active:scale-[0.98] transition-all"
               >
                 <Sparkles size={18} className="text-indigo-300"/> 
                 {t.processSelected} ({selectedImageIds.size})
               </button>
            </div>
         )}
      </div>
    );
  }

  // --- VIEW: HISTORY (EXISTING LIST LOGIC) ---
  return (
      <div className="flex flex-col h-full bg-slate-50 relative">
        {/* Reuse existing list logic structure but adapted for nav */}
        {showExportMenu && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end justify-center pb-8 animate-in slide-in-from-bottom-10 fade-in">
             <div className="bg-white w-[90%] max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
                 <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-lg text-slate-800">{t.exportOptions}</h3>
                    <button onClick={() => setShowExportMenu(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                 </div>
                 {[
                   { id: 'master', label: t.masterData }, 
                   { id: 'quotation', label: t.quotation }, 
                   { id: 'packinglist', label: t.packingList }, 
                   { id: 'invoice', label: t.invoice }
                 ].map((item) => (
                   <div key={item.id} className="flex gap-2">
                       <button onClick={() => handleExport('excel', item.id as any)} className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-green-50 hover:border-green-200 transition-all text-left">
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Database size={16}/></div>
                          <div><div className="font-bold text-slate-800 text-sm">{item.label} .xlsx</div></div>
                       </button>
                   </div>
                 ))}
             </div>
          </div>
        )}

        {isEnriching && (
           <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
              <RefreshCw className="animate-spin text-indigo-600 mb-4" size={40} />
              <p className="font-bold text-lg text-slate-800">AI Enriching...</p>
              <p className="text-sm text-slate-500 mt-1">{enrichProgress.current} / {enrichProgress.total}</p>
           </div>
        )}

        <div className="px-6 py-4 bg-white shadow-sm z-10 sticky top-0 flex justify-between items-center">
          <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  {isSelectMode ? `${t.selected} (${selectedIds.size})` : t.history}
              </h2>
              {!isSelectMode && <p className="text-xs text-slate-500">{products.length} {t.items}</p>}
          </div>
          <div className="flex gap-2">
             {!isDesktopMode && onClose && (
                 <button onClick={onClose} className="text-xs font-bold px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 flex items-center gap-1 hover:bg-slate-200 transition-colors">
                   <Home size={14}/>
                 </button>
             )}
             <button onClick={() => { if(isSelectMode) setSelectedIds(new Set()); setIsSelectMode(!isSelectMode); }} className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${isSelectMode ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-600'}`}>
                {isSelectMode ? t.cancel : t.select}
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Box size={32} className="text-slate-300 mb-2" /><p className="font-medium">No items yet.</p></div>
          ) : (
            products.map((p) => (
              <div key={p.id} onClick={() => isSelectMode && (() => { const s = new Set(selectedIds); if(s.has(p.id)) s.delete(p.id); else s.add(p.id); setSelectedIds(s); })()} className={`bg-white p-3 rounded-xl shadow-sm border flex gap-3 transition-all ${selectedIds.has(p.id) ? 'border-indigo-400 ring-1 ring-indigo-400 bg-indigo-50/10' : 'border-slate-100'}`}>
                {isSelectMode && (<div className="flex items-center justify-center pl-1 pr-2">{selectedIds.has(p.id) ? <CheckSquare className="text-indigo-600" size={20} /> : <Square className="text-slate-300" size={20} />}</div>)}
                <div className="w-20 h-20 shrink-0 rounded-lg bg-slate-50 overflow-hidden border border-slate-100">
                  {p.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImagePlus size={20}/></div>}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-800 text-sm truncate pr-2">{p.sku}</h3>
                      {p.supplier?.companyName && <span className="text-[9px] bg-slate-100 px-1 rounded text-slate-500 truncate max-w-[80px]">{p.supplier.companyName}</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{p.nameEn || p.nameCn}</p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <div className="font-mono font-bold text-indigo-600 text-sm">¥{p.priceRmb}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {isSelectMode ? (
            <div className="absolute bottom-24 w-full px-4 z-30 flex items-center justify-between gap-3">
                <button onClick={() => onDeleteProduct && onDeleteProduct(Array.from(selectedIds))} className="flex flex-col items-center gap-1 text-slate-500 active:text-red-600 bg-white p-3 rounded-full shadow-lg"><Trash2 size={20} /></button>
                <button onClick={handleBulkEnrich} className="flex-1 bg-indigo-600 text-white rounded-xl h-12 flex items-center justify-center gap-2 shadow-lg"><Sparkles size={18} /><span className="font-bold text-sm">{t.aiEnrich}</span></button>
                <button onClick={() => setShowExportMenu(true)} className="flex flex-col items-center gap-1 text-slate-500 active:text-green-600 bg-white p-3 rounded-full shadow-lg"><Download size={20} /></button>
            </div>
        ) : (
            <nav className="glass-nav absolute bottom-0 w-full pb-8 pt-4 px-12 flex justify-between items-center z-20">
              <button onClick={() => setViewMode('folders')} className="flex flex-col items-center gap-1.5 text-slate-300 active:text-indigo-600 transition-colors">
                 <Grid size={24} />
                 <span className="text-[10px] font-bold tracking-wide">{t.myShops}</span>
              </button>
              <button onClick={() => setViewMode('history')} className="flex flex-col items-center gap-1.5 text-indigo-600 relative">
                 <div className="absolute -top-1 w-8 h-1 bg-indigo-600 rounded-full"></div>
                 <Database size={24} strokeWidth={2.5} />
                 <span className="text-[10px] font-bold tracking-wide">{t.history}</span>
              </button>
            </nav>
        )}
      </div>
  );
};

export default MobileEntry;