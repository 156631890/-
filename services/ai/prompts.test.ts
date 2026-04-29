import { describe, expect, it } from 'vitest';
import { imageAnalysisPrompt, productEnrichmentPrompt } from './prompts';

describe('imageAnalysisPrompt', () => {
  it('prioritizes visible OCR prices before estimating product price', () => {
    expect(imageAnalysisPrompt).toContain('visible price');
    expect(imageAnalysisPrompt).toContain('OCR');
    expect(imageAnalysisPrompt).toContain('Only estimate priceRmb');
  });

  it('asks for China Customs 10-digit HS code suggestions with manual review fallback', () => {
    expect(imageAnalysisPrompt).toContain('China Customs 10-digit commodity code');
    expect(imageAnalysisPrompt).toContain('Do not output a 6-digit international HS code');
    expect(imageAnalysisPrompt).toContain('return an empty string for hsCode');
  });
});

describe('productEnrichmentPrompt', () => {
  it('asks for China Customs 10-digit HS code suggestions with manual review fallback', () => {
    const prompt = productEnrichmentPrompt('plastic toy car');

    expect(prompt).toContain('China Customs 10-digit commodity code');
    expect(prompt).toContain('Do not output a 6-digit international HS code');
    expect(prompt).toContain('return an empty string for hsCode');
  });
});
