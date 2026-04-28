import { Product } from '../types';

export interface RateSettings {
  euroRmbRate: number;
  usdRmbRate: number;
  freightRateCbm: number;
}

export interface ProductMetrics {
  cbm: number;
  freightPerPc: number;
  landedCostEuro: number;
  priceStockUsd: number;
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));

export function getCartonQuantity(product: Pick<Product, 'moq' | 'pcsPerBox'>): number {
  const pcsPerBox = product.pcsPerBox > 0 ? product.pcsPerBox : 1;
  return Math.max(1, Math.ceil((product.moq || 0) / pcsPerBox));
}

export function getOrderQuantity(product: Pick<Product, 'moq' | 'pcsPerBox'>): number {
  return getCartonQuantity(product) * (product.pcsPerBox > 0 ? product.pcsPerBox : 1);
}

export function calculateProductMetrics(product: Partial<Product>, settings: RateSettings): ProductMetrics {
  const cbm = product.boxLength && product.boxWidth && product.boxHeight
    ? (product.boxLength * product.boxWidth * product.boxHeight) / 1_000_000
    : 0;
  const freightPerPc = cbm > 0 && (product.pcsPerBox || 0) > 0
    ? (settings.freightRateCbm * cbm) / Number(product.pcsPerBox)
    : 0;
  const baseCostEuro = (product.priceRmb || 0) > 0 && settings.euroRmbRate > 0
    ? Number(product.priceRmb) / settings.euroRmbRate
    : 0;
  const roundedBaseCostEuro = round(baseCostEuro, 2);
  const dutyCost = roundedBaseCostEuro * ((product.taxRate || 0) / 100);
  const priceStockUsd = (product.priceRmb || 0) > 0 && settings.usdRmbRate > 0
    ? Number(product.priceRmb) / settings.usdRmbRate
    : 0;

  return {
    cbm: round(cbm, 4),
    freightPerPc: round(freightPerPc, 4),
    landedCostEuro: round(roundedBaseCostEuro + freightPerPc + dutyCost, 3),
    priceStockUsd: round(priceStockUsd, 3),
  };
}
