export const businessCardPrompt = `Extract business card information from the image.
If a field is missing, return an empty string.
Return ONLY a JSON object with this structure:
{
  "companyName": "string",
  "contactPerson": "string",
  "phone": "string",
  "address": "string",
  "email": "string"
}`;

export const imageAnalysisPrompt = `Role: Yiwu Sourcing & Customs Expert.

Analyze this product image and provide product trade data.

Tasks:
1. Identify the Chinese product name, English product name, and main material.
2. Determine the likely 6-digit HS Code based on visual material and function.
3. Estimate carton dimensions and pieces per carton.
4. Use OCR to read any visible price, quotation, tag, table, or label in the image before estimating.
5. Estimate standard MOQ.

Price rules:
- If a visible price is shown in RMB, CNY, a currency symbol, or Chinese yuan text, set priceRmb to that visible price.
- If multiple visible prices are shown, choose the per-unit product price, not totals, phone numbers, model numbers, or SKU codes.
- Only estimate priceRmb when no visible price is readable in the image.
- If estimating, use a low-end Yiwu wholesale RMB price.

Return ONLY a JSON object with this structure:
{
  "nameCn": "string",
  "priceRmb": number,
  "moq": number,
  "nameEn": "string",
  "materialEn": "string",
  "boxLength": number,
  "boxWidth": number,
  "boxHeight": number,
  "pcsPerBox": number,
  "hsCode": "string"
}`;

export const productEnrichmentPrompt = (nameCn: string) => `You are a Senior Customs Classification Specialist.
Product Chinese Name: "${nameCn}".

Use the model's available knowledge and proxy-provided capabilities to identify accurate product trade data.

Tasks:
1. Analyze the likely material and intended use.
2. Provide professional English and Spanish trade names.
3. Assign the most accurate 6-digit International Harmonized System Code.
4. Estimate EU import duty rate percentage.

Important guidelines:
- Prioritize accuracy for HS Code and material composition.
- If unsure, state "Needs Manual Review" instead of guessing for the HS Code or material fields.

Return ONLY a JSON object with this structure:
{
  "nameEn": "string",
  "nameEs": "string",
  "categoryMain": "string",
  "categorySub": "string",
  "materialEn": "string",
  "hsCode": "string",
  "usage": "string",
  "taxRate": number
}`;
