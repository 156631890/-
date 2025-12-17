import { GoogleGenAI, Type } from "@google/genai";
import { AIEnrichmentResult, SupplierInfo } from "../types";

// Safe access to environment variables
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore ReferenceError if process is not defined
  }
  return undefined;
};

const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    // For local dev or environments where process.env is not polyfilled
    console.warn("API Key missing. Check process.env.API_KEY");
    throw new Error("API Key configuration missing. Please check settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to safely parse JSON from AI response, stripping Markdown code blocks if present
const safeJsonParse = (text: string | undefined) => {
  if (!text) throw new Error("No response from AI");
  try {
    // Remove ```json and ``` wrapping if they exist
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    // Handle cases where AI returns plain text instead of JSON
    if (!cleanText.startsWith('{') && !cleanText.startsWith('[')) {
       // If strict JSON mode is on, this shouldn't happen, but good fallback
       const firstBrace = cleanText.indexOf('{');
       const lastBrace = cleanText.lastIndexOf('}');
       if (firstBrace !== -1 && lastBrace !== -1) {
          return JSON.parse(cleanText.substring(firstBrace, lastBrace + 1));
       }
       throw new Error("Response is not JSON");
    }
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    console.error("Raw Text:", text);
    throw new Error("Failed to parse AI response as JSON");
  }
};

// Business Card Analysis
export const analyzeBusinessCard = async (base64Image: string): Promise<SupplierInfo> => {
  try {
    const ai = getClient();
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
          { text: "Extract business card information. If a field is missing, return empty string. Return JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyName: { type: Type.STRING, description: "Company or Shop Name" },
            contactPerson: { type: Type.STRING, description: "Name of the person" },
            phone: { type: Type.STRING, description: "Phone or Mobile number" },
            address: { type: Type.STRING, description: "Full Address or Shop Number" },
            email: { type: Type.STRING, description: "Email address if present" }
          },
          required: ["companyName", "contactPerson", "phone"]
        }
      }
    });

    return safeJsonParse(response.text) as SupplierInfo;
  } catch (error) {
    console.error("Business Card Analysis failed:", error);
    return {
      companyName: "",
      contactPerson: "",
      phone: "",
      address: ""
    };
  }
};

// Text-based enrichment with SEARCH GROUNDING
export const enrichProductData = async (nameCn: string): Promise<AIEnrichmentResult> => {
  try {
    const ai = getClient();
    const prompt = `
      You are a Senior Customs Classification Specialist.
      Product Chinese Name: "${nameCn}".
      
      Use Google Search to find up-to-date and accurate information regarding this product type, especially for HS Codes and Material composition regulations.
      
      TASK:
      1. **Analyze**: Identify the material (e.g., Plastic, Metal, Textile) and intended use.
      2. **Translation**: Professional English & Spanish Trade Names.
      3. **HS Code (CRITICAL)**: Assign the most accurate **6-digit International Harmonized System Code** based on current customs data found via search.
      4. **Duty**: Estimate EU Import Duty Rate (%).

      **IMPORTANT GUIDELINES**:
      - **Prioritize accuracy for HS Code and Material Composition**.
      - **If unsure, state "Needs Manual Review" instead of guessing** for the HS Code or Material fields.
      
      Return ONLY a JSON object with this structure (no markdown):
      {
        "nameEn": "string",
        "nameEs": "string",
        "categoryMain": "string",
        "categorySub": "string",
        "materialEn": "string",
        "hsCode": "string",
        "usage": "string",
        "taxRate": number
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
        // Note: responseMimeType: "application/json" is NOT supported with Search tools.
        // We rely on the prompt to request JSON.
      }
    });
    
    // Log grounding metadata if available (optional, for debug)
    if (response.candidates?.[0]?.groundingMetadata) {
        // console.log("Grounding Metadata:", response.candidates[0].groundingMetadata);
    }

    return safeJsonParse(response.text) as AIEnrichmentResult;
  } catch (error) {
    console.error("AI Enrichment failed:", error);
    throw error;
  }
};

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
  hsCode: string; // Added HS Code
}

// Image-based analysis
export const analyzeImage = async (base64Image: string): Promise<ImageAnalysisResult> => {
  try {
    const ai = getClient();
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
          { text: `
            Role: Yiwu Sourcing & Customs Expert.
            
            TASK: 
            Analyze this product image and provide ESTIMATED standard market data.
            
            1. **Identify**: Name (CN/EN) and Main Material.
            2. **HS Code**: Determine the likely **6-digit HS Code** based on visual material and function.
            3. **Specs**: Estimate carton dims and packing qty.
            4. **Price**: Estimate low-end wholesale RMB price.
            ` 
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             nameCn: { type: Type.STRING, description: "Product Name in Chinese" },
             nameEn: { type: Type.STRING, description: "Product Name in English" },
             materialEn: { type: Type.STRING, description: "Main Material" },
             hsCode: { type: Type.STRING, description: "Estimated 6-digit HS Code" },
             priceRmb: { type: Type.NUMBER, description: "Estimated Wholesale Price RMB" },
             moq: { type: Type.NUMBER, description: "Standard MOQ (e.g. 1 carton)" },
             boxLength: { type: Type.NUMBER, description: "Carton Length cm" },
             boxWidth: { type: Type.NUMBER, description: "Carton Width cm" },
             boxHeight: { type: Type.NUMBER, description: "Carton Height cm" },
             pcsPerBox: { type: Type.NUMBER, description: "Pieces per Carton" }
          },
          required: ["nameCn", "nameEn", "hsCode", "priceRmb", "boxLength", "boxWidth", "boxHeight", "pcsPerBox"]
        }
      }
    });

    const result = safeJsonParse(response.text) as ImageAnalysisResult;

    return {
      nameCn: result.nameCn || "待识别商品",
      nameEn: result.nameEn || "Unknown Product",
      materialEn: result.materialEn || "General",
      hsCode: result.hsCode || "",
      priceRmb: Number(result.priceRmb) || 0,
      moq: Number(result.moq) || 0,
      boxLength: Number(result.boxLength) || 0,
      boxWidth: Number(result.boxWidth) || 0,
      boxHeight: Number(result.boxHeight) || 0,
      pcsPerBox: Number(result.pcsPerBox) || 0
    };

  } catch (error) {
    console.error("Image Analysis failed:", error);
    return {
      nameCn: "识别失败 (Manual Entry)",
      priceRmb: 0,
      moq: 0,
      nameEn: "",
      materialEn: "",
      hsCode: "",
      boxLength: 0,
      boxWidth: 0,
      boxHeight: 0,
      pcsPerBox: 0
    };
  }
};