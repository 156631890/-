# Yiwu Sourcing AI Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Yiwu Sourcing AI app build reliably on Windows, use a Codex reverse-proxy API for Gemini workflows, and improve persistence, search, export, code structure, and UX without changing the core sourcing workflow.

**Architecture:** Keep the app as a Vite React frontend with local IndexedDB storage. Move AI, export, metrics, filtering, and persistence behavior into focused services and utilities, then slim down the large page components. Use environment-driven proxy configuration so the same UI can call either an OpenAI-compatible Codex proxy or a Gemini-compatible proxy.

**Tech Stack:** React 19, TypeScript, Vite, IndexedDB, Vitest, ExcelJS, FileSaver, jsPDF, jsPDF AutoTable, lucide-react.

---

## File Structure

Create:

- `.env.example`: documents proxy, model, and app config.
- `vitest.config.ts`: Vitest setup for utility tests.
- `utils/json.ts`: strict JSON extraction from model text.
- `utils/productMetrics.ts`: pure costing, carton, and amount calculations.
- `utils/productFilters.ts`: desktop/mobile product search.
- `utils/productMetrics.test.ts`: tests metric edge cases.
- `utils/productFilters.test.ts`: tests search behavior.
- `utils/json.test.ts`: tests AI JSON parsing.
- `services/ai/config.ts`: reads and validates Vite env.
- `services/ai/types.ts`: AI request and normalized result contracts.
- `services/ai/prompts.ts`: product, card, and enrichment prompts.
- `services/ai/proxyClient.ts`: Codex reverse-proxy HTTP client.
- `services/export/exportTypes.ts`: shared export contracts.
- `services/export/excelExport.ts`: Excel generation.
- `services/export/pdfExport.ts`: PDF generation.
- `components/common/ProcessingOverlay.tsx`: shared long-running operation overlay.
- `components/dashboard/ProductTable.tsx`: desktop product table.
- `components/dashboard/DashboardToolbar.tsx`: desktop header and controls.
- `components/dashboard/InvoiceConfigModal.tsx`: invoice configuration modal.
- `components/mobile/ShopFolderList.tsx`: mobile shop folder list.
- `components/mobile/ShopFolderDetail.tsx`: mobile folder detail.
- `components/mobile/MobileHistory.tsx`: mobile processed product history.

Modify:

- `package.json`: add test scripts and npm export dependencies.
- `index.html`: remove CDN import map and export-library globals once dependencies are bundled.
- `vite.config.ts`: remove legacy frontend provider-key defines and use `import.meta.env` proxy configuration.
- `README.md`: document setup, Windows checkout note, proxy config, and verification commands.
- `services/geminiService.ts`: become a compatibility wrapper over `services/ai`.
- `services/db.ts`: add settings store and transaction-complete semantics.
- `types.ts`: add settings, export, and AI error types.
- `utils/i18n.ts`: repair broken strings and add missing UI labels.
- `App.tsx`: use reliable optimistic rollback and persisted settings.
- `components/Dashboard.tsx`: use new utilities/services and extract focused components.
- `components/MobileEntry.tsx`: use new utilities/services and extract focused components.

Remove from tracking:

- `migrated_prompt_history/prompt_2025-12-18T05:30:00.988Z.json`: invalid Windows path in the current branch.

---

## Task 1: Repository, Dependencies, And Build Baseline

**Files:**

- Modify: `package.json`
- Modify: `index.html`
- Modify: `vite.config.ts`
- Modify: `utils/i18n.ts`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Remove from tracking: `migrated_prompt_history/prompt_2025-12-18T05:30:00.988Z.json`

- [ ] **Step 1: Remove the invalid Windows path from the index**

Run:

```powershell
git update-index --force-remove -- "migrated_prompt_history/prompt_2025-12-18T05:30:00.988Z.json"
```

Expected:

```text
```

Then run:

```powershell
git status --short
```

Expected includes:

```text
D  migrated_prompt_history/prompt_2025-12-18T05:30:00.988Z.json
```

- [ ] **Step 2: Update dependencies and scripts**

Replace the `scripts`, `dependencies`, and `devDependencies` blocks in `package.json` with:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "exceljs": "^4.4.0",
    "file-saver": "^2.0.5",
    "jspdf": "^2.5.2",
    "jspdf-autotable": "^3.8.4",
    "lucide-react": "^0.556.0",
    "react": "^19.2.1",
    "react-dom": "^19.2.1"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.7",
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0",
    "vitest": "^3.2.4"
  }
}
```

Keep the existing `name`, `private`, `version`, and `type` fields.

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 4: Add environment example**

Create `.env.example`:

```bash
VITE_AI_PROXY_BASE_URL=http://127.0.0.1:3001/v1
VITE_AI_PROXY_API_KEY=
VITE_AI_PROXY_MODE=openai-compatible
VITE_AI_MODEL=gemini-2.5-flash
VITE_AI_TIMEOUT_MS=60000
```

- [ ] **Step 5: Remove CDN globals and import map from `index.html`**

In `index.html`, remove these script blocks:

```html
<script src="https://cdn.tailwindcss.com"></script>
<!-- legacy export-library CDN scripts -->
<script type="importmap">
...
</script>
<link rel="stylesheet" href="/index.css">
```

Keep the scrollbar and `.glass-nav` styles. If Tailwind classes are still used, add Tailwind properly in a later follow-up; for this task, keep the current CDN until UI CSS is migrated if removing it makes the app unstyled. The build requirement is that bundled JS dependencies no longer depend on import maps or export-library globals.

- [ ] **Step 6: Simplify Vite config**

Replace `vite.config.ts` with:

```ts
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 7: Repair `utils/i18n.ts` enough for TypeScript build**

Replace corrupted non-English strings with valid string literals. Use these minimal keys for all languages:

