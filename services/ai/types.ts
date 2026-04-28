import { AIEnrichmentResult, SupplierInfo } from '../../types';

export type AiProxyMode = 'openai-compatible' | 'gemini-compatible';

export interface AiProxyConfig {
  baseUrl: string;
  apiKey?: string;
  mode: AiProxyMode;
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
  priceRmb: number;
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
