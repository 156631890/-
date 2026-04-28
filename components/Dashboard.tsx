
import React, { useState } from 'react';
import { AppSettings, Product, ProcessingStatus, Language } from '../types';
import { enrichProductData } from '../services/geminiService';
import { Sparkles, RefreshCw, Settings, Database, Edit, Save as SaveIcon, X, Trash2, CheckSquare, Square, Printer, Search, Download, Package, Box as BoxIcon, Plus, UploadCloud, ZoomIn, FileText, Globe, Home, FileDown, ExternalLink } from 'lucide-react';
import MobileEntry from './MobileEntry';
import { translations } from '../utils/i18n';

// Declare global libraries
declare const ExcelJS: any;
declare const saveAs: any;
declare const jspdf: any;

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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const invoiceConfig = settings.invoiceConfig;
  const euroRmbRate = settings.euroRmbRate;
  const freightRateCbm = settings.freightRateCbm;
  const usdRmbRate = settings.usdRmbRate;

  const updateSettings = (patch: Partial<AppSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };

  const updateInvoiceConfig = (patch: Partial<AppSettings['invoiceConfig']>) => {
    onSettingsChange({
      ...settings,
      invoiceConfig: { ...settings.invoiceConfig, ...patch }
    });
  };

  const calculateMetrics = (p: Product) => {
    const rate = euroRmbRate;
    const freight = freightRateCbm;
    const usdRate = usdRmbRate;
    const cbm = (p.boxLength && p.boxWidth && p.boxHeight) ? (p.boxLength * p.boxWidth * p.boxHeight) / 1000000 : 0;
    const freightPerPc = (cbm > 0 && p.pcsPerBox > 0) ? (freight * cbm) / p.pcsPerBox : 0;
    const baseCostEuro = p.priceRmb > 0 ? p.priceRmb / rate : 0;
    const dutyCost = baseCostEuro * ((p.taxRate || 0) / 100);
    const landedCostEuro = baseCostEuro + freightPerPc + dutyCost;
    const priceStockUsd = p.priceRmb > 0 ? p.priceRmb / usdRate : 0;
    return {
      cbm: Number(cbm.toFixed(4)),
      freightPerPc: Number(freightPerPc.toFixed(4)),
      landedCostEuro: Number(landedCostEuro.toFixed(3)),
      priceStockUsd: Number(priceStockUsd.toFixed(3)),
    };
  };

  const generateExcel = async (exportType: 'master' | 'packinglist' | 'invoice' | 'quotation') => {
    if (typeof ExcelJS === 'undefined') return alert("ExcelJS not loaded.");
    const items = selectedIds.size > 0 ? products.filter(p => selectedIds.has(p.id)) : products;
    if (items.length === 0) return alert("No products to export.");
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(exportType.toUpperCase());
    const centerStyle = { vertical: 'middle', horizontal: 'center', wrapText: true };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    if (exportType === 'invoice') {
       sheet.columns = [
         { key: 'no', width: 5 }, { key: 'sku', width: 12 }, { key: 'desc', width: 40 },
         { key: 'hs', width: 15 }, { key: 'ctns', width: 8 }, { key: 'pkg', width: 10 },
         { key: 'qty', width: 10 }, { key: 'unit', width: 8 }, { key: 'price', width: 12 },
         { key: 'amount', width: 15 }
       ];
       sheet.mergeCells('A1:J1'); sheet.getCell('A1').value = invoiceConfig.sellerName;
       sheet.getCell('A1').font = { bold: true, size: 16 }; sheet.getCell('A1').alignment = centerStyle;
       sheet.mergeCells('A6:J6'); sheet.getCell('A6').value = "COMMERCIAL INVOICE"; sheet.getCell('A6').font = { bold: true, size: 20 };
       
       const headerRow = sheet.getRow(16);
       headerRow.values = ['No.', 'Item NO', 'Description', 'HS CODE', 'CTNS', 'Pkg', 'QTY', 'Unit', 'Price(¥)', 'Amount(¥)'];
       headerRow.font = { bold: true }; headerRow.alignment = centerStyle;
       
       items.forEach((p, i) => {
         const cQty = Math.ceil(p.moq / (p.pcsPerBox || 1)) || 1;
         const row = sheet.addRow([i+1, p.sku, p.nameEn||p.nameCn, p.hsCode, cQty, p.pcsPerBox, cQty*p.pcsPerBox, 'PCS', p.priceRmb, p.priceRmb * cQty * p.pcsPerBox]);
         row.eachCell((c:any) => { c.border = borderStyle; });
       });
    } else {
       sheet.columns = [
         { header: 'Image', key: 'image', width: 20 },
         { header: 'No.', key: 'no', width: 8 },
         { header: 'SKU', key: 'sku', width: 15 },
         { header: 'Description', key: 'desc', width: 40 },
         { header: 'HS Code', key: 'hs', width: 15 },
         { header: 'Qty', key: 'qty', width: 12 },
         { header: 'Price (USD)', key: 'price', width: 15 },
         { header: 'Total (USD)', key: 'total', width: 18 }
       ];
       sheet.getRow(1).font = { bold: true }; sheet.getRow(1).height = 30; sheet.getRow(1).alignment = centerStyle;

       items.forEach((p, i) => {
         const m = calculateMetrics(p);
         const rowIndex = i + 2;
         const qty = Math.ceil(p.moq / (p.pcsPerBox || 1)) * (p.pcsPerBox || 1);
         const row = sheet.addRow({ no: i+1, sku: p.sku, desc: p.nameEn||p.nameCn, hs: p.hsCode, qty: qty, price: m.priceStockUsd, total: m.priceStockUsd * qty });
         row.height = 110; row.alignment = centerStyle;
         row.eachCell((c:any) => { c.border = borderStyle; });

         if (p.photoUrl && p.photoUrl.startsWith('data:image')) {
            try {
              const base64 = p.photoUrl.split(',')[1];
              const imageId = workbook.addImage({ base64, extension: 'jpeg' });
              sheet.addImage(imageId, { 
                 tl: { col: 0, row: rowIndex - 1 }, 
                 br: { col: 1, row: rowIndex },
                 editAs: 'twoCell' 
              });
            } catch (e) {}
         }
       });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Yiwu_${exportType}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const generatePDF = async (type: 'quotation' | 'packinglist' | 'invoice') => {
     if (typeof jspdf === 'undefined') return alert("PDF library not loaded.");
     const items = selectedIds.size > 0 ? products.filter(p => selectedIds.has(p.id)) : products;
     if (items.length === 0) return;

     const { jsPDF } = jspdf;
     const doc = new jsPDF('l', 'mm', 'a4'); 
     
     doc.setFontSize(20); doc.text(type.toUpperCase(), 14, 20);
     doc.setFontSize(10); doc.text(invoiceConfig.sellerName, 14, 28);
     doc.text(`Date: ${new Date().toLocaleDateString()}`, 250, 20, { align: 'right' });

     const head = type === 'quotation' 
        ? [['Image', 'No.', 'SKU', 'Description', 'HS Code', 'Qty', 'Price(USD)', 'Total(USD)']]
        : [['Image', 'No.', 'SKU', 'Description', 'Qty', 'Cartons', 'CBM', 'G.W']];

     const body = items.map((p, i) => {
        const m = calculateMetrics(p);
        const ctns = Math.ceil(p.moq / (p.pcsPerBox || 1)) || 1;
        const qty = ctns * (p.pcsPerBox || 1);
        return type === 'quotation'
          ? ['', i+1, p.sku, p.nameEn || p.nameCn, p.hsCode, qty, `$${m.priceStockUsd}`, `$${(m.priceStockUsd * qty).toFixed(2)}`]
          : ['', i+1, p.sku, p.nameEn || p.nameCn, qty, ctns, (m.cbm * ctns).toFixed(3), ((p.gwKg || 0) * ctns).toFixed(2)];
     });

     (doc as any).autoTable({
        head: head,
        body: body,
        startY: 35,
        rowPageBreak: 'avoid',
        styles: { cellPadding: 2, fontSize: 8, valign: 'middle', halign: 'center' },
        columnStyles: { 0: { cellWidth: 30 }, 3: { halign: 'left' } },
        didDrawCell: (data: any) => {
           if (data.column.index === 0 && data.cell.section === 'body') {
              const p = items[data.row.index];
              if (p.photoUrl) {
                doc.addImage(p.photoUrl, 'JPEG', data.cell.x + 2, data.cell.y + 2, 26, 26);
              }
           }
        },
        bodyStyles: { minCellHeight: 30 }
     });

     doc.save(`Yiwu_${type}_${Date.now()}.pdf`);
  };

  const handleBulkEnrich = async () => {
    setIsBulkProcessing(true);
    const itemsToProcess = products.filter(p => selectedIds.has(p.id));
    for (const product of itemsToProcess) {
       try {
         const result = await enrichProductData(product.nameCn);
         const metrics = calculateMetrics({ ...product, ...result });
         onUpdateProduct({ ...product, ...result, ...metrics, status: ProcessingStatus.REVIEW_NEEDED });
       } catch (e) {}
    }
    setIsBulkProcessing(false); setSelectedIds(new Set()); alert(t.batchComplete);
  };

  const handleEnrichment = async (product: Product) => {
    setProcessingId(product.id);
    onUpdateProduct({ ...product, status: ProcessingStatus.AI_PROCESSING });
    try {
      const result = await enrichProductData(product.nameCn);
      const metrics = calculateMetrics({ ...product, ...result });
      onUpdateProduct({ ...product, ...result, ...metrics, status: ProcessingStatus.REVIEW_NEEDED });
    } catch (error) { onUpdateProduct({ ...product, status: ProcessingStatus.DRAFT });
    } finally { setProcessingId(null); }
  };

  const startEditing = (product: Product) => { setEditingId(product.id); setEditForm({ ...product }); };
  const saveEdit = () => {
    if (!editingId) return;
    const product = products.find(p => p.id === editingId);
    if (product) { const merged = { ...product, ...editForm }; const metrics = calculateMetrics(merged); onUpdateProduct({ ...merged, ...metrics }); }
    setEditingId(null); setEditForm({});
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans relative">
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
            <div className="p-6 border-b flex justify-between items-center"><h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} className="text-indigo-600"/> {t.invoiceConfig}</h2><button onClick={() => setShowInvoiceModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button></div>
            <div className="p-8 space-y-6">
               <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.companyName}</label><input className="w-full mt-1 border rounded-lg p-3" value={invoiceConfig.sellerName} onChange={e => updateInvoiceConfig({ sellerName: e.target.value })} /></div>
               <div className="flex gap-4"><button onClick={() => { setShowInvoiceModal(false); generateExcel('invoice'); }} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Download size={20} /> Excel (.xlsx)</button><button onClick={() => { setShowInvoiceModal(false); generatePDF('invoice'); }} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><FileDown size={20} /> PDF (.pdf)</button></div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="p-4 md:px-8 md:py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3"><div className="bg-indigo-600 p-2 rounded-lg text-white"><Database size={20} /></div><div><h1 className="text-lg font-bold text-slate-900">{t.dashboard}</h1><p className="text-xs text-slate-500">{products.length} {t.recordsFound}</p></div></div>
          <div className="flex items-center gap-2 flex-wrap">
             {onHome && (<button onClick={onHome} className="px-3 py-2 bg-slate-100 rounded-lg text-slate-600 flex items-center gap-2"><Home size={16}/> {t.backHome}</button>)}
             <button onClick={() => setShowUploadModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg flex items-center gap-2"><UploadCloud size={16} /> {t.newSourcingBatch}</button>
             
             <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <span className="text-[10px] font-black text-slate-400 px-2 uppercase">Export</span>
                <div className="h-6 w-px bg-slate-200 mx-1"></div>
                <button onClick={() => generateExcel('master')} title="Master Excel" className="p-2 hover:bg-white rounded-lg text-slate-600 hover:text-indigo-600"><Database size={18} /></button>
                <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 divide-x">
                   <button onClick={() => generateExcel('quotation')} className="px-2 py-1.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50">QTN.xlsx</button>
                   <button onClick={() => generatePDF('quotation')} className="px-2 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50">QTN.pdf</button>
                </div>
                <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 divide-x ml-1">
                   <button onClick={() => generateExcel('packinglist')} className="px-2 py-1.5 text-[10px] font-bold text-green-600 hover:bg-green-50">PKL.xlsx</button>
                   <button onClick={() => generatePDF('packinglist')} className="px-2 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50">PKL.pdf</button>
                </div>
                <button onClick={() => setShowInvoiceModal(true)} className="p-2 hover:bg-white rounded-lg text-slate-600"><Printer size={18}/></button>
             </div>
          </div>
        </div>
        
        <div className="px-4 py-2 md:px-8 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
           {selectedIds.size > 0 ? (
             <div className="flex items-center gap-4 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 w-full md:w-auto">
                <span className="text-sm font-bold text-indigo-700 flex items-center gap-2"><CheckSquare size={16} /> {selectedIds.size} {t.selected}</span>
                <button onClick={handleBulkEnrich} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Sparkles size={14}/> {t.aiEnrich}</button>
                <button onClick={() => { if(confirm("Delete?")) onDeleteProduct?.(Array.from(selectedIds)); setSelectedIds(new Set()); }} className="text-xs font-bold text-red-600 flex items-center gap-1"><Trash2 size={14}/> {t.delete}</button>
             </div>
           ) : (
             <div className="flex gap-6 text-sm text-slate-500 w-full overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2"><span>EUR:</span><input type="number" value={euroRmbRate} onChange={e=>updateSettings({ euroRmbRate: Number(e.target.value) })} className="w-12 border rounded text-center"/></div>
                <div className="flex items-center gap-2"><span>USD:</span><input type="number" value={usdRmbRate} onChange={e=>updateSettings({ usdRmbRate: Number(e.target.value) })} className="w-12 border rounded text-center"/></div>
                <div className="flex items-center gap-2"><span>FRT:</span><input type="number" value={freightRateCbm} onChange={e=>updateSettings({ freightRateCbm: Number(e.target.value) })} className="w-12 border rounded text-center"/></div>
             </div>
           )}
           <div className="relative w-full md:w-auto"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder={t.searchPlaceholder} className="pl-9 pr-4 py-2 text-sm border rounded-full w-full md:w-64" /></div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-2 md:p-6">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b">
               <tr>
                 <th className="px-6 py-4 w-10"><button onClick={() => selectedIds.size === products.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(products.map(p=>p.id)))} className="text-slate-400">{selectedIds.size === products.length ? <CheckSquare size={18}/> : <Square size={18}/>}</button></th>
                 <th className="px-4 py-3">{t.productName}</th>
                 <th className="px-4 py-3">{t.details}</th>
                 <th className="px-4 py-3 text-right">{t.cost}</th>
                 <th className="px-4 py-3 text-right">{t.landed}</th>
                 <th className="px-6 py-3 text-center">{t.actions}</th>
               </tr>
            </thead>
            <tbody className="divide-y">
               {products.map(p => {
                 const m = calculateMetrics(p); const isEditing = editingId === p.id; const isSelected = selectedIds.has(p.id);
                 return (
                   <tr key={p.id} className={`${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                     <td className="px-6 py-4"><button onClick={() => { const s = new Set(selectedIds); if(s.has(p.id)) s.delete(p.id); else s.add(p.id); setSelectedIds(s); }} className={isSelected ? 'text-indigo-600' : 'text-slate-300'}><CheckSquare size={18}/></button></td>
                     <td className="px-4 py-4"><div className="flex gap-4"><img src={p.photoUrl} onClick={()=>setPreviewImage(p.photoUrl)} className="w-16 h-16 rounded border object-cover cursor-pointer bg-white" /><div><div className="font-bold">{p.sku}</div><div className="text-[10px] text-slate-500">{p.nameCn}</div></div></div></td>
                     <td className="px-4 py-4 max-w-[200px] truncate">
                        <div className="flex flex-col gap-1">
                          {isEditing ? <input className="w-full border p-1" value={editForm.nameEn} onChange={e=>setEditForm({...editForm, nameEn: e.target.value})}/> : p.nameEn || "-"}
                          {/** Mandatory Grounding URLs display as per guidelines */}
                          {p.groundingUrls && p.groundingUrls.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.groundingUrls.map((link, idx) => (
                                <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-500 hover:underline flex items-center gap-0.5" title={link.title}>
                                  <Globe size={8} /> Source {idx + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                     </td>
                     <td className="px-4 py-4 text-right font-mono">¥{p.priceRmb}</td>
                     <td className="px-4 py-4 text-right font-mono text-emerald-600 font-bold">€{m.landedCostEuro.toFixed(2)}</td>
                     <td className="px-6 py-4">
                        <div className="flex justify-center gap-1">
                          {isEditing ? (<><button onClick={saveEdit} className="p-1.5 bg-green-100 text-green-700 rounded"><SaveIcon size={14}/></button><button onClick={()=>setEditingId(null)} className="p-1.5 bg-red-100 text-red-700 rounded"><X size={14}/></button></>) : (<><button onClick={()=>handleEnrichment(p)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded"><Sparkles size={14}/></button><button onClick={()=>startEditing(p)} className="p-1.5 bg-slate-100 text-slate-600 rounded"><Edit size={14}/></button></>)}
                        </div>
                     </td>
                   </tr>
                 );
               })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