```ts
import { Language } from '../types';

type TranslationKey =
  | 'appTitle' | 'newSourcing' | 'addProduct' | 'batchUpload' | 'batchDesc'
  | 'selectImages' | 'manualEntry' | 'productPhoto' | 'captureDetails'
  | 'productName' | 'productNamePlaceholder' | 'rmbCost' | 'moq' | 'shopNo'
  | 'packing' | 'autoDetect' | 'boxDims' | 'pcsCtn' | 'save' | 'saveProduct'
  | 'saveClose' | 'list' | 'new' | 'history' | 'selected' | 'items' | 'cancel'
  | 'select' | 'delete' | 'aiEnrich' | 'excel' | 'exportOptions' | 'format'
  | 'masterData' | 'quotation' | 'packingList' | 'invoice' | 'sessionHeader'
  | 'companyName' | 'contactPerson' | 'phone' | 'address' | 'done' | 'tapToScan'
  | 'processing' | 'batchComplete' | 'saved' | 'dashboard' | 'recordsFound'
  | 'newSourcingBatch' | 'rateEur' | 'frt' | 'rateUsd' | 'searchPlaceholder'
  | 'details' | 'category' | 'specs' | 'cost' | 'landed' | 'actions'
  | 'invoiceConfig' | 'sellerDetails' | 'shipmentDetails' | 'buyerInfo'
  | 'saveDownload' | 'welcome' | 'intro' | 'roleSourcing'
  | 'roleSourcingDesc' | 'roleAdmin' | 'roleAdminDesc' | 'enter' | 'backHome'
  | 'myShops' | 'newShop' | 'scanCardToCreate' | 'emptyFolders' | 'shopName'
  | 'photos' | 'addPhotos' | 'processSelected' | 'analyzingCard'
  | 'deleteFolder' | 'selectAll' | 'unselectAll' | 'rename';

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    appTitle: 'Yiwu Sourcing AI',
    newSourcing: 'New Sourcing',
    addProduct: 'Add Product',
    batchUpload: 'Quick Batch',
    batchDesc: 'Upload multiple photos and process them together.',
    selectImages: 'Select Images',
    manualEntry: 'Manual Entry',
    productPhoto: 'Product Photo',
    captureDetails: 'Capture details clearly.',
    productName: 'Product Name',
    productNamePlaceholder: 'e.g. Toy Car',
    rmbCost: 'RMB Cost',
    moq: 'MOQ',
    shopNo: 'Shop No.',
    packing: 'Packing Info',
    autoDetect: 'Auto-Detect',
    boxDims: 'Box (LxWxH)',
    pcsCtn: 'Pcs/Ctn',
    save: 'Save',
    saveProduct: 'Save Product',
    saveClose: 'Save & Close',
    list: 'List',
    new: 'New',
    history: 'History',
    selected: 'Selected',
    items: 'items',
    cancel: 'Cancel',
    select: 'Select',
    delete: 'Delete',
    aiEnrich: 'AI Enrich',
    excel: 'Excel',
    exportOptions: 'Export Options',
    format: 'Format',
    masterData: 'Master Data',
    quotation: 'Quotation',
    packingList: 'Packing List',
    invoice: 'Commercial Invoice',
    sessionHeader: 'Session Header Info',
    companyName: 'Company Name',
    contactPerson: 'Contact Person',
    phone: 'Phone',
    address: 'Address',
    done: 'Done',
    tapToScan: 'Tap to scan card or add info',
    processing: 'Processing',
    batchComplete: 'Batch complete',
    saved: 'Saved',
    dashboard: 'Product Master',
    recordsFound: 'records found',
    newSourcingBatch: 'New Sourcing / Batch',
    rateEur: 'Rate (EUR)',
    frt: 'Freight',
    rateUsd: 'USD Rate',
    searchPlaceholder: 'Search SKU, name, supplier, shop, or HS code...',
    details: 'Details',
    category: 'Category',
    specs: 'Specs',
    cost: 'Cost',
    landed: 'Landed',
    actions: 'Actions',
    invoiceConfig: 'Invoice Configuration',
    sellerDetails: 'Seller Details',
    shipmentDetails: 'Shipment Details',
    buyerInfo: 'Buyer Info',
    saveDownload: 'Save & Download',
    welcome: 'Yiwu Trade Assistant',
    intro: 'AI tool for sourcing agents and export documentation.',
    roleSourcing: 'Sourcing Mode',
    roleSourcingDesc: 'Mobile optimized capture and AI product entry.',
    roleAdmin: 'Manager Mode',
    roleAdminDesc: 'Desktop editing, costing, and document export.',
    enter: 'Enter',
    backHome: 'Home',
    myShops: 'My Shops / Folders',
    newShop: 'New Shop',
    scanCardToCreate: 'Scan Card to Create Folder',
    emptyFolders: 'No shops yet. Tap New Shop to start.',
    shopName: 'Shop Name',
    photos: 'Photos',
    addPhotos: 'Add Photos',
    processSelected: 'Process Selected',
    analyzingCard: 'Analyzing Card...',
    deleteFolder: 'Delete Folder',
    selectAll: 'Select All',
    unselectAll: 'Unselect All',
    rename: 'Rename',
  },
  zh: {} as Record<TranslationKey, string>,
  es: {} as Record<TranslationKey, string>,
};

translations.zh = { ...translations.en, appTitle: '义乌采购 AI 助手', welcome: '义乌外贸助手', roleSourcing: '采购模式', roleAdmin: '管理模式', backHome: '首页' };
translations.es = { ...translations.en, appTitle: 'Asistente de Compras Yiwu', welcome: 'Asistente Comercial Yiwu', roleSourcing: 'Modo Compra', roleAdmin: 'Modo Gestion', backHome: 'Inicio' };
```

- [ ] **Step 8: Install dependencies**

Run:

```powershell
cmd /c npm install --cache .npm-cache
```

Expected:

```text
added ... packages
```

- [ ] **Step 9: Verify baseline build**

Run:

```powershell
cmd /c npm run build
```

Expected:

```text
vite build
✓ built
```

- [ ] **Step 10: Commit repository baseline**

Run:

```powershell
git add .env.example index.html package.json package-lock.json vite.config.ts vitest.config.ts utils/i18n.ts
git add -u migrated_prompt_history
git commit -m "chore: stabilize project baseline"
```

---

## Task 2: Pure Utilities And Tests

**Files:**

- Create: `utils/json.ts`
- Create: `utils/productMetrics.ts`
- Create: `utils/productFilters.ts`
- Create: `utils/json.test.ts`
- Create: `utils/productMetrics.test.ts`
- Create: `utils/productFilters.test.ts`

- [ ] **Step 1: Add failing JSON parser tests**

