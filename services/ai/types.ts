import { AIEnrichmentResult, SupplierInfo } from '../../types';

export type AiProxyMode = 'openai-compatible' | 'gemini-compatible';
export type AiProxyInputMode = 'multimodal' | 'text-only';

export interface AiProxyConfig {
  baseUrl: string;
  apiKey?: string;
  mode: AiProxyMode;
  inputMode: AiProxyInputMode;
  model: string;
  timeoutMs: number;
}

export interface AiTextPart {
  type: 'text';
  text: string;
}

export interface AiImagePart {
  type: 'image';
  dataUrl: string;
}

export type AiPart = AiTextPart | AiImagePart;

export interface AiJsonRequest {
  parts: AiPart[];
  system?: string;
}

export interface ImageAnalysisResult {
  nameCn: string;
  priceRawText?: string;
  priceCurrency?: 'RMB' | 'USD' | 'EUR' | 'UNKNOWN';
  priceUnit?: 'pc' | 'box' | 'set' | 'dozen' | 'pack' | 'carton' | 'unknown';
  priceUnitQuantity?: number;
  priceRmb: number;
  priceNormalizationNote?: string;
  moq: number;
  nameEn: string;
  materialEn: string;
  boxLength: number;
  boxWidth: number;
  boxHeight: number;
  pcsPerBox: number;
  hsCode: string;
}

export type BusinessCardResult = SupplierInfo;
export type ProductEnrichmentResult = AIEnrichmentResult;
