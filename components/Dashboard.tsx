import React, { useState } from 'react';
import { Product, ProcessingStatus, Language } from '../types';
import { enrichProductData } from '../services/geminiService';
import { Sparkles, RefreshCw, Settings, Database, Edit, Save as SaveIcon, X, Trash2, CheckSquare, Square, Printer, Search, Download, Package, Box as BoxIcon, Plus, UploadCloud, ZoomIn, FileText, Globe, Home, Menu } from 'lucide-react';
import MobileEntry from './MobileEntry';
import { translations } from '../utils/i18n';

// Declare ExcelJS and saveAs globally since we loaded them via CDN
declare const ExcelJS: any;
declare const saveAs: any;

interface DashboardProps {
  products: Product[];
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct?: (ids: string[]) => void;
  onAddProduct: (product: Product) => void;
  currentLang?: Language;
  onLanguageChange?: (lang: Language) => void;
  onHome?: () => void;
}

const DEFAULT_INVOICE_CONFIG = {
  sellerName: "YiWu Edas Import and Export Co., Ltd",
  sellerAddress: "Room 301, 3rd Floor, NO. 16, DaShi Road, FoTang Town, YiWu City, Zhejiang, China",
  sellerPhone: "86-579-85569925",
  sellerEmail: "info@yiwudiyasi.com",
  buyerInfo: "BERNARDI GROUP PTY LTD\nSHOP 4, 159-173 LACHLAN STREET\nFORBES NSW 2871\nAUSTRALIA",
  invoiceNo: "20250712001",
  date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }),
  sailing: "ALS CLIVIA/001S",
  containerNo: "CMAU9593405",
  sealNo: "R6953832",
  bankBeneficiary: "YiWu Edas Import and Export Co., Ltd",
  bankName: "TED BANK, Yiwu Branch",
  bankAddress: "TED Address, Yiwu, China",
  bankSwift: "TEDXXXX",
  bankAccount: "TED-ACCOUNT-NUMBER",
};