Create `utils/json.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseJsonObject } from './json';

describe('parseJsonObject', () => {
  it('parses raw JSON', () => {
    expect(parseJsonObject<{ name: string }>('{"name":"toy"}')).toEqual({ name: 'toy' });
  });

  it('parses fenced JSON', () => {
    expect(parseJsonObject<{ hsCode: string }>('```json\n{"hsCode":"950300"}\n```')).toEqual({ hsCode: '950300' });
  });

  it('extracts JSON from wrapped text', () => {
    expect(parseJsonObject<{ price: number }>('result: {"price": 12.5} done')).toEqual({ price: 12.5 });
  });

  it('throws a readable error for invalid text', () => {
    expect(() => parseJsonObject('not json')).toThrow('AI response did not contain a JSON object');
  });
});
```

- [ ] **Step 2: Run parser test and confirm failure**

Run:

```powershell
cmd /c npm test -- utils/json.test.ts
```

Expected:

```text
Cannot find module './json'
```

- [ ] **Step 3: Implement JSON parser**

Create `utils/json.ts`:

```ts
export function parseJsonObject<T>(text: string | undefined): T {
  if (!text || !text.trim()) {
    throw new Error('AI response did not contain a JSON object');
  }

  const withoutFences = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const firstBrace = withoutFences.indexOf('{');
  const lastBrace = withoutFences.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error('AI response did not contain a JSON object');
  }

  const candidate = withoutFences.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(candidate) as T;
  } catch (error) {
    throw new Error(`AI response JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

- [ ] **Step 4: Add metrics tests**

Create `utils/productMetrics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calculateProductMetrics, getCartonQuantity } from './productMetrics';
import { ProcessingStatus, Product } from '../types';

const baseProduct: Product = {
  id: '1',
  sku: 'YW-10001',
  photoUrl: 'data:image/jpeg;base64,a',
  nameCn: '玩具车',
  boxLength: 60,
  boxWidth: 40,
  boxHeight: 50,
  pcsPerBox: 20,
  priceRmb: 14.4,
  moq: 35,
  shopNo: 'A-100',
  timestamp: 1,
  status: ProcessingStatus.DRAFT,
  taxRate: 5,
};

describe('product metrics', () => {
  it('calculates carton quantity rounded up from MOQ', () => {
    expect(getCartonQuantity(baseProduct)).toBe(2);
  });

  it('calculates CBM, freight, landed euro, and stock usd', () => {
    expect(calculateProductMetrics(baseProduct, { euroRmbRate: 7.8, usdRmbRate: 7.2, freightRateCbm: 150 })).toEqual({
      cbm: 0.12,
      freightPerPc: 0.9,
      landedCostEuro: 2.842,
      priceStockUsd: 2,
    });
  });

  it('does not divide by zero when pcs per box is missing', () => {
    expect(calculateProductMetrics({ ...baseProduct, pcsPerBox: 0 }, { euroRmbRate: 7.8, usdRmbRate: 7.2, freightRateCbm: 150 }).freightPerPc).toBe(0);
  });
});
```

- [ ] **Step 5: Implement metrics**

Create `utils/productMetrics.ts`:

```ts
import { Product } from '../types';

export interface RateSettings {
  euroRmbRate: number;
  usdRmbRate: number;
  freightRateCbm: number;
}

export interface ProductMetrics {
  cbm: number;
  freightPerPc: number;
  landedCostEuro: number;
  priceStockUsd: number;
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));

export function getCartonQuantity(product: Pick<Product, 'moq' | 'pcsPerBox'>): number {
  const pcsPerBox = product.pcsPerBox > 0 ? product.pcsPerBox : 1;
  return Math.max(1, Math.ceil((product.moq || 0) / pcsPerBox));
}

export function getOrderQuantity(product: Pick<Product, 'moq' | 'pcsPerBox'>): number {
  return getCartonQuantity(product) * (product.pcsPerBox > 0 ? product.pcsPerBox : 1);
}

export function calculateProductMetrics(product: Partial<Product>, settings: RateSettings): ProductMetrics {
  const cbm = product.boxLength && product.boxWidth && product.boxHeight
    ? (product.boxLength * product.boxWidth * product.boxHeight) / 1_000_000
    : 0;
  const freightPerPc = cbm > 0 && (product.pcsPerBox || 0) > 0
    ? (settings.freightRateCbm * cbm) / Number(product.pcsPerBox)
    : 0;
  const baseCostEuro = (product.priceRmb || 0) > 0 && settings.euroRmbRate > 0
    ? Number(product.priceRmb) / settings.euroRmbRate
    : 0;
  const dutyCost = baseCostEuro * ((product.taxRate || 0) / 100);
  const priceStockUsd = (product.priceRmb || 0) > 0 && settings.usdRmbRate > 0
    ? Number(product.priceRmb) / settings.usdRmbRate
    : 0;

  return {
    cbm: round(cbm, 4),
    freightPerPc: round(freightPerPc, 4),
    landedCostEuro: round(baseCostEuro + freightPerPc + dutyCost, 3),
    priceStockUsd: round(priceStockUsd, 3),
  };
}
```

- [ ] **Step 6: Add filtering tests**

Create `utils/productFilters.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { filterProducts } from './productFilters';
import { ProcessingStatus, Product } from '../types';

const products: Product[] = [
  {
    id: '1',
    sku: 'YW-10001',
    photoUrl: '',
    nameCn: '玩具车',
    nameEn: 'Toy Car',
    hsCode: '950300',
    supplier: { companyName: 'Yiwu Toys', contactPerson: 'Li', phone: '123', address: 'A-100' },
    shopNo: 'A-100',
    priceRmb: 10,
    moq: 20,
    boxLength: 1,
    boxWidth: 1,
    boxHeight: 1,
    pcsPerBox: 1,
    timestamp: 1,
    status: ProcessingStatus.DRAFT,
  },
];

describe('filterProducts', () => {
  it('returns all products for an empty query', () => {
    expect(filterProducts(products, '')).toHaveLength(1);
  });

  it('searches SKU, English name, supplier, shop, and HS code case-insensitively', () => {
    expect(filterProducts(products, 'toy')).toHaveLength(1);
    expect(filterProducts(products, 'yiwu')).toHaveLength(1);
    expect(filterProducts(products, 'a-100')).toHaveLength(1);
    expect(filterProducts(products, '950300')).toHaveLength(1);
  });

  it('returns no products when nothing matches', () => {
    expect(filterProducts(products, 'glass')).toHaveLength(0);
  });
});
```

