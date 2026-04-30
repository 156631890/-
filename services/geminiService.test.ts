import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestAiJson } from './ai/proxyClient';
import { analyzeBusinessCard, analyzeImage, enrichProductData } from './geminiService';

vi.mock('./ai/proxyClient', () => ({
  requestAiJson: vi.fn(),
}));

const requestAiJsonMock = vi.mocked(requestAiJson);

describe('geminiService proxy failures', () => {
  beforeEach(() => {
    requestAiJsonMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('propagates image-analysis proxy failures instead of creating a manual placeholder', async () => {
    requestAiJsonMock.mockRejectedValueOnce(new Error('proxy unavailable'));

    await expect(analyzeImage('data:image/jpeg;base64,abc')).rejects.toThrow('proxy unavailable');
  });

  it('propagates business-card proxy failures instead of creating an empty supplier', async () => {
    requestAiJsonMock.mockRejectedValueOnce(new Error('proxy unavailable'));

    await expect(analyzeBusinessCard('data:image/jpeg;base64,abc')).rejects.toThrow('proxy unavailable');
  });

  it('rejects empty business-card JSON instead of creating an empty supplier', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      companyName: '',
      contactPerson: '',
      phone: '',
      address: '',
    });

    await expect(analyzeBusinessCard('data:image/jpeg;base64,abc')).rejects.toThrow(
      'AI business card response did not include supplier information',
    );
  });

  it('rejects empty product JSON instead of creating an unknown product', async () => {
    requestAiJsonMock.mockResolvedValueOnce({});

    await expect(analyzeImage('data:image/jpeg;base64,abc')).rejects.toThrow(
      'AI product image response did not include enough product information',
    );
  });

  it('rejects product JSON with only empty strings and zero values', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      nameCn: '',
      nameEn: '',
      materialEn: '',
      hsCode: '',
      priceRmb: 0,
      moq: 0,
      boxLength: 0,
      boxWidth: 0,
      boxHeight: 0,
      pcsPerBox: 0,
    });

    await expect(analyzeImage('data:image/jpeg;base64,abc')).rejects.toThrow(
      'AI product image response did not include enough product information',
    );
  });

  it('rejects named product JSON without pricing, MOQ, and packing numbers', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      nameCn: 'Toy car',
      nameEn: 'Toy Car',
      materialEn: 'Plastic',
      hsCode: '9503006000',
      priceRmb: 0,
      moq: 0,
      boxLength: 0,
      boxWidth: 0,
      boxHeight: 0,
      pcsPerBox: 0,
    });

    await expect(analyzeImage('data:image/jpeg;base64,abc')).rejects.toThrow(
      'AI product image response did not include enough product information',
    );
  });

  it('rejects product JSON without complete packing numbers', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      nameCn: 'Toy car',
      nameEn: 'Toy Car',
      materialEn: 'Plastic',
      hsCode: '9503006000',
      priceRmb: 12.5,
      moq: 24,
      boxLength: 60,
      boxWidth: 40,
      boxHeight: 0,
      pcsPerBox: 12,
    });

    await expect(analyzeImage('data:image/jpeg;base64,abc')).rejects.toThrow(
      'AI product image response did not include enough product information',
    );
  });

  it('normalizes valid product JSON without placeholder names', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      nameCn: '  Toy car  ',
      priceRmb: '12.5',
      moq: '24',
      nameEn: '',
      materialEn: 'Plastic',
      hsCode: '9503006000',
      boxLength: '60',
      boxWidth: '40',
      boxHeight: '30',
      pcsPerBox: '12',
    });

    await expect(analyzeImage('data:image/jpeg;base64,abc')).resolves.toEqual({
      nameCn: 'Toy car',
      priceRmb: 12.5,
      moq: 24,
      nameEn: 'Toy car',
      materialEn: 'Plastic',
      hsCode: '9503006000',
      boxLength: 60,
      boxWidth: 40,
      boxHeight: 30,
      pcsPerBox: 12,
    });
  });

  it('keeps only China Customs 10-digit HS codes in image analysis results', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      nameCn: 'Toy car',
      priceRmb: 12.5,
      moq: 24,
      nameEn: '',
      materialEn: 'Plastic',
      hsCode: '950300',
      boxLength: 60,
      boxWidth: 40,
      boxHeight: 30,
      pcsPerBox: 12,
    });

    await expect(analyzeImage('data:image/jpeg;base64,abc')).resolves.toMatchObject({
      hsCode: '',
    });
  });

  it('normalizes formatted China Customs 10-digit HS codes in image analysis results', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      nameCn: 'Toy car',
      priceRmb: 12.5,
      moq: 24,
      nameEn: '',
      materialEn: 'Plastic',
      hsCode: '9503.00.6000',
      boxLength: 60,
      boxWidth: 40,
      boxHeight: 30,
      pcsPerBox: 12,
    });

    await expect(analyzeImage('data:image/jpeg;base64,abc')).resolves.toMatchObject({
      hsCode: '9503006000',
    });
  });

  it('normalizes product image price metadata', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      nameCn: 'Toy car',
      priceRawText: ' 30 RMB/dozen ',
      priceCurrency: 'RMB',
      priceUnit: 'dozen',
      priceUnitQuantity: 12,
      priceRmb: '2.5',
      priceNormalizationNote: ' Visible 30 RMB/dozen normalized to 2.5 RMB/pc ',
      moq: 24,
      nameEn: '',
      materialEn: 'Plastic',
      hsCode: '9503006000',
      boxLength: 60,
      boxWidth: 40,
      boxHeight: 30,
      pcsPerBox: 12,
    });

    await expect(analyzeImage('data:image/jpeg;base64,abc')).resolves.toMatchObject({
      priceRawText: '30 RMB/dozen',
      priceCurrency: 'RMB',
      priceUnit: 'dozen',
      priceUnitQuantity: 12,
      priceRmb: 2.5,
      priceNormalizationNote: 'Visible 30 RMB/dozen normalized to 2.5 RMB/pc',
    });
  });

  it('keeps only China Customs 10-digit HS codes in product enrichment results', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      nameEn: 'Toy car',
      nameEs: 'Toy car',
      materialEn: 'Plastic',
      hsCode: '950300',
      usage: 'Toy',
      taxRate: 0,
      categoryMain: 'Toys',
      categorySub: 'Toy vehicles',
    });

    await expect(enrichProductData('Toy car')).resolves.toMatchObject({
      hsCode: '',
    });
  });
});
