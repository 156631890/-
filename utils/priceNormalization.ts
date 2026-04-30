export type PriceCurrency = 'RMB' | 'USD' | 'EUR' | 'UNKNOWN';
export type PriceUnit = 'pc' | 'box' | 'set' | 'dozen' | 'pack' | 'carton' | 'unknown';

export interface PriceMetadata {
  priceRawText?: string;
  priceCurrency?: PriceCurrency;
  priceUnit?: PriceUnit;
  priceUnitQuantity?: number;
  priceRmb: number;
  priceNormalizationNote?: string;
}

const VALID_CURRENCIES: PriceCurrency[] = ['RMB', 'USD', 'EUR', 'UNKNOWN'];
const VALID_UNITS: PriceUnit[] = ['pc', 'box', 'set', 'dozen', 'pack', 'carton', 'unknown'];

const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const normalizeNumber = (value: unknown) => Number(value) || 0;

const hasPriceMetadata = (value: Record<string, unknown>) =>
  ['priceRawText', 'priceCurrency', 'priceUnit', 'priceUnitQuantity', 'priceNormalizationNote']
    .some((key) => value[key] !== undefined);

export function normalizePriceMetadata(value: Record<string, unknown>): PriceMetadata {
  const priceRmb = normalizeNumber(value.priceRmb);
  if (!hasPriceMetadata(value)) {
    return { priceRmb };
  }

  const currency = normalizeText(value.priceCurrency).toUpperCase();
  const priceCurrency = VALID_CURRENCIES.includes(currency as PriceCurrency)
    ? currency as PriceCurrency
    : 'UNKNOWN';

  const unit = normalizeText(value.priceUnit).toLowerCase();
  const priceUnit = VALID_UNITS.includes(unit as PriceUnit)
    ? unit as PriceUnit
    : 'unknown';

  const quantity = Number(value.priceUnitQuantity);
  const priceUnitQuantity = Number.isFinite(quantity) && quantity > 0
    ? (priceUnit === 'unknown' ? 0 : quantity)
    : (priceUnit === 'pc' ? 1 : 0);

  return {
    priceRawText: normalizeText(value.priceRawText) || undefined,
    priceCurrency,
    priceUnit,
    priceUnitQuantity,
    priceRmb,
    priceNormalizationNote: normalizeText(value.priceNormalizationNote) || undefined,
  };
}
