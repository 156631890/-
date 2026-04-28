import { describe, expect, it } from 'vitest';
import { filterProducts } from './productFilters';
import { ProcessingStatus, Product } from '../types';

const products: Product[] = [
  {
    id: '1',
    sku: 'YW-10001',
    photoUrl: '',
    nameCn: '玩具车',
    nameEn: 'Toy Car',
    hsCode: '950300',
    supplier: { companyName: 'Yiwu Toys', contactPerson: 'Li', phone: '123', address: 'A-100' },
    shopNo: 'A-100',
    priceRmb: 10,
    moq: 20,
    boxLength: 1,
    boxWidth: 1,
    boxHeight: 1,
    pcsPerBox: 1,
    timestamp: 1,
    status: ProcessingStatus.DRAFT,
  },
];

describe('filterProducts', () => {
  it('returns all products for an empty query', () => {
    expect(filterProducts(products, '')).toHaveLength(1);
  });

  it('searches SKU, English name, supplier, shop, and HS code case-insensitively', () => {
    expect(filterProducts(products, 'toy')).toHaveLength(1);
    expect(filterProducts(products, 'yiwu')).toHaveLength(1);
    expect(filterProducts(products, 'a-100')).toHaveLength(1);
    expect(filterProducts(products, '950300')).toHaveLength(1);
  });

  it('returns no products when nothing matches', () => {
    expect(filterProducts(products, 'glass')).toHaveLength(0);
  });
});
