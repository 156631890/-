import { describe, expect, it } from 'vitest';
import { imageAnalysisPrompt } from './prompts';

describe('imageAnalysisPrompt', () => {
  it('prioritizes visible OCR prices before estimating product price', () => {
    expect(imageAnalysisPrompt).toContain('visible price');
    expect(imageAnalysisPrompt).toContain('OCR');
    expect(imageAnalysisPrompt).toContain('Only estimate priceRmb');
  });
});
