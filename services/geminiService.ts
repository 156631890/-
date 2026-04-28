import { AIEnrichmentResult, SupplierInfo } from '../types';
import { businessCardPrompt, imageAnalysisPrompt, productEnrichmentPrompt } from './ai/prompts';
import { requestAiJson } from './ai/proxyClient';
import { BusinessCardResult, ImageAnalysisResult } from './ai/types';

const normalizeNumber = (value: unknown) => Number(value) || 0;

const toImageDataUrl = (base64Image: string) =>
  base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;

export const analyzeBusinessCard = async (base64Image: string): Promise<SupplierInfo> => {
  try {
    return await requestAiJson<BusinessCardResult>({
      parts: [
        { type: 'image', dataUrl: toImageDataUrl(base64Image) },
        { type: 'text', text: businessCardPrompt },
      ],
    });
  } catch (error) {
    console.error('Business Card Analysis failed:', error);
    return {
      companyName: '',
      contactPerson: '',
      phone: '',
      address: '',
    };
  }
};

export const enrichProductData = async (nameCn: string): Promise<AIEnrichmentResult> => {
  try {
    return await requestAiJson<AIEnrichmentResult>({
      parts: [{ type: 'text', text: productEnrichmentPrompt(nameCn) }],
    });
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

    return {
      nameCn: result.nameCn || '待识别商品',
      priceRmb: normalizeNumber(result.priceRmb),
      moq: normalizeNumber(result.moq),
      nameEn: result.nameEn || 'Unknown Product',
      materialEn: result.materialEn || 'General',
      boxLength: normalizeNumber(result.boxLength),
      boxWidth: normalizeNumber(result.boxWidth),
      boxHeight: normalizeNumber(result.boxHeight),
      pcsPerBox: normalizeNumber(result.pcsPerBox),
      hsCode: result.hsCode || '',
    };
  } catch (error) {
    console.error('Image Analysis failed:', error);
    return {
      nameCn: '识别失败 (Manual Entry)',
      priceRmb: 0,
      moq: 0,
      nameEn: '',
      materialEn: '',
      hsCode: '',
      boxLength: 0,
      boxWidth: 0,
      boxHeight: 0,
      pcsPerBox: 0,
    };
  }
};
