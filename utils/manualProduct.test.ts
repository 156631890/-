import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS, DraftFolder, ProcessingStatus } from '../types';
import { createManualProduct } from './manualProduct';

const folder: DraftFolder = {
  id: 'folder-1',
  name: 'Supplier A',
  supplier: {
    companyName: 'Supplier A',
    contactPerson: 'Alice',
    phone: '123',
    address: 'District 1',
  },
  images: [{ id: 'image-1', url: 'data:image/jpeg;base64,a', timestamp: 1 }],
  timestamp: 1,
};

describe('manual product creation', () => {
  it('creates a product from a draft folder, selected image, and manual trade fields', () => {
    const product = createManualProduct({
      folder,
      imageUrl: folder.images[0].url,
      id: 'product-1',
      sku: 'YW-MANUAL',
      timestamp: 10,
      settings: DEFAULT_APP_SETTINGS,
      values: {
        nameCn: '玩具车',
        nameEn: 'Toy car',
        materialEn: 'Plastic',
        hsCode: '9503.00.6000',
        hsCodeReviewed: true,
        priceRmb: 14.4,
        moq: 24,
        shopNo: '',
        boxLength: 60,
        boxWidth: 40,
        boxHeight: 30,
        pcsPerBox: 12,
        taxRate: 5,
      },
    });

    expect(product).toMatchObject({
      id: 'product-1',
      sku: 'YW-MANUAL',
      photoUrl: 'data:image/jpeg;base64,a',
      supplier: folder.supplier,
      nameCn: '玩具车',
      nameEn: 'Toy car',
      materialEn: 'Plastic',
      hsCode: '9503006000',
      hsCodeReviewed: true,
      priceRmb: 14.4,
      moq: 24,
      shopNo: 'District 1',
      boxLength: 60,
      boxWidth: 40,
      boxHeight: 30,
      pcsPerBox: 12,
      taxRate: 5,
      status: ProcessingStatus.DRAFT,
      timestamp: 10,
    });
    expect(product.cbm).toBe(0.072);
    expect(product.priceStockUsd).toBe(2);
  });
});
