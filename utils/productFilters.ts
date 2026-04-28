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
