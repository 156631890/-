import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExportInput, ExportResult } from './exportTypes';
import { buildPdfTable } from './pdfTables';

interface TableCellData {
  column: { index: number };
  row: { index: number };
  cell: { section: string; x: number; y: number };
}

function getDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function getImageFormat(photoUrl: string | undefined): 'JPEG' | 'PNG' | null {
  if (!photoUrl?.startsWith('data:image/')) return null;
  return photoUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

export async function exportPdf(input: ExportInput): Promise<ExportResult> {
  const doc = new jsPDF('l', 'mm', 'a4');
  const invoiceConfig = input.settings.invoiceConfig;
  let skippedImages = 0;

  doc.setFontSize(20);
  doc.text(input.type.toUpperCase(), 14, 20);
  doc.setFontSize(10);
  doc.text(invoiceConfig.sellerName, 14, 28);
  if (input.type === 'invoice') {
    doc.text(`Invoice No: ${invoiceConfig.invoiceNo}`, 14, 34);
    doc.text(`Buyer: ${invoiceConfig.buyerInfo.split('\n')[0] || ''}`, 14, 40);
  }
  doc.text(`Date: ${invoiceConfig.date || getDateStamp()}`, 280, 20, { align: 'right' });

  const table = buildPdfTable(input.type, input);
  autoTable(doc, {
    head: table.head,
    body: table.body,
    startY: input.type === 'invoice' ? 46 : 35,
    rowPageBreak: 'avoid',
    styles: { cellPadding: 2, fontSize: 8, valign: 'middle', halign: 'center' },
    columnStyles: { 0: { cellWidth: 30 }, 3: { halign: 'left' } },
    bodyStyles: { minCellHeight: 30 },
    didDrawCell: (data: TableCellData) => {
      if (data.column.index !== 0 || data.cell.section !== 'body') return;

      const product = input.products[data.row.index];
      const format = getImageFormat(product?.photoUrl);
      if (!product?.photoUrl || !format) {
        if (product?.photoUrl) skippedImages += 1;
        return;
      }

      try {
        doc.addImage(product.photoUrl, format, data.cell.x + 2, data.cell.y + 2, 26, 26);
      } catch {
        skippedImages += 1;
      }
    },
  });

  doc.save(`Yiwu_${input.type}_${getDateStamp()}.pdf`);
  return { skippedImages };
}
