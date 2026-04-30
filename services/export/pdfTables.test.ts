import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS, ProcessingStatus, Product } from '../../types';
import { buildPdfTable } from './pdfTables';

const baseProduct: Product = {
  id: '1',
  sku: 'YW-10001',
  photoUrl: 'data:image/jpeg;base64,a',
  nameCn: 'Toy car',
  nameEn: 'Toy car',
  hsCode: '9503006000',
  hsCodeReviewed: true,
  boxLength: 60,
  boxWidth: 40,
  boxHeight: 30,
  pcsPerBox: 12,
  priceRmb: 14.4,
  moq: 24,
  shopNo: 'A-100',
  timestamp: 1,
  status: ProcessingStatus.DRAFT,
};

const input = {
  type: 'invoice' as const,
  products: [baseProduct],
  settings: DEFAULT_APP_SETTINGS,
};

describe('PDF export tables', () => {
  it('builds commercial invoice rows with HS Code, carton, quantity, unit price, and amount', () => {
    const table = buildPdfTable('invoice', input);

    expect(table.head).toEqual([['Image', 'No.', 'SKU', 'Description', 'HS Code', 'Cartons', 'Pcs/Ctn', 'Qty', 'Price(USD)', 'Amount(USD)']]);
    expect(table.body[0]).toEqual([
      '',
      1,
      'YW-10001',
      'Toy car',
      '9503006000',
      2,
      12,
      24,
      '$2',
      '$48.00',
    ]);
  });

  it('keeps packing list rows focused on logistics fields', () => {
    const table = buildPdfTable('packinglist', { ...input, type: 'packinglist' });

    expect(table.head[0]).not.toContain('HS Code');
    expect(table.head[0]).toContain('CBM');
  });
});
