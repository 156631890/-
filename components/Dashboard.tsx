import React, { useState } from 'react';
import { AppSettings, Product, ProcessingStatus, Language } from '../types';
import { enrichProductData } from '../services/geminiService';
import { Sparkles, Settings, Database, X, Trash2, CheckSquare, Printer, Search, Download, UploadCloud, Home, FileDown } from 'lucide-react';
import MobileEntry from './MobileEntry';
import { translations } from '../utils/i18n';
import { exportExcel } from '../services/export/excelExport';
import { exportPdf } from '../services/export/pdfExport';
import { ExportType } from '../services/export/exportTypes';
import { formatHsCodeReviewWarning, getHsCodeReviewSummary, hasHsCodeReviewIssues } from '../services/export/hsCodeReview';
import { filterProducts } from '../utils/productFilters';
import { calculateProductMetrics, ProductMetrics } from '../utils/productMetrics';
import { normalizeChinaHsCode } from '../utils/hsCode';
import { ProcessingOverlay } from './common/ProcessingOverlay';
import { ProductTable } from './dashboard/ProductTable';

interface DashboardProps {
  products: Product[];
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct?: (ids: string[]) => void;
  onAddProduct: (product: Product) => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  currentLang?: Language;
  onLanguageChange?: (lang: Language) => void;
  onHome?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  products, onUpdateProduct, onDeleteProduct, onAddProduct,
  settings, onSettingsChange, currentLang = settings.language, onLanguageChange, onHome
}) => {
  const t = translations[currentLang];
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const invoiceConfig = settings.invoiceConfig;
  const euroRmbRate = settings.euroRmbRate;
  const freightRateCbm = settings.freightRateCbm;
  const usdRmbRate = settings.usdRmbRate;
  const visibleProducts = filterProducts(products, searchQuery);
  const visibleProductIds = new Set(visibleProducts.map((product) => product.id));
  const visibleSelectedIds = new Set([...selectedIds].filter((id) => visibleProductIds.has(id)));

  const updateSettings = (patch: Partial<AppSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };

  const updateInvoiceConfig = (patch: Partial<AppSettings['invoiceConfig']>) => {
    onSettingsChange({
      ...settings,
      invoiceConfig: { ...settings.invoiceConfig, ...patch }
    });
  };

  const calculateMetrics = (product: Product): ProductMetrics => calculateProductMetrics(product, settings);

  const getExportItems = () => {
    const selectedVisible = visibleProducts.filter((product) => selectedIds.has(product.id));
    if (selectedVisible.length > 0) return selectedVisible;
    return searchQuery ? visibleProducts : products;
  };

  const handleSkippedImages = (skippedImages: number) => {
    if (skippedImages > 0) {
      alert(`${skippedImages} product image(s) could not be exported.`);
    }
  };

  const confirmHsCodeReviewBeforeExport = (items: Product[]) => {
    const summary = getHsCodeReviewSummary(items);
    if (!hasHsCodeReviewIssues(summary)) return true;
    return confirm(formatHsCodeReviewWarning(summary));
  };

  const handleExportExcel = async (type: ExportType) => {
    const items = getExportItems();
    if (items.length === 0) return alert("No products to export.");
    if (!confirmHsCodeReviewBeforeExport(items)) return;
    const result = await exportExcel({ type, products: items, settings });
    handleSkippedImages(result.skippedImages);
  };

  const handleExportPdf = async (type: ExportType) => {
    const items = getExportItems();
    if (items.length === 0) return alert("No products to export.");
    if (!confirmHsCodeReviewBeforeExport(items)) return;
    const result = await exportPdf({ type, products: items, settings });
    handleSkippedImages(result.skippedImages);
  };

  const handleBulkEnrich = async () => {
    setIsBulkProcessing(true);
    const itemsToProcess = visibleProducts.filter((product) => selectedIds.has(product.id));
    let success = 0;
    let failed = 0;
    setBulkProgress({ current: 0, total: itemsToProcess.length });

    for (const [index, product] of itemsToProcess.entries()) {
      try {
        const result = await enrichProductData(product.nameCn);
        const metrics = calculateMetrics({ ...product, ...result });
        onUpdateProduct({ ...product, ...result, ...metrics, hsCodeReviewed: false, status: ProcessingStatus.REVIEW_NEEDED });
        success += 1;
      } catch (error) {
        failed += 1;
        console.error('Failed to enrich product', product.id, error);
      } finally {
        setBulkProgress({ current: index + 1, total: itemsToProcess.length });
      }
    }

    setIsBulkProcessing(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      itemsToProcess.forEach((product) => next.delete(product.id));
      return next;
    });
    alert(`AI enrichment complete. Success: ${success}. Failed: ${failed}.`);
  };

  const handleDeleteVisibleSelected = () => {
    const idsToDelete = Array.from(visibleSelectedIds);
    if (idsToDelete.length === 0) return;
    if (!confirm("Delete?")) return;
    onDeleteProduct?.(idsToDelete);
    setSelectedIds((current) => {
      const next = new Set(current);
      idsToDelete.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleEnrichment = async (product: Product) => {
    setProcessingId(product.id);
    onUpdateProduct({ ...product, status: ProcessingStatus.AI_PROCESSING });
    try {
      const result = await enrichProductData(product.nameCn);
      const metrics = calculateMetrics({ ...product, ...result });
      onUpdateProduct({ ...product, ...result, ...metrics, hsCodeReviewed: false, status: ProcessingStatus.REVIEW_NEEDED });
    } catch (error) {
      console.error('Failed to enrich product', product.id, error);
      onUpdateProduct({ ...product, status: ProcessingStatus.DRAFT });
    } finally {
      setProcessingId(null);
    }
  };

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditForm({ ...product });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const product = products.find((item) => item.id === editingId);
    if (product) {
      const merged = { ...product, ...editForm };
      const normalizedHsCode = normalizeChinaHsCode(merged.hsCode);
      merged.hsCode = normalizedHsCode;
      merged.hsCodeReviewed = Boolean(normalizedHsCode && merged.hsCodeReviewed);
      const metrics = calculateMetrics(merged);
      onUpdateProduct({ ...merged, ...metrics });
    }
    setEditingId(null);
    setEditForm({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const toggleSelection = (productId: string) => {
    const next = new Set(selectedIds);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setSelectedIds(next);
  };

  const toggleAllVisible = () => {
    const allVisibleSelected = visibleProducts.length > 0 && visibleProducts.every((product) => selectedIds.has(product.id));
    if (allVisibleSelected) {
      const next = new Set(selectedIds);
      visibleProducts.forEach((product) => next.delete(product.id));
      setSelectedIds(next);
    } else {
      setSelectedIds(new Set([...selectedIds, ...visibleProducts.map((product) => product.id)]));
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans relative">
      {isBulkProcessing && (
        <ProcessingOverlay text={t.processing} current={bulkProgress.current} total={bulkProgress.total} />
      )}
      {showUploadModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] overflow-hidden flex flex-col">
            <MobileEntry onSave={onAddProduct} isDesktopMode={true} onClose={() => setShowUploadModal(false)} settings={settings} onSettingsChange={onSettingsChange} currentLang={currentLang} onLanguageChange={onLanguageChange} products={products} onUpdateProduct={onUpdateProduct} onDeleteProduct={onDeleteProduct} />
          </div>
        </div>
      )}
      {previewImage && (
        <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center"><h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} className="text-indigo-600" /> {t.invoiceConfig}</h2><button onClick={() => setShowInvoiceModal(false)} className="p-2 hover:bg-slate-100 rounded-full" aria-label="Close invoice configuration" title="Close invoice configuration"><X size={20} /></button></div>
            <div className="p-8 space-y-6">
              <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.companyName}</label><input className="w-full mt-1 border rounded-lg p-3" value={invoiceConfig.sellerName} onChange={e => updateInvoiceConfig({ sellerName: e.target.value })} /></div>
              <div className="flex gap-4"><button onClick={() => { setShowInvoiceModal(false); handleExportExcel('invoice'); }} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Download size={20} /> Excel (.xlsx)</button><button onClick={() => { setShowInvoiceModal(false); handleExportPdf('invoice'); }} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><FileDown size={20} /> PDF (.pdf)</button></div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="p-4 md:px-8 md:py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3"><div className="bg-indigo-600 p-2 rounded-lg text-white"><Database size={20} /></div><div><h1 className="text-lg font-bold text-slate-900">{t.dashboard}</h1><p className="text-xs text-slate-500">{visibleProducts.length} of {products.length} {t.recordsFound}</p></div></div>
          <div className="flex items-center gap-2 flex-wrap">
            {onHome && (<button onClick={onHome} className="px-3 py-2 bg-slate-100 rounded-lg text-slate-600 flex items-center gap-2"><Home size={16} /> {t.backHome}</button>)}
            <button onClick={() => setShowUploadModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg flex items-center gap-2"><UploadCloud size={16} /> {t.newSourcingBatch}</button>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <span className="text-[10px] font-black text-slate-400 px-2 uppercase">Export</span>
              <div className="h-6 w-px bg-slate-200 mx-1"></div>
              <button onClick={() => handleExportExcel('master')} title="Master Excel" className="p-2 hover:bg-white rounded-lg text-slate-600 hover:text-indigo-600"><Database size={18} /></button>
              <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 divide-x">
                <button onClick={() => handleExportExcel('quotation')} className="px-2 py-1.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50">QTN.xlsx</button>
                <button onClick={() => handleExportPdf('quotation')} className="px-2 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50">QTN.pdf</button>
              </div>
              <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 divide-x ml-1">
                <button onClick={() => handleExportExcel('packinglist')} className="px-2 py-1.5 text-[10px] font-bold text-green-600 hover:bg-green-50">PKL.xlsx</button>
                <button onClick={() => handleExportPdf('packinglist')} className="px-2 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50">PKL.pdf</button>
              </div>
              <button onClick={() => setShowInvoiceModal(true)} className="p-2 hover:bg-white rounded-lg text-slate-600" aria-label="Invoice export options" title="Invoice export options"><Printer size={18} /></button>
            </div>
          </div>
        </div>

        <div className="px-4 py-2 md:px-8 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          {visibleSelectedIds.size > 0 ? (
            <div className="flex items-center gap-4 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 w-full md:w-auto">
              <span className="text-sm font-bold text-indigo-700 flex items-center gap-2"><CheckSquare size={16} /> {visibleSelectedIds.size} {t.selected}</span>
              <button onClick={handleBulkEnrich} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Sparkles size={14} /> {t.aiEnrich}</button>
              <button onClick={handleDeleteVisibleSelected} className="text-xs font-bold text-red-600 flex items-center gap-1"><Trash2 size={14} /> {t.delete}</button>
            </div>
          ) : (
            <div className="flex gap-6 text-sm text-slate-500 w-full overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2"><span>EUR:</span><input type="number" value={euroRmbRate} onChange={e => updateSettings({ euroRmbRate: Number(e.target.value) })} className="w-12 border rounded text-center" /></div>
              <div className="flex items-center gap-2"><span>USD:</span><input type="number" value={usdRmbRate} onChange={e => updateSettings({ usdRmbRate: Number(e.target.value) })} className="w-12 border rounded text-center" /></div>
              <div className="flex items-center gap-2"><span>FRT:</span><input type="number" value={freightRateCbm} onChange={e => updateSettings({ freightRateCbm: Number(e.target.value) })} className="w-12 border rounded text-center" /></div>
            </div>
          )}
          <div className="relative w-full md:w-auto"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9 pr-4 py-2 text-sm border rounded-full w-full md:w-64" /></div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-2 md:p-6">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <ProductTable
            products={visibleProducts}
            selectedIds={selectedIds}
            editingId={editingId}
            editForm={editForm}
            processingId={processingId}
            searchQuery={searchQuery}
            labels={{
              productName: t.productName,
              details: t.details,
              cost: t.cost,
              landed: t.landed,
              actions: t.actions,
            }}
            getMetrics={calculateMetrics}
            onToggleSelection={toggleSelection}
            onToggleAll={toggleAllVisible}
            onPreviewImage={setPreviewImage}
            onStartEdit={startEditing}
            onEditChange={(patch) => setEditForm({ ...editForm, ...patch })}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onEnrich={handleEnrichment}
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