- [ ] **Step 7: Implement filtering**

Create `utils/productFilters.ts`:

```ts
import { Product } from '../types';

export function filterProducts(products: Product[], query: string): Product[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return products;

  return products.filter((product) => {
    const haystack = [
      product.sku,
      product.nameCn,
      product.nameEn,
      product.nameEs,
      product.hsCode,
      product.shopNo,
      product.supplier?.companyName,
      product.supplier?.contactPerson,
      product.supplier?.phone,
      product.supplier?.address,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalized);
  });
}
```

- [ ] **Step 8: Run utility tests**

Run:

```powershell
cmd /c npm test
```

Expected:

```text
Test Files  3 passed
```

- [ ] **Step 9: Commit utilities**

Run:

```powershell
git add utils/json.ts utils/json.test.ts utils/productMetrics.ts utils/productMetrics.test.ts utils/productFilters.ts utils/productFilters.test.ts
git commit -m "feat: add product utility layer"
```

---

## Task 3: Codex Reverse-Proxy AI Client

**Files:**

- Create: `services/ai/config.ts`
- Create: `services/ai/types.ts`
- Create: `services/ai/prompts.ts`
- Create: `services/ai/proxyClient.ts`
- Modify: `services/geminiService.ts`
- Modify: `types.ts`

- [ ] **Step 1: Add AI types**

Create `services/ai/types.ts`:

```ts
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
```

- [ ] **Step 2: Add config reader**

Create `services/ai/config.ts`:

```ts
import { AiProxyConfig, AiProxyMode } from './types';

const isMode = (value: string): value is AiProxyMode =>
  value === 'openai-compatible' || value === 'gemini-compatible';

export function getAiProxyConfig(): AiProxyConfig {
  const baseUrl = import.meta.env.VITE_AI_PROXY_BASE_URL?.trim();
  const modeRaw = import.meta.env.VITE_AI_PROXY_MODE?.trim();
  const model = import.meta.env.VITE_AI_MODEL?.trim();
  const timeoutMs = Number(import.meta.env.VITE_AI_TIMEOUT_MS || 60000);

  if (!baseUrl) {
    throw new Error('Missing VITE_AI_PROXY_BASE_URL. Configure the Codex reverse-proxy API URL.');
  }
  if (!modeRaw) {
    throw new Error('Missing VITE_AI_PROXY_MODE. Set it to openai-compatible or gemini-compatible.');
  }
  if (!isMode(modeRaw)) {
    throw new Error('VITE_AI_PROXY_MODE must be openai-compatible or gemini-compatible.');
  }
  if (!model) {
    throw new Error('Missing VITE_AI_MODEL. Configure the model served by the Codex reverse proxy.');
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    apiKey: import.meta.env.VITE_AI_PROXY_API_KEY?.trim() || undefined,
    mode: modeRaw,
    model,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60000,
  };
}
```

- [ ] **Step 3: Add prompt builders**

Create `services/ai/prompts.ts`:

```ts
export const businessCardPrompt = [
  'Extract business card information.',
  'Return JSON with companyName, contactPerson, phone, address, and email.',
  'Use empty strings for missing fields.',
].join(' ');

export const imageAnalysisPrompt = [
  'Role: Yiwu sourcing and customs assistant.',
  'Analyze the product image and return estimated sourcing data as JSON.',
  'Fields: nameCn, nameEn, materialEn, hsCode, priceRmb, moq, boxLength, boxWidth, boxHeight, pcsPerBox.',
  'Use numeric values for price and packing fields.',
].join(' ');

export function productEnrichmentPrompt(nameCn: string): string {
  return [
    'You are a customs classification specialist.',
    `Product Chinese Name: ${nameCn}`,
    'Return only JSON with nameEn, nameEs, categoryMain, categorySub, materialEn, hsCode, usage, and taxRate.',
    'Use a 6-digit international HS code. If uncertain, set hsCode to "Needs Manual Review".',
  ].join('\n');
}
```

- [ ] **Step 4: Add proxy client**

Create `services/ai/proxyClient.ts`:

```ts
import { parseJsonObject } from '../../utils/json';
import { getAiProxyConfig } from './config';
import { AiJsonRequest, AiPart } from './types';

function toOpenAiContent(parts: AiPart[]) {
  return parts.map((part) => {
    if (part.type === 'text') {
      return { type: 'text', text: part.text };
    }
    return { type: 'image_url', image_url: { url: part.dataUrl } };
  });
}

function toGeminiParts(parts: AiPart[]) {
  return parts.map((part) => {
    if (part.type === 'text') {
      return { text: part.text };
    }
    const [metadata, data] = part.dataUrl.split(',');
    const mimeType = metadata.match(/^data:(.*);base64$/)?.[1] || 'image/jpeg';
    return { inlineData: { mimeType, data } };
  });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function requestAiJson<T>(request: AiJsonRequest): Promise<T> {
  const config = getAiProxyConfig();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const body = config.mode === 'openai-compatible'
    ? {
        model: config.model,
        messages: [
          ...(request.system ? [{ role: 'system', content: request.system }] : []),
          { role: 'user', content: toOpenAiContent(request.parts) },
        ],
        temperature: 0.2,
      }
    : {
        model: config.model,
        contents: [{ role: 'user', parts: toGeminiParts(request.parts) }],
        generationConfig: { temperature: 0.2 },
      };

  const endpoint = config.mode === 'openai-compatible'
    ? `${config.baseUrl}/chat/completions`
    : `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`;

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }, config.timeoutMs);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`AI proxy request failed with ${response.status}: ${text || response.statusText}`);
  }

  const data = await response.json();
  const text = config.mode === 'openai-compatible'
    ? data.choices?.[0]?.message?.content
    : data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text).filter(Boolean).join('\n');

  return parseJsonObject<T>(text);
}
```

- [ ] **Step 5: Replace `services/geminiService.ts` with proxy-backed wrapper**

Use:

