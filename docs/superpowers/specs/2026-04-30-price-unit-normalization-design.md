# Price Unit Normalization Design

## Context

The current image analysis workflow stores one numeric product price as `priceRmb`. That field is used by costing, dashboard display, and Excel/PDF exports. The AI prompt asks the model to OCR visible prices, but it does not preserve the original price text, currency, or pricing unit shown in the image.

This creates ambiguity when an image shows prices such as `12 RMB/box`, `30 RMB/dozen`, or `$2/pc`. The app may store a number without explaining whether it is per piece, per box, per dozen, or converted from another currency.

## Goal

Preserve the image's original visible price information while keeping a normalized RMB-per-piece price for existing cost calculations and exports.

## Data Model

Extend product and image analysis data with optional price metadata:

- `priceRawText?: string`
  The original visible price text read from the image, such as `30 RMB/dozen` or `$2/pc`.
- `priceCurrency?: 'RMB' | 'USD' | 'EUR' | 'UNKNOWN'`
  The currency represented by the visible or inferred price.
- `priceUnit?: 'pc' | 'box' | 'set' | 'dozen' | 'pack' | 'carton' | 'unknown'`
  The unit shown or inferred from the image.
- `priceUnitQuantity?: number`
  Number of pieces represented by one price unit. Examples: `dozen = 12`, `pc = 1`. If the image says a box contains 6 pieces, `box = 6`.
- `priceNormalizationNote?: string`
  Human-readable explanation of the conversion or estimate, such as `Visible 30 RMB/dozen normalized to 2.5 RMB/pc`.

Keep `priceRmb` as the canonical normalized RMB-per-piece field used by existing calculations.

## AI Prompt Behavior

The product image prompt should require the model to return:

- `priceRawText`
- `priceCurrency`
- `priceUnit`
- `priceUnitQuantity`
- `priceRmb`
- `priceNormalizationNote`

Price rules:

- If a visible RMB per-piece price is shown, set `priceRawText` to the visible text and set `priceRmb` to that value.
- If a visible RMB non-piece price is shown, preserve `priceRawText` and normalize to RMB per piece when the unit quantity is clear.
- If a visible USD or EUR price is shown, preserve `priceRawText`; normalize to RMB per piece only when currency and unit quantity are clear enough to explain in `priceNormalizationNote`.
- If unit or currency is unclear, preserve `priceRawText`, set metadata to `UNKNOWN` or `unknown`, and avoid inventing a high-confidence normalized value.
- If no visible price is readable, estimate a low-end Yiwu wholesale RMB per-piece price, leave `priceRawText` empty, set `priceCurrency` to `RMB`, set `priceUnit` to `pc`, set `priceUnitQuantity` to `1`, and mark the note as an estimate.

## Normalization Rules

Create a small price normalization helper responsible for validating AI output and deriving safe defaults:

- Valid currencies are `RMB`, `USD`, `EUR`, and `UNKNOWN`; invalid values become `UNKNOWN`.
- Valid units are `pc`, `box`, `set`, `dozen`, `pack`, `carton`, and `unknown`; invalid values become `unknown`.
- `priceUnitQuantity` must be a positive finite number; otherwise it defaults to `1` only for `pc`, and to `0` for other unclear units.
- `priceRmb` remains numeric. If the AI gives a non-numeric value, it normalizes to `0`.
- `priceNormalizationNote` is trimmed text and may be empty.

This helper should not perform speculative currency exchange itself unless the AI has already returned a clear normalized `priceRmb` and explanation. The current app settings are client-side UI settings and are not passed into `analyzeImage()`.

## UI Behavior

Dashboard product table:

- Show the canonical price as `RMB {priceRmb} / pc`.
- When `priceRawText` exists, show a secondary line such as `Raw: 30 RMB/dozen`.
- When `priceNormalizationNote` exists, expose it in compact detail text.
- Editing should allow changing `priceRmb`, `priceRawText`, `priceCurrency`, `priceUnit`, and `priceUnitQuantity`.

Mobile history:

- Continue showing the canonical RMB price to keep the mobile list compact.
- It does not need to show raw price metadata in this iteration.

Manual entry:

- Keep the existing `priceRmb` input.
- Add optional raw price text, currency, unit, and unit quantity fields only if they can fit without making the mobile form too dense. If space is tight, manual entry can keep the existing standard price-only behavior for this iteration.

Exports:

- Existing exported price columns continue to use `priceRmb`-derived USD values.
- The master export may include raw price metadata in future, but this iteration does not change export schemas unless already convenient in the existing table.

## Testing

Add tests for:

- Prompt requirements: image analysis prompt includes raw price, currency, unit, unit quantity, normalized RMB per piece, and normalization note.
- Normalization helper:
  - preserves `30 RMB/dozen` metadata and a normalized RMB value;
  - rejects invalid currency/unit values to `UNKNOWN` / `unknown`;
  - handles missing or invalid unit quantity safely.
- Gemini service normalization:
  - image analysis result includes normalized price metadata;
  - existing required fields still behave as before.

Run:

- `npm test`
- `npx tsc --noEmit`
- `npm run build`

## Out Of Scope

- Binding customs or pricing validation.
- A full currency conversion engine.
- Changing export file formats beyond preserving existing price output.
- Reworking dashboard layout beyond the compact display/edit controls needed for the new fields.
