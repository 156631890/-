import { Product } from '../../types';

export interface HsCodeReviewSummary {
  reviewed: Product[];
  unreviewed: Product[];
  missing: Product[];
}

export const getHsCodeReviewSummary = (products: Product[]): HsCodeReviewSummary => ({
  reviewed: products.filter((product) => Boolean(product.hsCode && product.hsCodeReviewed)),
  unreviewed: products.filter((product) => Boolean(product.hsCode && !product.hsCodeReviewed)),
  missing: products.filter((product) => !product.hsCode),
});

export const hasHsCodeReviewIssues = (summary: HsCodeReviewSummary): boolean =>
  summary.unreviewed.length > 0 || summary.missing.length > 0;

export const formatHsCodeReviewWarning = (summary: HsCodeReviewSummary): string => {
  const lines = ['HS Code review warning:'];
  if (summary.unreviewed.length > 0) {
    lines.push(`${summary.unreviewed.length} product(s) have an unreviewed HS Code.`);
  }
  if (summary.missing.length > 0) {
    lines.push(`${summary.missing.length} product(s) are missing an HS Code.`);
  }
  lines.push('Continue export?');
  return lines.join('\n');
};
