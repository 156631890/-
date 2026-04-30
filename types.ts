
export enum ProcessingStatus {
  DRAFT = 'DRAFT',
  AI_PROCESSING = 'AI_PROCESSING',
  COMPLETED = 'COMPLETED',
  REVIEW_NEEDED = 'REVIEW_NEEDED'
}

export type Language = 'en' | 'zh' | 'es';

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
    sellerName: "YiWu Edas Import and Export Co., Ltd",
    sellerAddress: "Room 301, 3rd Floor, NO. 16, DaShi Road, FoTang Town, YiWu City, Zhejiang, China",
    sellerPhone: "86-579-85569925",
    sellerEmail: "info@yiwudiyasi.com",
    buyerInfo: "BERNARDI GROUP PTY LTD\nSHOP 4, 159-173 LACHLAN STREET\nFORBES NSW 2871\nAUSTRALIA",
    invoiceNo: "20250712001",
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }),
    sailing: "ALS CLIVIA/001S",
    containerNo: "CMAU9593405",
    sealNo: "R6953832"
  }
};

export interface SupplierInfo {
  companyName: string;
  contactPerson: string;
  phone: string;
  address: string;
  email?: string;
}

export interface DraftImage {
  id: string;
  url: string;
  timestamp: number;
}

export interface DraftFolder {
  id: string;
  name: string;
  supplier: SupplierInfo;
  images: DraftImage[];
  timestamp: number;
}

export interface ManualProductValues {
  nameCn: string;
  nameEn: string;
  materialEn: string;
  hsCode: string;
  hsCodeReviewed: boolean;
  priceRmb: number;
  moq: number;
  shopNo: string;
  boxLength: number;
  boxWidth: number;
  boxHeight: number;
  pcsPerBox: number;
  taxRate: number;
}

export interface Product {
  id: string;
  sku: string;
  photoUrl: string;
  
  // --- Supplier Context (Session Data) ---
  supplier?: SupplierInfo;

  // --- 1. Basic Info ---
  nameCn: string;          // 品名 NAME
  nameEn?: string;         // PRODUCT NAME
  nameEs?: string;         // NOMBRE DE PRODUCTO (Spanish)
  categoryMain?: string;   // 大类 CATEGORY
  categorySub?: string;    // 商品分类 CATEGORY
  materialEn?: string;     // 产品属性 MATERIAL
  labelInfo?: string;      // LABEL INFO
  upc?: string;           // UPC
  certificate?: string;    // 证书 CERTIFICATE
  
  // --- 2. Specs & Packing ---
  // Outer Box
  boxLength: number;       // 长 cm
  boxWidth: number;        // 宽 cm
  boxHeight: number;       // 高 cm
  // Inner
  innerPack?: number;      // 内包包装 INNER PACK
  pcsPerBox: number;       // 装箱量 PCS PER BOX
  // Weights
  gwKg?: number;           // 箱重量(kg) BOX
  // Calculated Specs
  cbm?: number;            // 箱体积(m³)
  cbf?: number;            // 箱体积(ft³)
  gwLb?: number;           // 箱重量(lb)
  palletQty?: number;      // 托盘系数 PALLET

  // --- 3. Finance & Costing ---
  priceRmb: number;        // COST price RMB
  // Global Configs applied at calc time, stored here for record
  exRateEuroRmb?: number;  // 汇率 EURO TO RMB
  freightRate?: number;    // 运费 m3 TRANSPORT COST
  vatRate?: number;        // 加税率(%) VAT
  
  // Calculated Costs
  freightPerPc?: number;   // 运费 pc
  taxRate?: number;        // 关税(%) TAX (Duty)
  landedCostEuro?: number; // 成本 euro PRODUCT COST (Base + Freight + Duty)
  priceSpainEuro?: number; // 西班牙价格 euro SPAIN PRICE
  priceStockUsd?: number;  // 现货价格(US$) STOCK PRICE
  
  // --- 4. Trade & Compliance ---
  hsCode?: string;         // 海关代码 HSCODE
  hsCodeReviewed?: boolean;
  origin?: string;         // 原产地 ORIGIN
  moq: number;             // 起订量 MOQ
  preorderDays?: number;   // 交期 PREORDER
  shopNo: string;
  
  timestamp: number;
  status: ProcessingStatus;
  // Grounding URLs for transparency as per Gemini API guidelines
  groundingUrls?: { title?: string; uri: string }[];
}

export interface AIEnrichmentResult {
  nameEn: string;
  nameEs: string;
  materialEn: string;
  hsCode: string;
  usage: string;
  taxRate: number;
  categoryMain: string;
  categorySub: string;
  groundingUrls?: { title?: string; uri: string }[];
}
