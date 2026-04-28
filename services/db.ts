import { AppSettings, DEFAULT_APP_SETTINGS, Product } from '../types';

const DB_NAME = 'YiwuSourcingDB';
const PRODUCT_STORE = 'products';
const SETTINGS_STORE = 'settings';
const DB_VERSION = 2;

const waitForTransaction = (transaction: IDBTransaction): Promise<void> => {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const normalizePositiveNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
};

const normalizeString = (value: unknown, fallback: string): string => {
  return typeof value === 'string' ? value : fallback;
};

const normalizeSettings = (raw: unknown): AppSettings => {
  if (!isRecord(raw)) {
    return DEFAULT_APP_SETTINGS;
  }

  const rawInvoiceConfig = isRecord(raw.invoiceConfig) ? raw.invoiceConfig : {};
  const invoiceConfig = {
    sellerName: normalizeString(rawInvoiceConfig.sellerName, DEFAULT_APP_SETTINGS.invoiceConfig.sellerName),
    sellerAddress: normalizeString(rawInvoiceConfig.sellerAddress, DEFAULT_APP_SETTINGS.invoiceConfig.sellerAddress),
    sellerPhone: normalizeString(rawInvoiceConfig.sellerPhone, DEFAULT_APP_SETTINGS.invoiceConfig.sellerPhone),
    sellerEmail: normalizeString(rawInvoiceConfig.sellerEmail, DEFAULT_APP_SETTINGS.invoiceConfig.sellerEmail),
    buyerInfo: normalizeString(rawInvoiceConfig.buyerInfo, DEFAULT_APP_SETTINGS.invoiceConfig.buyerInfo),
    invoiceNo: normalizeString(rawInvoiceConfig.invoiceNo, DEFAULT_APP_SETTINGS.invoiceConfig.invoiceNo),
    date: normalizeString(rawInvoiceConfig.date, DEFAULT_APP_SETTINGS.invoiceConfig.date),
    sailing: normalizeString(rawInvoiceConfig.sailing, DEFAULT_APP_SETTINGS.invoiceConfig.sailing),
    containerNo: normalizeString(rawInvoiceConfig.containerNo, DEFAULT_APP_SETTINGS.invoiceConfig.containerNo),
    sealNo: normalizeString(rawInvoiceConfig.sealNo, DEFAULT_APP_SETTINGS.invoiceConfig.sealNo)
  };

  return {
    id: 'default',
    language: raw.language === 'en' || raw.language === 'zh' || raw.language === 'es'
      ? raw.language
      : DEFAULT_APP_SETTINGS.language,
    euroRmbRate: normalizePositiveNumber(raw.euroRmbRate, DEFAULT_APP_SETTINGS.euroRmbRate),
    usdRmbRate: normalizePositiveNumber(raw.usdRmbRate, DEFAULT_APP_SETTINGS.usdRmbRate),
    freightRateCbm: normalizePositiveNumber(raw.freightRateCbm, DEFAULT_APP_SETTINGS.freightRateCbm),
    invoiceConfig
  };
};

// Open or create the database
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Database error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onblocked = () => {
      reject(new Error('Database upgrade is blocked by another open tab.'));
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PRODUCT_STORE)) {
        db.createObjectStore(PRODUCT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
      }
    };
  });
};

export const dbService = {
  // Get all products
  getAll: async (): Promise<Product[]> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PRODUCT_STORE, 'readonly');
      const store = transaction.objectStore(PRODUCT_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  // Add or Update a product (put handles both)
  save: async (product: Product): Promise<void> => {
    const db = await getDB();
    const transaction = db.transaction(PRODUCT_STORE, 'readwrite');
    const store = transaction.objectStore(PRODUCT_STORE);
    store.put(product);
    await waitForTransaction(transaction);
  },

  // Delete a product by ID
  delete: async (id: string): Promise<void> => {
    const db = await getDB();
    const transaction = db.transaction(PRODUCT_STORE, 'readwrite');
    const store = transaction.objectStore(PRODUCT_STORE);
    store.delete(id);
    await waitForTransaction(transaction);
  },
  
  // Bulk delete
  deleteMany: async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;
    const db = await getDB();
    const transaction = db.transaction(PRODUCT_STORE, 'readwrite');
    const store = transaction.objectStore(PRODUCT_STORE);
    ids.forEach(id => store.delete(id));
    await waitForTransaction(transaction);
  },

  getSettings: async (): Promise<AppSettings> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SETTINGS_STORE, 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get(DEFAULT_APP_SETTINGS.id);

      request.onsuccess = () => {
        resolve(normalizeSettings(request.result));
      };
      request.onerror = () => reject(request.error);
    });
  },

  saveSettings: async (settings: AppSettings): Promise<void> => {
    const db = await getDB();
    const transaction = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    store.put(normalizeSettings(settings));
    await waitForTransaction(transaction);
  }
};
