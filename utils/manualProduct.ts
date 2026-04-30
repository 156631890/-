import { AppSettings, DraftFolder, ManualProductValues, ProcessingStatus, Product } from '../types';
import { normalizeChinaHsCode } from './hsCode';

interface CreateManualProductInput {
  folder: DraftFolder;
  imageUrl: string;
  id: string;
  sku: string;
  timestamp: number;
  settings: AppSettings;
  values: ManualProductValues;
}

const toNumber = (value: unknown) => Number(value) || 0;

export function createManualProduct({
  folder,
  imageUrl,
  id,
  sku,
  timestamp,
  settings,
  values,
}: CreateManualProductInput): Product {
  const hsCode = normalizeChinaHsCode(values.hsCode);
  const product: Product = {
    id,
    sku,
    photoUrl: imageUrl,
    supplier: folder.supplier,
    nameCn: values.nameCn.trim(),
    nameEn: values.nameEn.trim(),
    materialEn: values.materialEn.trim(),
    hsCode,
    hsCodeReviewed: Boolean(hsCode && values.hsCodeReviewed),
    priceRmb: toNumber(values.priceRmb),
    moq: toNumber(values.moq),
    shopNo: values.shopNo.trim() || folder.supplier.address || folder.name,
    boxLength: toNumber(values.boxLength),
    boxWidth: toNumber(values.boxWidth),
    boxHeight: toNumber(values.boxHeight),
    pcsPerBox: toNumber(values.pcsPerBox),
    taxRate: toNumber(values.taxRate),
    status: ProcessingStatus.DRAFT,
    timestamp,
  };
  const cbm = product.boxLength && product.boxWidth && product.boxHeight
    ? (product.boxLength * product.boxWidth * product.boxHeight) / 1_000_000
    : 0;
  const priceStockUsd = product.priceRmb > 0 && settings.usdRmbRate > 0 ? product.priceRmb / settings.usdRmbRate : 0;
  return {
    ...product,
    cbm: Number(cbm.toFixed(4)),
    priceStockUsd: Number(priceStockUsd.toFixed(3)),
  };
}