```ts
import { AIEnrichmentResult, SupplierInfo } from '../types';
import { requestAiJson } from './ai/proxyClient';
import { businessCardPrompt, imageAnalysisPrompt, productEnrichmentPrompt } from './ai/prompts';
import { BusinessCardResult, ImageAnalysisResult } from './ai/types';

const normalizeNumber = (value: unknown) => Number(value) || 0;

export const analyzeBusinessCard = async (base64Image: string): Promise<SupplierInfo> => {
  try {
    return await requestAiJson<BusinessCardResult>({
      parts: [
        { type: 'image', dataUrl: base64Image },
        { type: 'text', text: businessCardPrompt },
      ],
    });
  } catch (error) {
    console.error('Business card analysis failed:', error);
    throw error;
  }
};

export const enrichProductData = async (nameCn: string): Promise<AIEnrichmentResult> => {
  return requestAiJson<AIEnrichmentResult>({
    parts: [{ type: 'text', text: productEnrichmentPrompt(nameCn) }],
  });
};

export const analyzeImage = async (base64Image: string): Promise<ImageAnalysisResult> => {
  try {
    const result = await requestAiJson<ImageAnalysisResult>({
      parts: [
        { type: 'image', dataUrl: base64Image },
        { type: 'text', text: imageAnalysisPrompt },
      ],
    });

    return normalizeImageAnalysis(result);
  } catch (error) {
    console.error('Image analysis failed:', error);
    throw error;
  }
};
```

- [ ] **Step 6: Run tests and build**

Run:

```powershell
cmd /c npm test
cmd /c npm run build
```

Expected:

```text
Test Files  3 passed
✓ built
```

- [ ] **Step 7: Commit AI proxy layer**

Run:

```powershell
git add services/ai services/geminiService.ts types.ts
git commit -m "feat: route ai calls through proxy"
```

---

## Task 4: IndexedDB Settings And Reliable State Updates

**Files:**

- Modify: `types.ts`
- Modify: `services/db.ts`
- Modify: `App.tsx`

- [ ] **Step 1: Add settings types**

Append to `types.ts`:

```ts
export interface AppSettings {
  id: 'default';
  language: Language;
  euroRmbRate: number;
  usdRmbRate: number;
  freightRateCbm: number;
  invoiceConfig: {
    sellerName: string;
    sellerAddress: string;
    sellerPhone: string;
    sellerEmail: string;
    buyerInfo: string;
    invoiceNo: string;
    date: string;
    sailing: string;
    containerNo: string;
    sealNo: string;
  };
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'default',
  language: 'en',
  euroRmbRate: 7.8,
  usdRmbRate: 7.2,
  freightRateCbm: 150,
  invoiceConfig: {
    sellerName: 'YiWu Edas Import and Export Co., Ltd',
    sellerAddress: 'Room 301, 3rd Floor, NO. 16, DaShi Road, FoTang Town, YiWu City, Zhejiang, China',
    sellerPhone: '86-579-85569925',
    sellerEmail: 'info@yiwudiyasi.com',
    buyerInfo: 'BERNARDI GROUP PTY LTD\nSHOP 4, 159-173 LACHLAN STREET\nFORBES NSW 2871\nAUSTRALIA',
    invoiceNo: '20250712001',
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }),
    sailing: 'ALS CLIVIA/001S',
    containerNo: 'CMAU9593405',
    sealNo: 'R6953832',
  },
};
```

- [ ] **Step 2: Update DB service**

In `services/db.ts`, set:

```ts
const PRODUCT_STORE = 'products';
const SETTINGS_STORE = 'settings';
const DB_VERSION = 2;
```

In `onupgradeneeded`, create both stores:

```ts
if (!db.objectStoreNames.contains(PRODUCT_STORE)) {
  db.createObjectStore(PRODUCT_STORE, { keyPath: 'id' });
}
if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
  db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
}
```

Use transaction completion for writes:

```ts
const waitForTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
```

Add:

```ts
getSettings: async (): Promise<AppSettings> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.get('default');
    request.onsuccess = () => resolve(request.result || DEFAULT_APP_SETTINGS);
    request.onerror = () => reject(request.error);
  });
},
saveSettings: async (settings: AppSettings): Promise<void> => {
  const db = await getDB();
  const transaction = db.transaction(SETTINGS_STORE, 'readwrite');
  transaction.objectStore(SETTINGS_STORE).put(settings);
  await waitForTransaction(transaction);
},
```

- [ ] **Step 3: Update product writes to await transaction completion**

In `save`, `delete`, and `deleteMany`, replace request-success-only resolution with `await waitForTransaction(transaction)`.

- [ ] **Step 4: Update `App.tsx` state**

Load products and settings together:

```ts
const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

useEffect(() => {
  const loadData = async () => {
    try {
      const [storedProducts, storedSettings] = await Promise.all([
        dbService.getAll(),
        dbService.getSettings(),
      ]);
      setProducts(storedProducts.sort((a, b) => b.timestamp - a.timestamp));
      setSettings(storedSettings);
    } catch (error) {
      console.error('Failed to load local data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  loadData();
}, []);
```

Add:

```ts
const handleSettingsChange = async (nextSettings: AppSettings) => {
  const previous = settings;
  setSettings(nextSettings);
  try {
    await dbService.saveSettings(nextSettings);
  } catch (error) {
    console.error('Failed to save settings:', error);
    setSettings(previous);
    alert('Settings could not be saved.');
  }
};
```

- [ ] **Step 5: Add rollback to add, update, delete handlers**

For add:

```ts
const handleAddProduct = async (newProduct: Product) => {
  setProducts((prev) => [newProduct, ...prev]);
  try {
    await dbService.save(newProduct);
  } catch (error) {
    console.error('Failed to save product:', error);
    setProducts((prev) => prev.filter((product) => product.id !== newProduct.id));
    alert('Error saving data. Please check storage space.');
  }
};
```

For update:

```ts
const handleUpdateProduct = async (updatedProduct: Product) => {
  const previousProducts = products;
  setProducts((prev) => prev.map((product) => product.id === updatedProduct.id ? updatedProduct : product));
  try {
    await dbService.save(updatedProduct);
  } catch (error) {
    console.error('Failed to update product:', error);
    setProducts(previousProducts);
    alert('Product update could not be saved.');
  }
};
```

