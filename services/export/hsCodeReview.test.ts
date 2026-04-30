import { describe, expect, it } from 'vitest';
import { ProcessingStatus, Product } from '../../types';
import { formatHsCodeReviewWarning, getHsCodeReviewSummary, hasHsCodeReviewIssues } from './hsCodeReview';

const product = (patch: Partial<Product>): Product => ({
  id: patch.id || '1',
  sku: patch.sku || 'YW-10001',
  photoUrl: 'data:image/jpeg;base64,a',
  nameCn: patch.nameCn || 'Toy car',
  nameEn: patch.nameEn,
  hsCode: patch.hsCode,
  hsCodeReviewed: patch.hsCodeReviewed,
  boxLength: 60,
  boxWidth: 40,
  boxHeight: 30,
  pcsPerBox: 12,
  priceRmb: 12,
  moq: 24,
  shopNo: 'A-100',
  timestamp: 1,
  status: ProcessingStatus.DRAFT,
});

describe('HS Code export review helpers', () => {
  it('separates reviewed, unreviewed, and missing HS Code products', () => {
    const reviewed = product({ id: 'reviewed', hsCode: '9503006000', hsCodeReviewed: true });
    const unreviewed = product({ id: 'unreviewed', hsCode: '9503006000', hsCodeReviewed: false });
    const missing = product({ id: 'missing', hsCode: '' });

    expect(getHsCodeReviewSummary([reviewed, unreviewed, missing])).toEqual({
      reviewed: [reviewed],
      unreviewed: [unreviewed],
      missing: [missing],
    });
  });

  it('requires a warning when exported products include unreviewed or missing HS Codes', () => {
    expect(hasHsCodeReviewIssues(getHsCodeReviewSummary([product({ hsCode: '9503006000', hsCodeReviewed: true })]))).toBe(false);
    expect(hasHsCodeReviewIssues(getHsCodeReviewSummary([product({ hsCode: '9503006000', hsCodeReviewed: false })]))).toBe(true);
    expect(hasHsCodeReviewIssues(getHsCodeReviewSummary([product({ hsCode: '' })]))).toBe(true);
  });

  it('formats an actionable export warning with product counts', () => {
    const warning = formatHsCodeReviewWarning(getHsCodeReviewSummary([
      product({ sku: 'YW-1', hsCode: '9503006000', hsCodeReviewed: false }),
      product({ sku: 'YW-2', hsCode: '' }),
    ]));

    expect(warning).toContain('1 product(s) have an unreviewed HS Code');
    expect(warning).toContain('1 product(s) are missing an HS Code');
    expect(warning).toContain('Continue export?');
  });
});
