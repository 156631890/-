import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, DEFAULT_APP_SETTINGS, DraftFolder, DraftImage, Language, ManualProductValues, Product, ProcessingStatus } from '../types';
import { analyzeImage, analyzeBusinessCard } from '../services/geminiService';
import { translations } from '../utils/i18n';
import { exportExcel } from '../services/export/excelExport';
import { exportPdf } from '../services/export/pdfExport';
import { ExportType } from '../services/export/exportTypes';
import { isAiImageInputSupported } from '../services/ai/config';
import { ProcessingOverlay } from './common/ProcessingOverlay';
import { ShopFolderList } from './mobile/ShopFolderList';
import { ShopFolderDetail } from './mobile/ShopFolderDetail';
import { MobileHistory } from './mobile/MobileHistory';
import { dbService } from '../services/db';
import { formatHsCodeReviewWarning, getHsCodeReviewSummary, hasHsCodeReviewIssues } from '../services/export/hsCodeReview';
import { removeDraftImagesFromFolder, sortDraftFolders, upsertDraftFolder } from '../utils/draftFolders';
import { createManualProduct } from '../utils/manualProduct';

interface MobileEntryProps {
  onSave: (product: Product) => void | Promise<void>;
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (ids: string[]) => void;
  isDesktopMode?: boolean;
  onClose?: () => void;
  products?: Product[];
  settings?: AppSettings;
  onSettingsChange?: (settings: AppSettings) => void;
  currentLang?: Language;
  onLanguageChange?: (lang: Language) => void;
}

