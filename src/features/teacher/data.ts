export function formatBytes(bytes: number, locale: 'pt' | 'en') {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return new Intl.NumberFormat(locale === 'pt' ? 'pt-PT' : 'en', { maximumFractionDigits: digits }).format(value) + ' ' + units[unit];
}

export function clearPreferences(storage: Pick<globalThis.Storage, 'length' | 'key' | 'removeItem'> = localStorage) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith('garatuja.')) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}
