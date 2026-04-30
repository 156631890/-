import { calculateProductMetrics, getCartonQuantity, getOrderQuantity } from '../../utils/productMetrics';
import { ExportInput, ExportType } from './exportTypes';

export interface PdfTable {
  head: string[][];
  body: Array<Array<string | number>>;
}

export function buildPdfTable(type: ExportType, input: ExportInput): PdfTable {
  if (type === 'invoice') {
    return {
      head: [['Image', 'No.', 'SKU', 'Description', 'HS Code', 'Cartons', 'Pcs/Ctn', 'Qty', 'Price(USD)', 'Amount(USD)']],
      body: input.products.map((product, index) => {
        const metrics = calculateProductMetrics(product, input.settings);
        const cartons = getCartonQuantity(product);
        const quantity = getOrderQuantity(product);
        return [
          '',
          index + 1,
          product.sku,
          product.nameEn || product.nameCn,
          product.hsCode || '',
          cartons,
          product.pcsPerBox,
          quantity,
          `$${metrics.priceStockUsd}`,
          `$${(metrics.priceStockUsd * quantity).toFixed(2)}`,
        ];
      }),
    };
  }

  if (type === 'quotation' || type === 'master') {
    return {
      head: [['Image', 'No.', 'SKU', 'Description', 'HS Code', 'Qty', 'Price(USD)', 'Total(USD)']],
      body: input.products.map((product, index) => {
        const metrics = calculateProductMetrics(product, input.settings);
        const quantity = getOrderQuantity(product);
        return [
          '',
          index + 1,
          product.sku,
          product.nameEn || product.nameCn,
          product.hsCode || '',
          quantity,
          `$${metrics.priceStockUsd}`,
          `$${(metrics.priceStockUsd * quantity).toFixed(2)}`,
        ];
      }),
    };
  }

  return {
    head: [['Image', 'No.', 'SKU', 'Description', 'Qty', 'Cartons', 'CBM', 'G.W']],
    body: input.products.map((product, index) => {
      const metrics = calculateProductMetrics(product, input.settings);
      const cartons = getCartonQuantity(product);
      const quantity = getOrderQuantity(product);
      return [
        '',
        index + 1,
        product.sku,
        product.nameEn || product.nameCn,
        quantity,
        cartons,
        (metrics.cbm * cartons).toFixed(3),
        ((product.gwKg || 0) * cartons).toFixed(2),
      ];
    }),
  };
}