For delete:

```ts
const handleDeleteProducts = async (ids: string[]) => {
  const previousProducts = products;
  setProducts((prev) => prev.filter((product) => !ids.includes(product.id)));
  try {
    await dbService.deleteMany(ids);
  } catch (error) {
    console.error('Failed to delete products:', error);
    setProducts(previousProducts);
    alert('Products could not be deleted.');
  }
};
```

- [ ] **Step 6: Pass settings to dashboard and mobile**

Extend props in both components:

```ts
settings: AppSettings;
onSettingsChange: (settings: AppSettings) => void;
```

Pass from `App.tsx`:

```tsx
settings={settings}
onSettingsChange={handleSettingsChange}
currentLang={settings.language}
onLanguageChange={(language) => handleSettingsChange({ ...settings, language })}
```

- [ ] **Step 7: Verify build**

Run:

```powershell
cmd /c npm run build
```

Expected:

```text
✓ built
```

- [ ] **Step 8: Commit persistence changes**

Run:

```powershell
git add App.tsx services/db.ts types.ts components/Dashboard.tsx components/MobileEntry.tsx
git commit -m "feat: persist app settings and rollback failed writes"
```

---

## Task 5: Export Services

**Files:**

- Create: `services/export/exportTypes.ts`
- Create: `services/export/excelExport.ts`
- Create: `services/export/pdfExport.ts`
- Modify: `components/Dashboard.tsx`
- Modify: `components/MobileEntry.tsx`

- [ ] **Step 1: Add export contracts**

Create `services/export/exportTypes.ts`:

```ts
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
```

- [ ] **Step 2: Add Excel export service**

Create `services/export/excelExport.ts` with imports:

```ts
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { calculateProductMetrics, getCartonQuantity, getOrderQuantity } from '../../utils/productMetrics';
import { ExportInput, ExportResult } from './exportTypes';
```

Implementation outline:

```ts
export async function exportExcel(input: ExportInput): Promise<ExportResult> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(input.type.toUpperCase());
  let skippedImages = 0;

  sheet.columns = [
    { header: 'Image', key: 'image', width: 20 },
    { header: 'No.', key: 'no', width: 8 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Description', key: 'desc', width: 40 },
    { header: 'HS Code', key: 'hs', width: 15 },
    { header: 'Qty', key: 'qty', width: 12 },
    { header: 'Price (USD)', key: 'price', width: 15 },
    { header: 'Total (USD)', key: 'total', width: 18 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).height = 30;

  input.products.forEach((product, index) => {
    const metrics = calculateProductMetrics(product, input.settings);
    const qty = getOrderQuantity(product);
    const row = sheet.addRow({
      no: index + 1,
      sku: product.sku,
      desc: product.nameEn || product.nameCn,
      hs: product.hsCode,
      qty,
      price: metrics.priceStockUsd,
      total: Number((metrics.priceStockUsd * qty).toFixed(2)),
    });
    row.height = 110;

    if (product.photoUrl?.startsWith('data:image')) {
      try {
        const extension = product.photoUrl.includes('image/png') ? 'png' : 'jpeg';
        const imageId = workbook.addImage({ base64: product.photoUrl, extension });
        sheet.addImage(imageId, { tl: { col: 0, row: index + 1 }, br: { col: 1, row: index + 2 }, editAs: 'twoCell' });
      } catch (error) {
        skippedImages += 1;
        console.error('Failed to add image to Excel:', error);
      }
    }
  });

  if (input.type === 'invoice') {
    sheet.insertRow(1, [input.settings.invoiceConfig.sellerName]);
    sheet.insertRow(2, [input.settings.invoiceConfig.buyerInfo]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Yiwu_${input.type}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  return { skippedImages };
}
```

- [ ] **Step 3: Add PDF export service**

Create `services/export/pdfExport.ts`:

```ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateProductMetrics, getCartonQuantity, getOrderQuantity } from '../../utils/productMetrics';
import { ExportInput, ExportResult } from './exportTypes';

export async function exportPdf(input: ExportInput): Promise<ExportResult> {
  const doc = new jsPDF(input.type === 'quotation' ? 'l' : 'p', 'mm', 'a4');
  let skippedImages = 0;

  doc.setFontSize(18);
  doc.text(input.type.toUpperCase(), 14, 20);
  doc.setFontSize(10);
  doc.text(input.settings.invoiceConfig.sellerName, 14, 28);

  const body = input.products.map((product, index) => {
    const metrics = calculateProductMetrics(product, input.settings);
    const qty = getOrderQuantity(product);
    const cartons = getCartonQuantity(product);
    return input.type === 'quotation'
      ? ['', index + 1, product.sku, product.nameEn || product.nameCn, product.hsCode || '', qty, `$${metrics.priceStockUsd}`, `$${(metrics.priceStockUsd * qty).toFixed(2)}`]
      : ['', index + 1, product.sku, product.nameEn || product.nameCn, qty, cartons, (metrics.cbm * cartons).toFixed(3), ((product.gwKg || 0) * cartons).toFixed(2)];
  });

  autoTable(doc, {
    head: input.type === 'quotation'
      ? [['Image', 'No.', 'SKU', 'Description', 'HS Code', 'Qty', 'Price(USD)', 'Total(USD)']]
      : [['Image', 'No.', 'SKU', 'Description', 'Qty', 'Cartons', 'CBM', 'G.W']],
    body,
    startY: 35,
    styles: { cellPadding: 2, fontSize: 8, valign: 'middle', halign: 'center' },
    columnStyles: { 0: { cellWidth: 30 }, 3: { halign: 'left' } },
    bodyStyles: { minCellHeight: 30 },
    didDrawCell: (data) => {
      if (data.column.index !== 0 || data.cell.section !== 'body') return;
      const product = input.products[data.row.index];
      if (!product.photoUrl?.startsWith('data:image')) return;
      try {
        doc.addImage(product.photoUrl, 'JPEG', data.cell.x + 2, data.cell.y + 2, 26, 26);
      } catch (error) {
        skippedImages += 1;
        console.error('Failed to add image to PDF:', error);
      }
    },
  });

  doc.save(`Yiwu_${input.type}_${new Date().toISOString().slice(0, 10)}.pdf`);
  return { skippedImages };
}
```

