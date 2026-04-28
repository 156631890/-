import { AppSettings, Product } from '../../types';

export type ExportType = 'master' | 'packinglist' | 'invoice' | 'quotation';

export interface ExportInput {
  type: ExportType;
  products: Product[];
  settings: AppSettings;
}

export interface ExportResult {
  skippedImages: number;
}
