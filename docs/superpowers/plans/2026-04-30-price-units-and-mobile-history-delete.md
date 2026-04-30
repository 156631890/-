# Price Units and Mobile History Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve image-recognized price units while keeping normalized RMB-per-piece pricing, and add deletion support to the mobile History tab.

**Architecture:** Add a focused price metadata normalizer in `utils/priceNormalization.ts`, then thread optional metadata through AI types, product types, image analysis, manual product creation, and dashboard display/editing. Add mobile history deletion by passing the existing `onDeleteProduct` callback down to `MobileHistory` and rendering a select-mode delete action.

**Tech Stack:** React 19, TypeScript, Vitest, Vite, IndexedDB.

---

## Files

- Create `utils/priceNormalization.ts`
- Create `utils/priceNormalization.test.ts`
- Modify `services/ai/prompts.ts`
- Modify `services/ai/prompts.test.ts`
- Modify `services/ai/types.ts`
- Modify `services/geminiService.ts`
- Modify `services/geminiService.test.ts`
- Modify `types.ts`
- Modify `utils/manualProduct.ts`
- Modify `utils/manualProduct.test.ts`
- Modify `components/MobileEntry.tsx`
- Modify `components/dashboard/ProductTable.tsx`
- Modify `components/mobile/MobileHistory.tsx`

## Task 1: Price Metadata Model And Normalizer

- [x] Write failing tests in `utils/priceNormalization.test.ts` for valid metadata, invalid currency/unit fallback, and safe unit quantity fallback.
- [x] Run `npm test -- utils/priceNormalization.test.ts` and verify it fails because `utils/priceNormalization.ts` does not exist.
- [x] Add `PriceCurrency`, `PriceUnit`, `PriceMetadata`, and `normalizePriceMetadata` in `utils/priceNormalization.ts`.
- [x] Add optional price metadata fields to `Product`, `ManualProductValues`, and `ImageAnalysisResult`.
- [x] Run `npm test -- utils/priceNormalization.test.ts` and verify it passes.

## Task 2: AI Prompt And Image Analysis Wiring

- [x] Extend `services/ai/prompts.test.ts` with assertions for `priceRawText`, `priceCurrency`, `priceUnit`, `priceUnitQuantity`, and `priceNormalizationNote`.
- [x] Extend `services/geminiService.test.ts` with an image-analysis test that preserves `30 RMB/dozen`, `RMB`, `dozen`, `12`, and the normalization note.
- [x] Run `npm test -- services/ai/prompts.test.ts services/geminiService.test.ts` and verify failures.
- [x] Update `imageAnalysisPrompt` to require the price metadata fields and normalization rules.
- [x] Update `normalizeImageAnalysis` to merge `normalizePriceMetadata(result)` into the normalized image result.
- [x] Run `npm test -- services/ai/prompts.test.ts services/geminiService.test.ts` and verify it passes.

## Task 3: Product Creation And Dashboard Price UI

- [x] Extend `utils/manualProduct.test.ts` to verify manual product creation preserves optional raw price metadata.
- [x] Run `npm test -- utils/manualProduct.test.ts` and verify it fails.
- [x] Update `createManualProduct` and `MobileEntry` product creation to preserve price metadata.
- [x] Update `ProductTable` cost cell to display `RMB {priceRmb} / pc`, `Raw: ...`, and `priceNormalizationNote`; in edit mode, allow changing `priceRmb`, `priceRawText`, `priceCurrency`, `priceUnit`, and `priceUnitQuantity`.
- [x] Run `npm test -- utils/manualProduct.test.ts` and verify it passes.

## Task 4: Mobile History Delete

- [x] Add or extend a focused helper test if a helper is introduced for selected ID deletion.
- [x] Update `MobileHistory` props with `onDeleteSelected` and `canDeleteSelected`.
- [x] Render a two-button select-mode action bar with Export and Delete.
- [x] Add `handleDeleteSelectedHistory` in `MobileEntry`, confirm deletion, call `onDeleteProduct?.(ids)`, and clear selected IDs.
- [x] Run `npx tsc --noEmit` to verify component prop wiring.

## Task 5: Full Verification And Commit

- [x] Run `npm test`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run build`.
- [x] Run `git diff --check`.
- [x] Commit the implementation with `feat: normalize image prices and delete mobile history`.
