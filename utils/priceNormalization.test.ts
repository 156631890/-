import { describe, expect, it } from 'vitest';
import { normalizePriceMetadata } from './priceNormalization';

describe('price metadata normalization', () => {
  it('preserves valid raw price metadata and normalized RMB per piece', () => {
    expect(normalizePriceMetadata({
      priceRawText: ' 30 RMB/dozen ',
      priceCurrency: 'RMB',
      priceUnit: 'dozen',
      priceUnitQuantity: 12,
      priceRmb: '2.5',
      priceNormalizationNote: ' Visible 30 RMB/dozen normalized to 2.5 RMB/pc ',
    })).toEqual({
      priceRawText: '30 RMB/dozen',
      priceCurrency: 'RMB',
      priceUnit: 'dozen',
      priceUnitQuantity: 12,
      priceRmb: 2.5,
      priceNormalizationNote: 'Visible 30 RMB/dozen normalized to 2.5 RMB/pc',
    });
  });

  it('falls back invalid currency and unit values to unknown states', () => {
    expect(normalizePriceMetadata({
      priceCurrency: 'AUD',
      priceUnit: 'bundle',
      priceUnitQuantity: 10,
      priceRmb: 8,
    })).toMatchObject({
      priceCurrency: 'UNKNOWN',
      priceUnit: 'unknown',
      priceUnitQuantity: 0,
      priceRmb: 8,
    });
  });

  it('defaults piece quantity to one and unclear non-piece quantity to zero', () => {
    expect(normalizePriceMetadata({ priceUnit: 'pc', priceUnitQuantity: -1, priceRmb: 5 })).toMatchObject({
      priceUnit: 'pc',
      priceUnitQuantity: 1,
    });
    expect(normalizePriceMetadata({ priceUnit: 'box', priceUnitQuantity: -1, priceRmb: 5 })).toMatchObject({
      priceUnit: 'box',
      priceUnitQuantity: 0,
    });
  });
});