- [ ] **Step 4: Replace dashboard export functions**

In `components/Dashboard.tsx`, import:

```ts
import { exportExcel } from '../services/export/excelExport';
import { exportPdf } from '../services/export/pdfExport';
import { ExportType } from '../services/export/exportTypes';
```

Replace local `generateExcel` and `generatePDF` with:

```ts
const getExportItems = () => selectedIds.size > 0 ? products.filter((product) => selectedIds.has(product.id)) : products;

const handleExportExcel = async (type: ExportType) => {
  const items = getExportItems();
  if (items.length === 0) return alert('No products to export.');
  const result = await exportExcel({ type, products: items, settings });
  if (result.skippedImages > 0) alert(`${result.skippedImages} images could not be exported.`);
};

const handleExportPdf = async (type: ExportType) => {
  const items = getExportItems();
  if (items.length === 0) return alert('No products to export.');
  const result = await exportPdf({ type, products: items, settings });
  if (result.skippedImages > 0) alert(`${result.skippedImages} images could not be exported.`);
};
```

Update buttons from `generateExcel('quotation')` to `handleExportExcel('quotation')`, and from `generatePDF('quotation')` to `handleExportPdf('quotation')`.

- [ ] **Step 5: Replace mobile export functions**

In `components/MobileEntry.tsx`, use the same imports and replace `handleExport` with:

```ts
const getExportItems = () => selectedIds.size > 0 ? products.filter((product) => selectedIds.has(product.id)) : products;

const handleExport = async (format: 'excel' | 'pdf', type: ExportType) => {
  const items = getExportItems();
  if (items.length === 0) return alert('No products to export.');
  const result = format === 'excel'
    ? await exportExcel({ type, products: items, settings })
    : await exportPdf({ type, products: items, settings });
  if (result.skippedImages > 0) alert(`${result.skippedImages} images could not be exported.`);
  setShowExportMenu(false);
};
```

- [ ] **Step 6: Run build**

Run:

```powershell
cmd /c npm run build
```

Expected:

```text
✓ built
```

- [ ] **Step 7: Commit export services**

Run:

```powershell
git add services/export components/Dashboard.tsx components/MobileEntry.tsx
git commit -m "feat: move document exports into services"
```

---

## Task 6: Dashboard Search, Batch Feedback, And Component Split

**Files:**

- Create: `components/common/ProcessingOverlay.tsx`
- Create: `components/dashboard/ProductTable.tsx`
- Create: `components/dashboard/DashboardToolbar.tsx`
- Create: `components/dashboard/InvoiceConfigModal.tsx`
- Modify: `components/Dashboard.tsx`

- [ ] **Step 1: Add processing overlay**

Create `components/common/ProcessingOverlay.tsx`:

```tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProcessingOverlayProps {
  text: string;
  current?: number;
  total?: number;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ text, current = 0, total = 0 }) => {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center text-indigo-600">
      <Loader2 className="animate-spin mb-4" size={48} />
      <p className="font-bold text-lg text-slate-800">{text}</p>
      {total > 0 && (
        <div className="w-64 h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Add dashboard search state**

In `components/Dashboard.tsx`, import:

```ts
import { filterProducts } from '../utils/productFilters';
```

Add state:

```ts
const [searchQuery, setSearchQuery] = useState('');
```

Add derived products:

```ts
const visibleProducts = filterProducts(products, searchQuery);
```

Change table rendering from `products.map` to `visibleProducts.map`.

- [ ] **Step 3: Wire the search input**

Set search input props:

```tsx
<input
  type="text"
  value={searchQuery}
  onChange={(event) => setSearchQuery(event.target.value)}
  placeholder={t.searchPlaceholder}
  className="pl-9 pr-4 py-2 text-sm border rounded-full w-full md:w-64"
/>
```

- [ ] **Step 4: Add empty state below table body**

After table rows:

```tsx
{visibleProducts.length === 0 && (
  <tr>
    <td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-400">
      {searchQuery ? 'No products match your search.' : 'No products yet.'}
    </td>
  </tr>
)}
```

- [ ] **Step 5: Improve batch enrichment result reporting**

Replace `handleBulkEnrich` with:

```ts
const handleBulkEnrich = async () => {
  const itemsToProcess = products.filter((product) => selectedIds.has(product.id));
  setIsBulkProcessing(true);
  let success = 0;
  let failed = 0;

  for (const [index, product] of itemsToProcess.entries()) {
    try {
      const result = await enrichProductData(product.nameCn);
      const metrics = calculateProductMetrics({ ...product, ...result }, settings);
      onUpdateProduct({ ...product, ...result, ...metrics, status: ProcessingStatus.REVIEW_NEEDED });
      success += 1;
    } catch (error) {
      console.error('Failed to enrich product:', product.id, error);
      failed += 1;
    }
  }

  setIsBulkProcessing(false);
  setSelectedIds(new Set());
  alert(`AI enrichment complete. Success: ${success}. Failed: ${failed}.`);
};
```

- [ ] **Step 6: Use persisted rate settings**

Replace local rate states with values from `settings`:

```ts
const updateRateSetting = (key: 'euroRmbRate' | 'usdRmbRate' | 'freightRateCbm', value: number) => {
  onSettingsChange({ ...settings, [key]: value });
};
```

Rate input example:

```tsx
<input
  type="number"
  value={settings.euroRmbRate}
  onChange={(event) => updateRateSetting('euroRmbRate', Number(event.target.value))}
  className="w-12 border rounded text-center"
