# Yiwu Sourcing AI Assistant

Yiwu Sourcing AI Assistant supports a mobile sourcing capture workflow and a desktop documentation/export workflow for sourcing teams.

The mobile workflow helps sourcing agents create shop folders, capture or upload business card and product photos, and organize market findings while they are in the field. The desktop workflow helps documentation specialists search, enrich, review, and export the collected product data.

## Main Features

- Mobile shop folders for organizing supplier visits and product groups.
- Photo capture and upload for business cards and product images.
- Codex reverse-proxy AI product and business card analysis.
- Local IndexedDB storage for offline-first field capture.
- Desktop dashboard search and bulk enrichment.
- Excel and PDF exports for quotations, packing lists, invoices, and master files.

## Tech Stack

- React 19
- TypeScript
- Vite
- IndexedDB
- ExcelJS
- jsPDF
- Codex reverse-proxy AI API

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

## Verification

```bash
npm install
npm test
npx tsc --noEmit
npm run build
npm run dev
```

## Manual Checks

- Navigate from landing to sourcing and dashboard modes.
- Create a shop folder from a business card image.
- Add product images to a folder and process selected images.
- Search desktop products by SKU, name, supplier, shop, and HS code.
- Export quotation, packing list, invoice, and master Excel/PDF files.
