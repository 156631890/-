import { AIEnrichmentResult, SupplierInfo } from '../types';
import { businessCardPrompt, imageAnalysisPrompt, productEnrichmentPrompt } from './ai/prompts';
import { requestAiJson } from './ai/proxyClient';
import { BusinessCardResult, ImageAnalysisResult } from './ai/types';

const normalizeNumber = (value: unknown) => Number(value) || 0;

const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeChinaHsCode = (value: unknown) => {
  const digits = normalizeText(value).replace(/\D/g, '');
  return digits.length === 10 ? digits : '';
};

const toImageDataUrl = (base64Image: string) =>
  base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;

const normalizeBusinessCard = (result: BusinessCardResult): SupplierInfo => {
  const supplier = {
    companyName: normalizeText(result.companyName),
    contactPerson: normalizeText(result.contactPerson),
    phone: normalizeText(result.phone),
    address: normalizeText(result.address),
    email: normalizeText(result.email) || undefined,
  };

  if (!supplier.companyName && !supplier.contactPerson && !supplier.phone && !supplier.address && !supplier.email) {
    throw new Error('AI business card response did not include supplier information.');
  }

  return supplier;
};

const normalizeImageAnalysis = (result: ImageAnalysisResult): ImageAnalysisResult => {
  const nameCn = normalizeText(result.nameCn);
  const nameEn = normalizeText(result.nameEn);
  const materialEn = normalizeText(result.materialEn);
  const hsCode = normalizeChinaHsCode(result.hsCode);
  const normalized = {
    nameCn: nameCn || nameEn,
    priceRmb: normalizeNumber(result.priceRmb),
    moq: normalizeNumber(result.moq),
    nameEn: nameEn || nameCn,
    materialEn,
    boxLength: normalizeNumber(result.boxLength),
    boxWidth: normalizeNumber(result.boxWidth),
    boxHeight: normalizeNumber(result.boxHeight),
    pcsPerBox: normalizeNumber(result.pcsPerBox),
    hsCode,
  };
  const hasPricing = normalized.priceRmb > 0;
  const hasOrderQuantity = normalized.moq > 0;
  const hasPacking =
    normalized.boxLength > 0 &&
    normalized.boxWidth > 0 &&
    normalized.boxHeight > 0 &&
    normalized.pcsPerBox > 0;

  if (!normalized.nameCn || !hasPricing || !hasOrderQuantity || !hasPacking) {
    throw new Error('AI product image response did not include enough product information.');
  }

  return normalized;
};

export const analyzeBusinessCard = async (base64Image: string): Promise<SupplierInfo> => {
  try {
    const result = await requestAiJson<BusinessCardResult>({
      parts: [
        { type: 'image', dataUrl: toImageDataUrl(base64Image) },
        { type: 'text', text: businessCardPrompt },
      ],
    });
    return normalizeBusinessCard(result);
  } catch (error) {
    console.error('Business Card Analysis failed:', error);
    throw error;
  }
};

export const enrichProductData = async (nameCn: string): Promise<AIEnrichmentResult> => {
  try {
    const result = await requestAiJson<AIEnrichmentResult>({
      parts: [{ type: 'text', text: productEnrichmentPrompt(nameCn) }],
    });
    return {
      ...result,
      hsCode: normalizeChinaHsCode(result.hsCode),
    };
  } catch (error) {
    console.error('AI Enrichment failed:', error);
    throw error;
  }
};

export const analyzeImage = async (base64Image: string): Promise<ImageAnalysisResult> => {
  try {
    const result = await requestAiJson<ImageAnalysisResult>({
      parts: [
        { type: 'image', dataUrl: toImageDataUrl(base64Image) },
        { type: 'text', text: imageAnalysisPrompt },
      ],
    });

    return normalizeImageAnalysis(result);
  } catch (error) {
    console.error('Image Analysis failed:', error);
    throw error;
  }
};
