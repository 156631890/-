import { describe, expect, it } from 'vitest';
import { imageAnalysisPrompt, productEnrichmentPrompt } from './prompts';

describe('imageAnalysisPrompt', () => {
  it('prioritizes visible OCR prices before estimating product price', () => {
    expect(imageAnalysisPrompt).toContain('visible price');
    expect(imageAnalysisPrompt).toContain('OCR');
    expect(imageAnalysisPrompt).toContain('Only estimate priceRmb');
  });

  it('asks for raw price unit metadata and normalized RMB per piece', () => {
    expect(imageAnalysisPrompt).toContain('priceRawText');
    expect(imageAnalysisPrompt).toContain('priceCurrency');
    expect(imageAnalysisPrompt).toContain('priceUnit');
    expect(imageAnalysisPrompt).toContain('priceUnitQuantity');
    expect(imageAnalysisPrompt).toContain('priceNormalizationNote');
    expect(imageAnalysisPrompt).toContain('RMB per piece');
  });

  it('asks for best-effort China Customs 10-digit HS code suggestions with manual review', () => {
    expect(imageAnalysisPrompt).toContain('China Customs 10-digit commodity code');
    expect(imageAnalysisPrompt).toContain('Do not output a 6-digit international HS code');
    expect(imageAnalysisPrompt).toContain('best available China Customs 10-digit');
    expect(imageAnalysisPrompt).not.toContain('return an empty string for hsCode');
  });
});

describe('productEnrichmentPrompt', () => {
  it('asks for best-effort China Customs 10-digit HS code suggestions with manual review', () => {
    const prompt = productEnrichmentPrompt('plastic toy car');

    expect(prompt).toContain('China Customs 10-digit commodity code');
    expect(prompt).toContain('Do not output a 6-digit international HS code');
    expect(prompt).toContain('best available China Customs 10-digit');
    expect(prompt).not.toContain('return an empty string for hsCode');
  });
});
