# Yiwu Sourcing AI Optimization Design

Date: 2026-04-28
Repository: `https://github.com/156631890/-`

## Goal

Optimize the Yiwu Sourcing AI app end to end while keeping the current workflow recognizable:

- Mobile sourcing agents create supplier folders, add product photos, and process selected images.
- Desktop documentation users review products, run AI enrichment, search records, and export quotation, packing list, and invoice files.
- Gemini calls must go through the Codex reverse-proxy API instead of relying on a browser-exposed Google API key.
- The project must install, build, and run reliably on Windows.

## Current Findings

The repository is a small React 19, TypeScript, and Vite app. The main code is concentrated in `Dashboard.tsx`, `MobileEntry.tsx`, `geminiService.ts`, and `db.ts`.

Observed issues:

- The repository contains `migrated_prompt_history/prompt_2025-12-18T05:30:00.988Z.json`, which cannot be checked out on Windows because `:` is not legal in a file name.
- `README.md` describes libraries such as `idb`, `ExcelJS`, and `jsPDF`, but `package.json` only installs React, lucide, and Google GenAI. The app currently relies on CDN globals in `index.html`.
- `Dashboard.tsx` and `MobileEntry.tsx` contain UI, business calculations, export generation, AI orchestration, and modal logic in large components.
- The desktop search input is visual only and does not filter products.
- AI errors are mostly logged or swallowed; users do not get reliable partial-failure reporting during batch operations.
- IndexedDB writes are optimistic, but failed saves and deletes do not consistently roll back UI state.
- Finance and freight settings are held in component state and reset on reload.
- Export logic is duplicated and image failures are silently ignored.

## Proposed Approach

Use an incremental stabilization and refactor path. Each phase should leave the app buildable.

1. Stabilize the repository and dependency surface.
2. Replace direct Gemini browser key usage with a Codex reverse-proxy client.
3. Strengthen data persistence, search, calculations, batch processing, and exports.
4. Split large components into focused modules.
5. Improve mobile and desktop UX without changing the core product concept.

This approach is preferred over a full rewrite because the existing app already has the right workflow shape and can be improved with lower risk.

## Configuration Design

Add explicit Vite environment variables:

- `VITE_AI_PROXY_BASE_URL`: base URL for the Codex reverse proxy.
- `VITE_AI_PROXY_API_KEY`: token used by the proxy if required.
- `VITE_AI_PROXY_MODE`: `openai-compatible` or `gemini-compatible`.
- `VITE_AI_MODEL`: default model name.
- `VITE_AI_TIMEOUT_MS`: optional request timeout.

Add `.env.example` with these values documented. The implementation should not hard-code `process.env.API_KEY` in frontend code.

## AI Client Design

Create a small AI client layer under `services/ai/`:

- `config.ts`: reads and validates Vite env values.
- `types.ts`: shared request and response contracts.
- `proxyClient.ts`: performs HTTP requests to the Codex reverse proxy.
- `prompts.ts`: prompt builders for product image analysis, business card extraction, and product enrichment.
- `geminiService.ts`: keeps the existing public functions used by the UI: `analyzeImage`, `analyzeBusinessCard`, and `enrichProductData`.

The AI service should support two proxy shapes:

- `openai-compatible`: sends messages to a chat-completions style endpoint, including image data as supported by the proxy.
- `gemini-compatible`: sends Gemini-style payloads through the proxy.

The first implementation should auto-select based on `VITE_AI_PROXY_MODE`. If the proxy mode is missing, the app should fail with a clear configuration error before sending a request.

AI response parsing should be defensive:

- Strip Markdown fences.
- Extract the first valid JSON object when the model wraps text around JSON.
- Normalize numeric fields.
- Return structured errors with user-facing messages.

## Data And State Design

Keep IndexedDB as the local-first data store, but make DB operations explicit and reliable:

- Add a settings store for exchange rate, freight, invoice defaults, and language.
- Keep `products` keyed by `id`.
- Preserve supplier info on products.
- Make save, update, and delete return transaction completion, not only request success.

UI updates can remain optimistic, but failures should roll back:

- Add product: remove from state if save fails.
- Update product: restore the previous product if save fails.
- Delete products: restore deleted products if delete fails.

## Business Logic Design

Move calculation and export selection into pure helper modules:

- `utils/productMetrics.ts`: CBM, freight per piece, landed cost, USD stock price, carton quantity, total amount.
- `utils/productFilters.ts`: search across SKU, Chinese name, English name, supplier name, shop number, and HS code.
- `utils/productSelection.ts`: selection helpers for tables and mobile history.

The desktop search box should filter rows immediately. Empty search should show all products.

## Export Design

Create `services/export/`:

- `excelExport.ts`: Excel workbook generation.
- `pdfExport.ts`: PDF generation.
- `exportTypes.ts`: quotation, packing list, invoice, and master export contracts.

Move dependencies from CDN globals to npm dependencies:

- `exceljs`
- `file-saver`
- `jspdf`
- `jspdf-autotable`

Image export rules:

- Include base64 product photos when valid.
- Skip an invalid image and continue the export.
- Report how many images were skipped.

Exports should use the same calculation helpers as the UI so totals match what users see.

## Component Design

Split the desktop dashboard into focused components:

- `DashboardPage`
- `DashboardHeader`
- `ExportToolbar`
- `RateSettingsBar`
- `ProductTable`
- `ProductRow`
- `InvoiceConfigModal`
- `ImagePreviewModal`
- `BatchActionBar`

Split the mobile workflow into:

- `MobileEntryPage`
- `ShopFolderList`
- `ShopFolderDetail`
- `MobileHistory`
- `ExportSheet`
- `ProcessingOverlay`

Keep component props plain and typed. Shared business logic should live outside components.

## UX Design

Desktop:

- Make search functional.
- Keep the dense table workflow.
- Add clear empty states for no products and no search matches.
- Show AI batch progress with success and failure counts.
- Disable buttons during long-running operations.

Mobile:

- Keep the folder-first sourcing workflow.
- Make batch image processing progress visible.
- Keep bottom navigation stable.
- Preserve product history selection and export.

Visual changes should be restrained and tool-like, not a marketing redesign.

## Error Handling

Add consistent user-facing errors:

- Missing proxy URL or model.
- AI timeout or proxy failure.
- Invalid AI JSON response.
- IndexedDB unavailable or quota exceeded.
- Export library or image conversion failure.

Errors should include a concise message and preserve technical details in `console.error`.

Batch AI operations should continue after item failures and summarize the result at the end.

## Testing And Verification

Add targeted verification:

- `npm run build` must pass.
- TypeScript should stay strict enough to catch missing props and return-shape errors.
- Pure helper functions should be easy to test later; if a test framework is added, prioritize metric calculation, search filtering, and AI JSON parsing.
- Manual browser verification should cover:
  - landing role navigation,
  - mobile folder creation and image selection,
  - desktop search,
  - AI configuration error display,
  - Excel/PDF export generation with and without images.

## Migration Notes

The invalid `migrated_prompt_history` file should be removed or renamed in the repository history or current branch. For the immediate Windows working tree, sparse checkout or index-only handling can avoid checking it out, but the durable repository fix is to delete or rename that path in a commit.

Because the app is frontend-only, any proxy API key exposed through `VITE_` variables is still visible to the browser. The Codex reverse proxy should issue a restricted token or support a backend-only deployment path if the key must remain private.

## Out Of Scope

- Rebuilding the app as a backend service.
- Replacing IndexedDB with cloud sync.
- Designing a new document template system from scratch.
- Adding authentication.

These can be added later after the current local-first workflow is stable.
