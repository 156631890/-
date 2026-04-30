const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const normalizeChinaHsCode = (value: unknown): string => {
  const digits = normalizeText(value).replace(/\D/g, '');
  return digits.length === 10 ? digits : '';
};