const MobileEntry: React.FC<MobileEntryProps> = ({ 
  onSave, onUpdateProduct, onDeleteProduct, isDesktopMode, onClose, products = [], 
  settings = DEFAULT_APP_SETTINGS, onSettingsChange, currentLang = settings.language, onLanguageChange
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
  const canAnalyzeImages = isAiImageInputSupported();

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    dbService.getDraftFolders()
      .then((storedFolders) => {
        if (!cancelled && isMounted.current) {
          setFolders(sortDraftFolders(storedFolders));
        }
      })
      .catch((error) => {
        console.error('Failed to load draft folders:', error);
      });
    return () => { cancelled = true; };
  }, []);

  // --- HELPERS ---

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    return String(error || 'Unknown error');
  };

  const calculateMetrics = (p: Partial<Product>) => {
    const cbm = (p.boxLength && p.boxWidth && p.boxHeight) ? (p.boxLength * p.boxWidth * p.boxHeight) / 1000000 : 0;
    const priceStockUsd = (p.priceRmb || 0) > 0 ? (p.priceRmb || 0) / settings.usdRmbRate : 0;
    return { cbm: Number(cbm.toFixed(4)), priceStockUsd: Number(priceStockUsd.toFixed(3)) };
  };

  const updateDraftFolders = (updater: (current: DraftFolder[]) => DraftFolder[]) => {
    setFolders((current) => {
      const next = sortDraftFolders(updater(current));
      dbService.saveDraftFolders(next).catch((error) => {
        console.error('Failed to save draft folders:', error);
        if (isMounted.current) alert('Draft folders could not be saved. Please check storage space.');
      });
      return next;
    });
  };

  const confirmHsCodeReviewBeforeExport = (items: Product[]) => {
    const summary = getHsCodeReviewSummary(items);
    if (!hasHsCodeReviewIssues(summary)) return true;
    return confirm(formatHsCodeReviewWarning(summary));
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
        if (!isMounted.current) return;
        const info = await analyzeBusinessCard(base64);
        if (!isMounted.current) return;
        const newFolder: DraftFolder = {
          id: Date.now().toString(),
          name: info.companyName || info.contactPerson || info.phone || "New Shop " + (folders.length + 1),
          supplier: info,
          images: [],
          timestamp: Date.now()
        };
        updateDraftFolders(prev => upsertDraftFolder(prev, newFolder));
        setActiveFolderId(newFolder.id);
        setViewMode('folderDetail');
      } catch (err) {
        console.error(err);
        if (isMounted.current) alert(`Business card analysis failed: ${getErrorMessage(err)}`);
      } finally {
        if (isMounted.current) setIsProcessing(false);
      }
    }
  };

  const handleCreateManualFolder = () => {
    const newFolder: DraftFolder = {
      id: Date.now().toString(),
      name: "New Shop " + (folders.length + 1),
      supplier: {
        companyName: '',
        contactPerson: '',
        phone: '',
        address: '',
      },
      images: [],
      timestamp: Date.now()
    };
    updateDraftFolders(prev => upsertDraftFolder(prev, newFolder));
    setActiveFolderId(newFolder.id);
    setViewMode('folderDetail');
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeFolderId) return;
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const newImages: DraftImage[] = [];
      for (const file of files) {
        const b64 = await processImageFile(file);
        if (!isMounted.current) return;
        newImages.push({
          id: Math.random().toString(36).substr(2, 9) + Date.now(),
          url: b64,
          timestamp: Date.now()
        });
      }
      if (!isMounted.current) return;
      updateDraftFolders(prev => prev.map(f => f.id === activeFolderId ? { ...f, images: [...f.images, ...newImages] } : f));
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
    if (!activeFolderId) return;
    const activeFolder = folders.find(f => f.id === activeFolderId);
    if (!activeFolder) return;

    const queue = activeFolder.images
      .filter(img => selectedImageIds.has(img.id))
      .map(img => ({ img, supplier: activeFolder.supplier }));
    if (queue.length === 0) return;

    setIsProcessing(true);
    let processed = 0; const total = queue.length;
    let success = 0;
    let failed = 0;
    
    try {
      for (const item of queue) {
        if (!isMounted.current) break;
        setProcessingStatus({ current: processed + 1, total, text: `Analyzing item ${processed + 1}/${total}` });
        try {
          const aiData = await analyzeImage(item.img.url);
          if (!isMounted.current) return;
          const newProduct: Product = {
            id: Date.now().toString() + "_" + Math.random().toString(36).substr(2, 5),
            sku: `YW-${Math.floor(Math.random() * 90000) + 10000}`,
            photoUrl: item.img.url,
            supplier: item.supplier,
            nameCn: aiData.nameCn,
            nameEn: aiData.nameEn,
            materialEn: aiData.materialEn,
            priceRawText: aiData.priceRawText,
            priceCurrency: aiData.priceCurrency,
            priceUnit: aiData.priceUnit,
            priceUnitQuantity: aiData.priceUnitQuantity,
            priceRmb: aiData.priceRmb,
            priceNormalizationNote: aiData.priceNormalizationNote,
            moq: aiData.moq,
            shopNo: item.supplier.address || "TBD",
            hsCode: aiData.hsCode,
            hsCodeReviewed: false,
            boxLength: aiData.boxLength,
            boxWidth: aiData.boxWidth,
            boxHeight: aiData.boxHeight,
            pcsPerBox: aiData.pcsPerBox,
            status: ProcessingStatus.DRAFT,
            timestamp: Date.now()
          };
          await onSave({ ...newProduct, ...calculateMetrics(newProduct) });
          updateDraftFolders(prev => removeDraftImagesFromFolder(prev, activeFolderId, [item.img.id]));
          setSelectedImageIds(prev => { const next = new Set(prev); next.delete(item.img.id); return next; });
          success++;
        } catch (e) {
          failed++;
          console.error('Failed to process selected image:', e);
          setProcessingStatus({ current: processed + 1, total, text: `Failed: ${getErrorMessage(e)}` });
        }
        processed++;
      }
    } finally {
      if (isMounted.current) setIsProcessing(false);
    }
    if (isMounted.current) { alert(`Batch complete. Success: ${success}. Failed: ${failed}.`); setViewMode('history'); }
  };

  const handleSaveManualProduct = async (values: ManualProductValues) => {
    if (!activeFolderId) return;
    const activeFolder = folders.find(f => f.id === activeFolderId);
    if (!activeFolder) return;
    const selectedImage = activeFolder.images.find(img => selectedImageIds.has(img.id));
    if (!selectedImage) return alert('Select one product photo before saving manual entry.');

    const product = createManualProduct({
      folder: activeFolder,
      imageUrl: selectedImage.url,
      id: Date.now().toString() + "_" + Math.random().toString(36).substr(2, 5),
      sku: `YW-${Math.floor(Math.random() * 90000) + 10000}`,
      timestamp: Date.now(),
      settings,
      values,
    });
    await onSave(product);
    updateDraftFolders(prev => removeDraftImagesFromFolder(prev, activeFolderId, [selectedImage.id]));
    setSelectedImageIds(prev => { const next = new Set(prev); next.delete(selectedImage.id); return next; });
    setViewMode('history');
  };

  const handleExport = async (format: 'excel' | 'pdf', type: ExportType) => {
    const items = selectedIds.size > 0 ? products.filter(p => selectedIds.has(p.id)) : products;
    if (items.length === 0) return alert("No products to export.");
    if (!confirmHsCodeReviewBeforeExport(items)) return;

    const exportSettings = settings || DEFAULT_APP_SETTINGS;
    const result = format === 'excel'
      ? await exportExcel({ type, products: items, settings: exportSettings })
      : await exportPdf({ type, products: items, settings: exportSettings });
    if (!isMounted.current) return;

    if (result.skippedImages > 0) {
      alert(`${result.skippedImages} product image(s) could not be exported.`);
    }
    setShowExportMenu(false);
  };

  const handleDeleteSelectedHistory = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected product(s)?`)) return;
    onDeleteProduct?.(ids);
    setSelectedIds(new Set());
  };
  // --- RENDER VIEWS ---

  if (isProcessing) {
    return (
      <ProcessingOverlay text={processingStatus.text} current={processingStatus.current} total={processingStatus.total} />
    );
  }

  if (viewMode === 'folders') {
    return (
      <ShopFolderList
        folders={folders}
        currentLang={currentLang}
        labels={t}
        onToggleLanguage={() => {
          const language = currentLang === 'en' ? 'zh' : 'en';
          if (onSettingsChange) {
            onSettingsChange({ ...settings, language });
          } else {
            onLanguageChange?.(language);
          }
        }}
        canAnalyzeImages={canAnalyzeImages}
        onCreateFolder={handleCreateFolder}
        onCreateManualFolder={handleCreateManualFolder}
        onOpenFolder={(folderId) => { setActiveFolderId(folderId); setViewMode('folderDetail'); }}
        cardInputRef={cardInputRef}
        isDesktopMode={isDesktopMode}
        onOpenHistory={() => setViewMode('history')}
      />
    );
  }

  if (viewMode === 'folderDetail' && activeFolderId) {
    const folder = folders.find(f => f.id === activeFolderId);
    if (!folder) { setViewMode('folders'); return null; }

    return (
      <ShopFolderDetail
        folder={folder}
        selectedImageIds={selectedImageIds}
        labels={t}
        fileInputRef={fileInputRef}
        onBack={() => setViewMode('folders')}
        onToggleSelectAll={handleToggleSelectAllInFolder}
        onToggleImage={toggleImageSelection}
        onAddPhotos={handleAddPhotos}
        onProcessSelected={handleProcessSelected}
        onSaveManualProduct={handleSaveManualProduct}
        canAnalyzeImages={canAnalyzeImages}
      />
    );
  }

  // History / List View
  return (
    <MobileHistory
      products={products}
      selectedIds={selectedIds}
      isSelectMode={isSelectMode}
      showExportMenu={showExportMenu}
      labels={t}
      onToggleSelectMode={() => setIsSelectMode(!isSelectMode)}
      onToggleProduct={(productId) => {
        const s = new Set(selectedIds);
        if (s.has(productId)) s.delete(productId);
        else s.add(productId);
        setSelectedIds(s);
      }}
      setShowExportMenu={setShowExportMenu}
      onExport={handleExport}
      onDeleteSelected={handleDeleteSelectedHistory}
      canDeleteSelected={selectedIds.size > 0 && Boolean(onDeleteProduct)}
      onOpenFolders={() => setViewMode('folders')}
    />
  );
};

export default MobileEntry;
