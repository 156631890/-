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
2. Extract customs classification factors visible or reasonably inferable from the image: material composition, intended use, power/electrical function, textile knit/woven construction, age group, packaging form, and whether it is a set or accessory.
3. Suggest a China Customs 10-digit commodity code based on those factors.
4. Estimate carton dimensions and pieces per carton.
5. Use OCR to read any visible price, quotation, tag, table, or label in the image before estimating.
6. Estimate standard MOQ.

HS Code rules:
- hsCode is an AI suggestion for China Customs 10-digit commodity code only.
- Do not output a 6-digit international HS code.
- If the image lacks decisive classification information, return an empty string for hsCode.
- Do not invent a code when material, use, or construction is uncertain.
- This is not a binding customs ruling and must be manually reviewed before declaration.

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
3. Suggest a China Customs 10-digit commodity code.
4. Estimate EU import duty rate percentage.

Important guidelines:
- Prioritize accuracy for HS Code and material composition.
- Do not output a 6-digit international HS code.
- If unsure, return an empty string for hsCode instead of guessing.
- This is an AI suggestion, not a binding customs ruling, and must be manually reviewed before declaration.

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