/>
```

- [ ] **Step 7: Extract `ProductTable`**

Create `components/dashboard/ProductTable.tsx` and move the table markup into it with props:

```ts
interface ProductTableProps {
  products: Product[];
  selectedIds: Set<string>;
  editingId: string | null;
  editForm: Partial<Product>;
  processingId: string | null;
  translations: typeof translations[Language];
  onToggleSelected: (id: string) => void;
  onToggleAll: () => void;
  onPreviewImage: (url: string) => void;
  onStartEditing: (product: Product) => void;
  onEditFormChange: (product: Partial<Product>) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEnrich: (product: Product) => void;
  getMetrics: (product: Product) => ProductMetrics;
}
```

Use the same row JSX from the current `Dashboard.tsx`, but map over the `products` prop.

- [ ] **Step 8: Run build and commit**

Run:

```powershell
cmd /c npm run build
```

Expected:

```text
✓ built
```

Commit:

```powershell
git add components/Dashboard.tsx components/common components/dashboard
git commit -m "feat: improve dashboard workflow"
```

---

## Task 7: Mobile Workflow Split And Feedback

**Files:**

- Create: `components/mobile/ShopFolderList.tsx`
- Create: `components/mobile/ShopFolderDetail.tsx`
- Create: `components/mobile/MobileHistory.tsx`
- Modify: `components/MobileEntry.tsx`

- [ ] **Step 1: Replace inline processing overlay**

Import:

```ts
import { ProcessingOverlay } from './common/ProcessingOverlay';
```

Replace the `if (isProcessing)` return block with:

```tsx
if (isProcessing) {
  return (
    <ProcessingOverlay
      text={processingStatus.text}
      current={processingStatus.current}
      total={processingStatus.total}
    />
  );
}
```

- [ ] **Step 2: Improve image batch result reporting**

In `handleProcessSelected`, add counters:

```ts
let success = 0;
let failed = 0;
```

Inside success path after `onSave`:

```ts
success += 1;
```

Inside catch:

```ts
failed += 1;
console.error('Failed to process selected image:', e);
```

At the end:

```ts
if (isMounted.current) {
  alert(`Batch complete. Success: ${success}. Failed: ${failed}.`);
  setViewMode('history');
}
```

- [ ] **Step 3: Extract `ShopFolderList`**

Create `components/mobile/ShopFolderList.tsx` with props:

```ts
interface ShopFolderListProps {
  folders: DraftFolder[];
  currentLang: Language;
  translations: typeof translations[Language];
  onLanguageToggle: () => void;
  onCreateFolder: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenFolder: (id: string) => void;
  cardInputRef: React.RefObject<HTMLInputElement>;
  isDesktopMode?: boolean;
  onOpenHistory: () => void;
}
```

Move the current `viewMode === 'folders'` JSX into this component.

- [ ] **Step 4: Extract `ShopFolderDetail`**

Create `components/mobile/ShopFolderDetail.tsx` with props:

```ts
interface ShopFolderDetailProps {
  folder: DraftFolder;
  selectedImageIds: Set<string>;
  translations: typeof translations[Language];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onBack: () => void;
  onToggleSelectAll: () => void;
  onToggleImage: (id: string) => void;
  onAddPhotos: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProcessSelected: () => void;
}
```

Move the current folder detail JSX into this component.

- [ ] **Step 5: Extract `MobileHistory`**

Create `components/mobile/MobileHistory.tsx` with props:

```ts
interface MobileHistoryProps {
  products: Product[];
  selectedIds: Set<string>;
  isSelectMode: boolean;
  showExportMenu: boolean;
  translations: typeof translations[Language];
  onToggleSelectMode: () => void;
  onToggleProduct: (id: string) => void;
  onShowExportMenu: (show: boolean) => void;
  onExport: (format: 'excel' | 'pdf', type: ExportType) => void;
  onOpenFolders: () => void;
}
```

Move the current history JSX into this component.

- [ ] **Step 6: Run build and commit**

Run:

```powershell
cmd /c npm run build
```

Expected:

```text
✓ built
```

Commit:

```powershell
git add components/MobileEntry.tsx components/mobile
git commit -m "feat: improve mobile sourcing workflow"
```

---

## Task 8: Documentation, Manual Verification, And Final Build

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Update README setup**

Add:

```md
## Environment

Copy `.env.example` to `.env.local` and configure the Codex reverse-proxy API:

```bash
VITE_AI_PROXY_BASE_URL=http://127.0.0.1:3001/v1
VITE_AI_PROXY_API_KEY=
VITE_AI_PROXY_MODE=openai-compatible
VITE_AI_MODEL=gemini-2.5-flash
VITE_AI_TIMEOUT_MS=60000
```

`VITE_AI_PROXY_MODE=openai-compatible` calls `{baseUrl}/chat/completions`.
`VITE_AI_PROXY_MODE=gemini-compatible` calls `{baseUrl}/models/{model}:generateContent`.
```

- [ ] **Step 2: Update README verification commands**

Add:

```md
## Verification

```bash
npm install
npm test
npm run build
npm run dev
```

Manual checks:

- Navigate from landing to sourcing and dashboard modes.
- Create a shop folder from a business card image.
- Add product images to a folder and process selected images.
- Search desktop products by SKU, name, supplier, shop, and HS code.
- Export quotation, packing list, invoice, and master Excel/PDF files.
```

- [ ] **Step 3: Run tests**

Run:

```powershell
cmd /c npm test
```

Expected:

```text
Test Files  3 passed
```

- [ ] **Step 4: Run final build**

Run:

```powershell
cmd /c npm run build
```

Expected:

```text
✓ built
```

- [ ] **Step 5: Start dev server**

Run:

```powershell
cmd /c npm.cmd run dev -- --host 127.0.0.1 --port 3000
```

Expected:

```text
Local:   http://127.0.0.1:3000/
```

- [ ] **Step 6: Commit docs and verification fixes**

Run:

```powershell
git add README.md
git commit -m "docs: document proxy setup and verification"
```

---

## Self-Review

Spec coverage:

- Windows checkout issue: Task 1.
- Dependency and build stabilization: Task 1.
- Codex reverse-proxy Gemini flow: Task 3.
- Search and product business logic: Task 2 and Task 6.
- IndexedDB and settings persistence: Task 4.
- Export consolidation: Task 5.
- Component splitting: Task 6 and Task 7.
- UX feedback and batch summaries: Task 6 and Task 7.
- README and verification: Task 8.

Placeholder scan:

- No `TBD` markers.
- No intentionally deferred implementation steps.
- Any dependency install or build failure must be handled during execution, with the failing command output used as evidence.

Type consistency:

- `AppSettings` is defined in `types.ts` before use by DB, components, and export services.
- `RateSettings` in `productMetrics.ts` is structurally compatible with `AppSettings` fields used by exports and dashboard calculations.
- `ExportType` is defined once in `services/export/exportTypes.ts`.
- AI public functions keep their current names so existing UI imports continue to work.
