import { describe, expect, it } from 'vitest';
import { calculateProductMetrics, getCartonQuantity } from './productMetrics';
import { ProcessingStatus, Product } from '../types';

const baseProduct: Product = {
  id: '1',
  sku: 'YW-10001',
  photoUrl: 'data:image/jpeg;base64,a',
  nameCn: '玩具车',
  boxLength: 60,
  boxWidth: 40,
  boxHeight: 50,
  pcsPerBox: 20,
  priceRmb: 14.4,
  moq: 35,
  shopNo: 'A-100',
  timestamp: 1,
  status: ProcessingStatus.DRAFT,
  taxRate: 5,
};

describe('product metrics', () => {
  it('calculates carton quantity rounded up from MOQ', () => {
    expect(getCartonQuantity(baseProduct)).toBe(2);
  });

  it('calculates CBM, freight, landed euro, and stock usd', () => {
    expect(calculateProductMetrics(baseProduct, { euroRmbRate: 7.8, usdRmbRate: 7.2, freightRateCbm: 150 })).toEqual({
      cbm: 0.12,
      freightPerPc: 0.9,
      landedCostEuro: 2.838,
      priceStockUsd: 2,
    });
  });

  it('does not divide by zero when pcs per box is missing', () => {
    expect(calculateProductMetrics({ ...baseProduct, pcsPerBox: 0 }, { euroRmbRate: 7.8, usdRmbRate: 7.2, freightRateCbm: 150 }).freightPerPc).toBe(0);
  });
});
