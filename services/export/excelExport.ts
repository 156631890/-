import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { calculateProductMetrics, getCartonQuantity, getOrderQuantity } from '../../utils/productMetrics';
import { ExportInput, ExportResult, ExportType } from './exportTypes';

type ImageExtension = 'jpeg' | 'png';

const centerStyle: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center', wrapText: true };
const borderStyle: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

function getDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function getImageData(photoUrl: string | undefined): { base64: string; extension: ImageExtension } | null {
  if (!photoUrl?.startsWith('data:image/')) return null;
  const [metadata, base64] = photoUrl.split(',');
  if (!metadata || !base64) return null;
  return { base64, extension: metadata.includes('png') ? 'png' : 'jpeg' };
}

function applyHeaderStyle(row: ExcelJS.Row): void {
  row.font = { bold: true };
  row.height = 30;
  row.alignment = centerStyle;
  row.eachCell((cell) => {
    cell.border = borderStyle;
  });
}

function addInvoiceHeader(sheet: ExcelJS.Worksheet, input: ExportInput): void {
  const invoiceConfig = input.settings.invoiceConfig;
  sheet.mergeCells('A1:J1');
  sheet.getCell('A1').value = invoiceConfig.sellerName;
  sheet.getCell('A1').font = { bold: true, size: 16 };
  sheet.getCell('A1').alignment = centerStyle;
  sheet.mergeCells('A2:J2');
  sheet.getCell('A2').value = invoiceConfig.sellerAddress;
  sheet.mergeCells('A3:E3');
  sheet.getCell('A3').value = `Phone: ${invoiceConfig.sellerPhone}`;
  sheet.mergeCells('F3:J3');
  sheet.getCell('F3').value = `Email: ${invoiceConfig.sellerEmail}`;
  sheet.mergeCells('A5:E5');
  sheet.getCell('A5').value = `Invoice No: ${invoiceConfig.invoiceNo}`;
  sheet.mergeCells('F5:J5');
  sheet.getCell('F5').value = `Date: ${invoiceConfig.date}`;
  sheet.mergeCells('A6:J6');
  sheet.getCell('A6').value = 'COMMERCIAL INVOICE';
  sheet.getCell('A6').font = { bold: true, size: 20 };
  sheet.getCell('A6').alignment = centerStyle;
  sheet.mergeCells('A8:J11');
  sheet.getCell('A8').value = `Buyer:\n${invoiceConfig.buyerInfo}`;
  sheet.getCell('A8').alignment = { wrapText: true, vertical: 'top' };
}

export async function exportExcel(input: ExportInput): Promise<ExportResult> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(input.type.toUpperCase());
  let skippedImages = 0;

  if (input.type === 'invoice') {
    sheet.columns = [
      { key: 'no', width: 5 },
      { key: 'sku', width: 12 },
      { key: 'desc', width: 40 },
      { key: 'hs', width: 15 },
      { key: 'ctns', width: 8 },
      { key: 'pkg', width: 10 },
      { key: 'qty', width: 10 },
      { key: 'unit', width: 8 },
      { key: 'price', width: 12 },
      { key: 'amount', width: 15 },
    ];
    addInvoiceHeader(sheet, input);

    const headerRow = sheet.getRow(16);
    headerRow.values = ['No.', 'Item NO', 'Description', 'HS CODE', 'CTNS', 'Pkg', 'QTY', 'Unit', 'Price(USD)', 'Amount(USD)'];
    applyHeaderStyle(headerRow);

    input.products.forEach((product, index) => {
      const cartons = getCartonQuantity(product);
      const quantity = getOrderQuantity(product);
      const metrics = calculateProductMetrics(product, input.settings);
      const row = sheet.addRow([
        index + 1,
        product.sku,
        product.nameEn || product.nameCn,
        product.hsCode,
        cartons,
        product.pcsPerBox,
        quantity,
        'PCS',
        metrics.priceStockUsd,
        Number((metrics.priceStockUsd * quantity).toFixed(2)),
      ]);
      row.alignment = centerStyle;
      row.eachCell((cell) => {
        cell.border = borderStyle;
      });
    });
  } else {
    sheet.columns = [
      { header: 'Image', key: 'image', width: 20 },
      { header: 'No.', key: 'no', width: 8 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Description', key: 'desc', width: 40 },
      { header: 'HS Code', key: 'hs', width: 15 },
      { header: 'Qty', key: 'qty', width: 12 },
      { header: 'Cartons', key: 'cartons', width: 12 },
      { header: 'CBM', key: 'cbm', width: 12 },
      { header: 'Price (USD)', key: 'price', width: 15 },
      { header: 'Total (USD)', key: 'total', width: 18 },
    ];
    applyHeaderStyle(sheet.getRow(1));

    input.products.forEach((product, index) => {
      const metrics = calculateProductMetrics(product, input.settings);
      const rowIndex = index + 2;
      const quantity = getOrderQuantity(product);
      const cartons = getCartonQuantity(product);
      const row = sheet.addRow({
        no: index + 1,
        sku: product.sku,
        desc: product.nameEn || product.nameCn,
        hs: product.hsCode,
        qty: quantity,
        cartons,
        cbm: Number((metrics.cbm * cartons).toFixed(3)),
        price: metrics.priceStockUsd,
        total: Number((metrics.priceStockUsd * quantity).toFixed(2)),
      });
      row.height = 110;
      row.alignment = centerStyle;
      row.eachCell((cell) => {
        cell.border = borderStyle;
      });

      const image = getImageData(product.photoUrl);
      if (!image) {
        if (product.photoUrl) skippedImages += 1;
        return;
      }

      try {
        const imageId = workbook.addImage({ base64: image.base64, extension: image.extension });
        sheet.addImage(imageId, {
          tl: { col: 0, row: rowIndex - 1 },
          br: { col: 1, row: rowIndex },
          editAs: 'twoCell',
        });
      } catch {
        skippedImages += 1;
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Yiwu_${input.type}_${getDateStamp()}.xlsx`);
  return { skippedImages };
}