const Dashboard: React.FC<DashboardProps> = ({ 
  products, onUpdateProduct, onDeleteProduct, onAddProduct, 
  currentLang = 'en', onLanguageChange, onHome 
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
  const [invoiceConfig, setInvoiceConfig] = useState(DEFAULT_INVOICE_CONFIG);

  const [euroRmbRate, setEuroRmbRate] = useState<number>(7.8);
  const [freightRateCbm, setFreightRateCbm] = useState<number>(150);
  const [usdRmbRate, setUsdRmbRate] = useState<number>(7.2); 
  const [vatRate, setVatRate] = useState<number>(21);

  const calculateMetrics = (p: Product, overrides?: { euroRate?: number, freight?: number, vat?: number }) => {
    const rate = overrides?.euroRate || euroRmbRate;
    const freight = overrides?.freight || freightRateCbm;
    const vat = overrides?.vat || vatRate;
    const usdRate = usdRmbRate;

    const cbm = (p.boxLength && p.boxWidth && p.boxHeight) 
      ? (p.boxLength * p.boxWidth * p.boxHeight) / 1000000 
      : 0;
    const cbf = cbm * 35.315;
    const gwLb = (p.gwKg || 0) * 2.2046;
    const freightPerPc = (cbm > 0 && p.pcsPerBox > 0) ? (freight * cbm) / p.pcsPerBox : 0;
    const baseCostEuro = p.priceRmb > 0 ? p.priceRmb / rate : 0;
    const dutyCost = baseCostEuro * ((p.taxRate || 0) / 100);
    const landedCostEuro = baseCostEuro + freightPerPc + dutyCost;
    const priceSpainEuro = landedCostEuro * 1.2;
    const priceStockUsd = p.priceRmb > 0 ? p.priceRmb / usdRate : 0;

    return {
      cbm: Number(cbm.toFixed(4)),
      cbf: Number(cbf.toFixed(4)),
      gwLb: Number(gwLb.toFixed(2)),
      freightPerPc: Number(freightPerPc.toFixed(4)),
      landedCostEuro: Number(landedCostEuro.toFixed(3)),
      priceSpainEuro: Number(priceSpainEuro.toFixed(2)),
      priceStockUsd: Number(priceStockUsd.toFixed(3)),
      exRateEuroRmb: rate, freightRate: freight, vatRate: vat
    };
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) { setSelectedIds(new Set()); } else { setSelectedIds(new Set(products.map(p => p.id))); }
  };
  const toggleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) { newSet.delete(id); } else { newSet.add(id); }
    setSelectedIds(newSet);
  };
  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) {
      if (onDeleteProduct) { onDeleteProduct(Array.from(selectedIds)); setSelectedIds(new Set()); }
    }
  };
  const handleBulkEnrich = async () => {
    setIsBulkProcessing(true);
    const itemsToProcess = products.filter(p => selectedIds.has(p.id));
    for (const product of itemsToProcess) {
       try {
         const result = await enrichProductData(product.nameCn);
         const metrics = calculateMetrics({ ...product, ...result });
         onUpdateProduct({ ...product, ...result, ...metrics, status: ProcessingStatus.REVIEW_NEEDED });
       } catch (e) { console.error(`Failed to enrich ${product.id}`, e); }
    }
    setIsBulkProcessing(false); setSelectedIds(new Set()); alert(t.batchComplete);
  };
  const handleEnrichment = async (product: Product) => {
    if (!process.env.API_KEY) return alert("API Key missing");
    setProcessingId(product.id);
    onUpdateProduct({ ...product, status: ProcessingStatus.AI_PROCESSING });
    try {
      const result = await enrichProductData(product.nameCn);
      const metrics = calculateMetrics({ ...product, ...result });
      onUpdateProduct({ ...product, ...result, ...metrics, status: ProcessingStatus.REVIEW_NEEDED });
    } catch (error) { alert("AI Enrichment failed."); onUpdateProduct({ ...product, status: ProcessingStatus.DRAFT });
    } finally { setProcessingId(null); }
  };
  const startEditing = (product: Product) => { setEditingId(product.id); setEditForm({ ...product }); };
  const saveEdit = () => {
    if (!editingId) return;
    const product = products.find(p => p.id === editingId);
    if (product) { const merged = { ...product, ...editForm }; const metrics = calculateMetrics(merged); onUpdateProduct({ ...merged, ...metrics }); }
    setEditingId(null); setEditForm({});
  };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const generateExcel = async (exportType: 'master' | 'packinglist' | 'invoice' | 'quotation') => {
     if (typeof ExcelJS === 'undefined') return alert("ExcelJS library not loaded. Please check internet connection.");
     if (products.length === 0) return alert("No products to export.");
     
     const workbook = new ExcelJS.Workbook();
     const sheet = workbook.addWorksheet(exportType === 'invoice' ? 'INVOICE' : (exportType === 'quotation' ? 'QUOTATION' : 'Sheet1'));
     const centerStyle = { vertical: 'middle', horizontal: 'center', wrapText: true };
     const leftStyle = { vertical: 'middle', horizontal: 'left', wrapText: true };
     const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

     if (exportType === 'invoice') {
        // [Existing Invoice Code Logic - No Images]
        sheet.columns = [
          { key: 'no', width: 5 }, { key: 'sku', width: 12 }, { key: 'desc', width: 40 },
          { key: 'hs', width: 15 }, { key: 'ctns', width: 8 }, { key: 'pkg', width: 15 },
          { key: 'qty', width: 10 }, { key: 'unit', width: 6 }, { key: 'price', width: 12 },
          { key: 'amount', width: 15 }, { key: 'gwCtn', width: 10 }, { key: 'totalGw', width: 12 },
          { key: 'cbmCtn', width: 10 }, { key: 'totalCbm', width: 12 },
        ];
        sheet.mergeCells('A1:N1'); sheet.getCell('A1').value = invoiceConfig.sellerName;
        sheet.getCell('A1').font = { bold: true, size: 16 }; sheet.getCell('A1').alignment = centerStyle;
        sheet.mergeCells('A2:N2'); sheet.getCell('A2').value = invoiceConfig.sellerName; sheet.getCell('A2').alignment = centerStyle;
        sheet.mergeCells('A3:N3'); sheet.getCell('A3').value = invoiceConfig.sellerAddress; sheet.getCell('A3').alignment = centerStyle;
        sheet.mergeCells('A4:N4'); sheet.getCell('A4').value = `Tel: ${invoiceConfig.sellerPhone}  Email: ${invoiceConfig.sellerEmail}`; sheet.getCell('A4').alignment = centerStyle;
        sheet.mergeCells('A6:N6'); sheet.getCell('A6').value = "INVOICE"; sheet.getCell('A6').font = { bold: true, size: 20 }; sheet.getCell('A6').alignment = centerStyle;
        
        sheet.mergeCells('A8:D8'); sheet.getCell('A8').value = `Invoice No: ${invoiceConfig.invoiceNo}`; sheet.getCell('A8').font = { bold: true };
        sheet.mergeCells('H8:N8'); sheet.getCell('H8').value = `Date: ${invoiceConfig.date}`; sheet.getCell('H8').font = { bold: true };
        sheet.mergeCells('H9:N9'); sheet.getCell('H9').value = `Sailing: ${invoiceConfig.sailing}`;
        sheet.mergeCells('A10:D13'); sheet.getCell('A10').value = `To:\n${invoiceConfig.buyerInfo}`; sheet.getCell('A10').alignment = { vertical: 'top', horizontal: 'left', wrapText: true }; sheet.getCell('A10').border = borderStyle;
        sheet.mergeCells('A14:D14'); sheet.getCell('A14').value = `Container: ${invoiceConfig.containerNo}`; sheet.getCell('A14').font = { bold: true }; sheet.getCell('A14').border = { bottom: { style: 'thin' } };
        sheet.mergeCells('H14:N14'); sheet.getCell('H14').value = `Seal: ${invoiceConfig.sealNo}`; sheet.getCell('H14').font = { bold: true }; sheet.getCell('H14').border = { bottom: { style: 'thin' } };

        const headerRow = sheet.getRow(16);
        headerRow.values = ['No.', 'Item NO', 'Description', 'HS CODE', 'CTNS', 'Pkg', 'QTY', 'Unit', 'Price(¥)', 'Amount(¥)', 'GW/ctn', 'Total GW', 'CBM/ctn', 'Total CBM'];
        headerRow.font = { bold: true }; headerRow.alignment = centerStyle;
        headerRow.eachCell((cell:any) => { cell.border = borderStyle; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }; });

        let currentRow = 17;
        let tCtns = 0, tQty = 0, tAmt = 0, tGw = 0, tCbm = 0;
        products.forEach((p, i) => {
          const m = calculateMetrics(p);
          const cQty = (p.moq && p.pcsPerBox) ? Math.ceil(p.moq / p.pcsPerBox) : 0;
          const q = (cQty * p.pcsPerBox) || p.moq || 0;
          const amt = p.priceRmb * q;
          const gw = (p.gwKg || 0) * cQty;
          const cbm = (m.cbm || 0) * cQty;
          tCtns += cQty; tQty += q; tAmt += amt; tGw += gw; tCbm += cbm;
          const row = sheet.getRow(currentRow);
          row.values = [i+1, p.sku, p.nameEn||p.nameCn, p.hsCode, cQty, p.pcsPerBox, q, 'PCS', p.priceRmb, amt, p.gwKg||0, gw.toFixed(2), (m.cbm||0).toFixed(3), cbm.toFixed(3)];
          row.eachCell((c:any, col:any) => { c.border = borderStyle; c.alignment = col===3 ? leftStyle : centerStyle; });
          currentRow++;
        });
        const totalRow = sheet.getRow(currentRow);
        totalRow.getCell(3).value = "TOTAL"; totalRow.getCell(3).font = { bold: true }; totalRow.getCell(3).alignment = centerStyle;
        totalRow.getCell(5).value = tCtns; totalRow.getCell(7).value = tQty; totalRow.getCell(10).value = tAmt; totalRow.getCell(12).value = Number(tGw.toFixed(2)); totalRow.getCell(14).value = Number(tCbm.toFixed(3));
        [3,5,7,10,12,14].forEach(c => { totalRow.getCell(c).font={bold:true}; totalRow.getCell(c).border=borderStyle; });

     } else {
        // Master, Packing, and Quotation
        if (exportType === 'master') {
          sheet.columns = [
            { header: 'Image', key: 'image', width: 15 }, { header: 'SKU', key: 'sku', width: 15, style: centerStyle },
            { header: 'Name (CN)', key: 'nameCn', width: 25, style: leftStyle }, { header: 'Product Name (EN)', key: 'nameEn', width: 25, style: leftStyle },
            { header: 'Nombre Producto (ES)', key: 'nameEs', width: 25, style: leftStyle }, { header: 'Category', key: 'catMain', width: 15, style: centerStyle },
            { header: 'Sub-Cat', key: 'catSub', width: 15, style: centerStyle }, { header: 'Material', key: 'mat', width: 25, style: leftStyle }, 
            { header: 'HS Code', key: 'hs', width: 15, style: centerStyle }, { header: 'L', key: 'l', width: 8, style: centerStyle },
            { header: 'W', key: 'w', width: 8, style: centerStyle }, { header: 'H', key: 'h', width: 8, style: centerStyle },
            { header: 'Pcs/Box', key: 'pcs', width: 8, style: centerStyle }, { header: 'CBM', key: 'cbm', width: 10, style: centerStyle },
            { header: 'G.W', key: 'gw', width: 8, style: centerStyle }, { header: 'Cost (RMB)', key: 'rmb', width: 12, style: centerStyle },
            { header: 'Duty(%)', key: 'tax', width: 8, style: centerStyle }, { header: 'Frt(€)', key: 'frt', width: 10, style: centerStyle },
            { header: 'Landed(€)', key: 'landed', width: 10, style: centerStyle }, { header: 'MOQ', key: 'moq', width: 8, style: centerStyle }
          ];
        } else if (exportType === 'quotation') {
          // Quotation format matching user request: Image | No. | SKU | Description | HS Code | Quantity | Unit Price (USD) | Total Amount (USD)
          sheet.columns = [
            { header: 'Image', key: 'image', width: 15 }, 
            { header: 'No.', key: 'no', width: 8, style: centerStyle },
            { header: 'SKU', key: 'sku', width: 15, style: centerStyle },
            { header: 'Description', key: 'desc', width: 40, style: leftStyle },
            { header: 'HS Code', key: 'hs', width: 15, style: centerStyle },
            { header: 'Quantity', key: 'qty', width: 12, style: centerStyle },
            { header: 'Unit Price (USD)', key: 'price', width: 15, style: centerStyle },
            { header: 'Total Amount (USD)', key: 'amount', width: 18, style: centerStyle },
          ];
        } else {
           // Packing List
           sheet.columns = [
            { header: 'Image', key: 'image', width: 15 }, { header: 'No.', key: 'no', width: 6, style: centerStyle },
            { header: 'SKU', key: 'sku', width: 15, style: centerStyle }, { header: 'Description', key: 'desc', width: 35, style: leftStyle },
            { header: 'Qty', key: 'qty', width: 10, style: centerStyle }, { header: 'Cartons', key: 'cartons', width: 10, style: centerStyle },
            { header: 'CBM', key: 'totalCbm', width: 12, style: centerStyle }, { header: 'G.W', key: 'totalGw', width: 12, style: centerStyle },
          ];
        }

        sheet.getRow(1).font = { bold: true, size: 12 }; sheet.getRow(1).height = 35; sheet.getRow(1).alignment = centerStyle;
        
        products.forEach((p, i) => {
           const m = calculateMetrics(p); const rowIndex = i + 2;
           const cQty = (p.moq && p.pcsPerBox) ? Math.ceil(p.moq / p.pcsPerBox) : 0;
           const tQty = (cQty * p.pcsPerBox) || p.moq || 0; 
           const tCbm = (m.cbm || 0) * cQty; 
           const tGw = (p.gwKg || 15) * cQty; 
           
           let rowValues = {};

           if (exportType === 'master') {
             rowValues = {
               sku: p.sku, nameCn: p.nameCn, nameEn: p.nameEn, nameEs: p.nameEs, catMain: p.categoryMain, catSub: p.categorySub, mat: p.materialEn, hs: p.hsCode,
               l: p.boxLength || 0, w: p.boxWidth || 0, h: p.boxHeight || 0, pcs: p.pcsPerBox, cbm: m.cbm, gw: p.gwKg || 0, rmb: p.priceRmb, tax: p.taxRate, frt: m.freightPerPc, landed: m.landedCostEuro, moq: p.moq
             };
           } else if (exportType === 'quotation') {
             const priceUsd = m.priceStockUsd || 0;
             const totalUsd = priceUsd * tQty;
             rowValues = {
                no: i + 1,
                sku: p.sku,
                desc: p.nameEn || p.nameCn,
                hs: p.hsCode,
                qty: tQty,
                price: priceUsd.toFixed(3),
                amount: totalUsd.toFixed(2)
             };
           } else {
             rowValues = { no: i + 1, sku: p.sku, desc: p.nameEn || p.nameCn, qty: tQty, cartons: cQty, totalCbm: tCbm.toFixed(3), totalGw: tGw.toFixed(2) };
           }

           const row = sheet.addRow(rowValues); 
           row.height = 85; // Compact height (approx 110px) to match width for square cell
           row.alignment = centerStyle;
           row.eachCell((cell:any) => { cell.border = borderStyle; });
           
           if (p.photoUrl && p.photoUrl.startsWith('data:image')) {
             try {
               const parts = p.photoUrl.split(',');
               if (parts.length > 1) {
                 const base64 = parts[1];
                 const imageId = workbook.addImage({ base64: base64, extension: 'jpeg' });
                 
                 // CRITICAL FIX: Removed padding to ensure image fills cell fully.
                 // We use col 0 and 1 explicitly (assuming 'Image' is the first column in the defined arrays above).
                 sheet.addImage(imageId, { 
                    tl: { col: 0, row: rowIndex - 1 }, 
                    br: { col: 1, row: rowIndex },
                    editAs: 'twoCell' 
                 });
               }
             } catch (e) { console.warn("Img Export Error, skipping", e); }
           }
        });
     }
     const buffer = await workbook.xlsx.writeBuffer();
     saveAs(new Blob([buffer]), `Yiwu_${exportType}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  
  const toggleLanguage = () => {
     if (!onLanguageChange) return;
     if (currentLang === 'en') onLanguageChange('zh');
     else if (currentLang === 'zh') onLanguageChange('es');
     else onLanguageChange('en');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans relative">
      
      {/* Upload/Scanner Modal Overlay */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] overflow-hidden flex flex-col relative">
             <MobileEntry 
               onSave={onAddProduct} 
               isDesktopMode={true} 
               onClose={() => setShowUploadModal(false)}
               currentLang={currentLang}
               onLanguageChange={onLanguageChange}
             />
           </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
             <img src={previewImage} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
             <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors">
               <X size={24} />
             </button>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Settings size={20} className="text-indigo-600"/> {t.invoiceConfig}
              </h2>
              <button onClick={() => setShowInvoiceModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.sellerDetails}</h3>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                     <label className="text-sm font-medium text-slate-700">{t.companyName}</label>
                     <input className="w-full mt-1 border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" value={invoiceConfig.sellerName} onChange={e => setInvoiceConfig({...invoiceConfig, sellerName: e.target.value})} />
                   </div>
                   <div className="col-span-2">
                     <label className="text-sm font-medium text-slate-700">{t.address}</label>
                     <input className="w-full mt-1 border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" value={invoiceConfig.sellerAddress} onChange={e => setInvoiceConfig({...invoiceConfig, sellerAddress: e.target.value})} />
                   </div>
                 </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-slate-100">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.shipmentDetails}</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-slate-700">{t.buyerInfo}</label>
                      <textarea className="w-full mt-1 border border-slate-200 p-2.5 rounded-lg text-sm h-24 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" value={invoiceConfig.buyerInfo} onChange={e => setInvoiceConfig({...invoiceConfig, buyerInfo: e.target.value})} />
                    </div>
                    <div><label className="text-sm font-medium text-slate-700">Invoice No</label><input className="w-full mt-1 border border-slate-200 p-2.5 rounded-lg text-sm" value={invoiceConfig.invoiceNo} onChange={e => setInvoiceConfig({...invoiceConfig, invoiceNo: e.target.value})} /></div>
                    <div><label className="text-sm font-medium text-slate-700">Date</label><input className="w-full mt-1 border border-slate-200 p-2.5 rounded-lg text-sm" value={invoiceConfig.date} onChange={e => setInvoiceConfig({...invoiceConfig, date: e.target.value})} /></div>
                 </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
               <button onClick={() => setShowInvoiceModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-white hover:shadow-sm rounded-lg transition-all">{t.cancel}</button>
               <button onClick={() => { setShowInvoiceModal(false); generateExcel('invoice'); }} className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
                 <Download size={16} /> {t.saveDownload}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Main App Bar - Responsive Layout Fix */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm/50">
        <div className="p-4 md:px-8 md:py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
             <div className="flex items-center gap-3">
                 <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-200 shrink-0">
                   <Database size={20} />
                 </div>
                 <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-tight whitespace-nowrap">{t.dashboard}</h1>
                    <p className="text-xs text-slate-500 font-medium">{products.length} {t.recordsFound}</p>
                 </div>
             </div>
             
             {/* Mobile: Show minimal controls here if needed */}
             <div className="flex md:hidden items-center gap-2">
                 <button onClick={toggleLanguage} className="text-xs font-bold px-2 py-1 bg-slate-100 rounded text-slate-600 flex items-center gap-1">
                      <Globe size={12}/> {currentLang.toUpperCase()}
                 </button>
             </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
             {onHome && (
                 <button onClick={onHome} className="text-xs font-bold px-3 py-2 bg-slate-100 rounded-lg text-slate-600 flex items-center gap-1 hover:bg-slate-200 transition-colors shrink-0 whitespace-nowrap">
                   <Home size={14}/> {t.backHome}
                 </button>
             )}
             <button onClick={toggleLanguage} className="hidden md:flex text-xs font-bold px-2 py-2 bg-slate-100 rounded-lg text-slate-600 items-center gap-1 hover:bg-slate-200 transition-colors shrink-0">
                  <Globe size={12}/> {currentLang.toUpperCase()}
             </button>
             <button 
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all shrink-0 whitespace-nowrap"
             >
                <UploadCloud size={16} /> {t.newSourcingBatch}
             </button>

             {/* Export Buttons - Scrollable on mobile */}
             <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
                <button onClick={() => generateExcel('master')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-md transition-all whitespace-nowrap">
                  <Database size={14} /> {t.masterData}
                </button>
                <div className="w-px bg-slate-300 my-1 mx-1"></div>
                <button onClick={() => generateExcel('packinglist')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white hover:text-green-600 hover:shadow-sm rounded-md transition-all whitespace-nowrap">
                  <Package size={14} /> {t.packingList}
                </button>
                <div className="w-px bg-slate-300 my-1 mx-1"></div>
                <button onClick={() => generateExcel('quotation')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white hover:text-purple-600 hover:shadow-sm rounded-md transition-all whitespace-nowrap">
                  <FileText size={14} /> {t.quotation}
                </button>
                <div className="w-px bg-slate-300 my-1 mx-1"></div>
                <button onClick={() => setShowInvoiceModal(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-md transition-all whitespace-nowrap">
                  <Printer size={14} /> {t.invoice}
                </button>
             </div>
          </div>
        </div>

        {/* Filters & Bulk Bar - Responsive Fix */}
        <div className="px-4 py-3 md:px-8 bg-slate-50/50 border-t border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
           {selectedIds.size > 0 ? (
             <div className="flex items-center justify-between md:justify-start gap-4 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-lg animate-in fade-in slide-in-from-top-1 w-full md:w-auto">
                <span className="text-sm font-bold text-indigo-700 flex items-center gap-2 whitespace-nowrap">
                   <CheckSquare size={16} /> {selectedIds.size} {t.selected}
                </span>
                <div className="h-4 w-px bg-indigo-200 mx-2"></div>
                <div className="flex gap-3">
                    <button onClick={handleBulkEnrich} disabled={isBulkProcessing} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors whitespace-nowrap">
                       {isBulkProcessing ? <RefreshCw className="animate-spin" size={14}/> : <Sparkles size={14}/>} {t.aiEnrich}
                    </button>
                    <button onClick={handleBulkDelete} className="text-xs font-medium text-red-600 hover:text-red-800 flex items-center gap-1.5 transition-colors whitespace-nowrap">
                       <Trash2 size={14}/> {t.delete}
                    </button>
                </div>
             </div>
           ) : (
             <div className="flex items-center gap-2 md:gap-6 text-sm text-slate-500 overflow-x-auto pb-1 md:pb-0 no-scrollbar w-full md:w-auto">
               <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 shadow-sm shrink-0">
                  <span className="text-xs font-bold text-slate-400 uppercase">{t.rateEur}</span>
                  <input type="number" value={euroRmbRate} onChange={e => setEuroRmbRate(Number(e.target.value))} className="w-12 text-slate-800 font-mono text-center outline-none border-b border-transparent focus:border-indigo-500" />
               </div>
               <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 shadow-sm shrink-0">
                  <span className="text-xs font-bold text-slate-400 uppercase">{t.frt}</span>
                  <input type="number" value={freightRateCbm} onChange={e => setFreightRateCbm(Number(e.target.value))} className="w-12 text-slate-800 font-mono text-center outline-none border-b border-transparent focus:border-indigo-500" />
               </div>
               <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 shadow-sm shrink-0">
                  <span className="text-xs font-bold text-slate-400 uppercase">{t.rateUsd}</span>
                  <input type="number" value={usdRmbRate} onChange={e => setUsdRmbRate(Number(e.target.value))} className="w-12 text-slate-800 font-mono text-center outline-none border-b border-transparent focus:border-indigo-500" />
               </div>
             </div>
           )}
           <div className="relative w-full md:w-auto">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder={t.searchPlaceholder} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-full focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all w-full md:w-64 bg-white shadow-sm" />
           </div>
        </div>
      </header>

      {/* Main Data Grid */}
      <main className="flex-1 overflow-auto bg-slate-100 p-2 md:p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-10 text-center">
                     <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                       {selectedIds.size > 0 && selectedIds.size === products.length ? <CheckSquare size={18}/> : <Square size={18}/>}
                     </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t.productName}</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t.details}</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t.category}</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t.specs}</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t.cost}</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t.landed}</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const metrics = calculateMetrics(p); 
                  const isProcessing = processingId === p.id;
                  const isEditing = editingId === p.id;
                  const isSelected = selectedIds.has(p.id);
                  
                  return (
                    <tr key={p.id} className={`group transition-colors ${isEditing ? 'bg-indigo-50/50' : isSelected ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => toggleSelectRow(p.id)} className={`${isSelected ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                           {isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                           <div className="relative group cursor-zoom-in" onClick={() => setPreviewImage(p.photoUrl)}>
                              <img src={p.photoUrl} className="w-16 h-16 md:w-24 md:h-24 rounded-lg border border-slate-200 object-cover bg-white shadow-sm transition-transform hover:scale-105" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                 <ZoomIn size={24} className="text-white drop-shadow-md" />
                              </div>
                           </div>
                           <div>
                              <div className="font-bold text-slate-900">{p.sku}</div>
                              {isEditing ? (
                                <input className="w-32 mt-1 border border-indigo-300 rounded px-1.5 py-0.5 text-xs" value={editForm.nameCn || ''} onChange={e => setEditForm({...editForm, nameCn: e.target.value})} />
                              ) : (
                                <div className="text-slate-600 text-xs truncate max-w-[120px]" title={p.nameCn}>{p.nameCn}</div>
                              )}
                           </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 max-w-[200px]">
                         {isEditing ? (
                           <div className="space-y-1">
                             <input className="w-full border border-indigo-300 rounded px-1.5 py-0.5 text-xs" value={editForm.nameEn || ''} onChange={e => setEditForm({...editForm, nameEn: e.target.value})} placeholder="EN Name"/>
                             <input className="w-full border border-indigo-300 rounded px-1.5 py-0.5 text-xs" value={editForm.nameEs || ''} onChange={e => setEditForm({...editForm, nameEs: e.target.value})} placeholder="ES Name"/>
                           </div>
                         ) : (
                           <div className="space-y-0.5">
                              <div className="font-medium text-indigo-600 truncate">{p.nameEn || "-"}</div>
                              <div className="text-emerald-600 italic text-xs truncate">{p.nameEs || "-"}</div>
                           </div>
                         )}
                      </td>
                      <td className="px-4 py-4">
                         {isEditing ? (
                           <input className="w-full border border-indigo-300 rounded px-1.5 py-0.5 text-xs" value={editForm.categoryMain || ''} onChange={e => setEditForm({...editForm, categoryMain: e.target.value})} />
                         ) : (
                           <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800">
                                {p.categoryMain || "N/A"}
                              </span>
                              <span className="text-[10px] text-slate-400 pl-1">{p.categorySub}</span>
                           </div>
                         )}
                      </td>
                      <td className="px-4 py-4 text-slate-600 text-xs">
                          {isEditing ? (
                             <div className="flex gap-1 mb-1">
                                <input className="w-8 border border-indigo-300 rounded px-1 text-center" value={editForm.boxLength} onChange={e => setEditForm({...editForm, boxLength: Number(e.target.value)})} />
                                <input className="w-8 border border-indigo-300 rounded px-1 text-center" value={editForm.boxWidth} onChange={e => setEditForm({...editForm, boxWidth: Number(e.target.value)})} />
                                <input className="w-8 border border-indigo-300 rounded px-1 text-center" value={editForm.boxHeight} onChange={e => setEditForm({...editForm, boxHeight: Number(e.target.value)})} />
                             </div>
                          ) : (
                             <div className="flex items-center gap-1"><BoxIcon size={12}/> {p.boxLength}x{p.boxWidth}x{p.boxHeight}</div>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-slate-400">
                             <span>{isEditing ? <input className="w-10 border border-indigo-300 rounded px-1" value={editForm.pcsPerBox} onChange={e=>setEditForm({...editForm, pcsPerBox: Number(e.target.value)})}/> : p.pcsPerBox} pcs</span>
                             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                             <span>{metrics.cbm.toFixed(3)} m³</span>
                          </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium text-slate-700">
                         {isEditing ? <input className="w-16 text-right border border-indigo-300 rounded px-1" value={editForm.priceRmb} onChange={e => setEditForm({...editForm, priceRmb: Number(e.target.value)})} /> : `¥${p.priceRmb}`}
                      </td>
                      <td className="px-4 py-4 text-right">
                         <div className="font-mono font-bold text-emerald-600">€{metrics.landedCostEuro.toFixed(2)}</div>
                         <div className="text-[10px] text-slate-400">Duty: {p.taxRate}%</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="flex justify-center items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            {isEditing ? (
                              <>
                                <button onClick={saveEdit} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"><SaveIcon size={14} /></button>
                                <button onClick={cancelEdit} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"><X size={14} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleEnrichment(p)} disabled={isProcessing} className="p-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 disabled:opacity-50">
                                   {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                </button>
                                <button onClick={() => startEditing(p)} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"><Edit size={14} /></button>
                              </>
                            )}
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;