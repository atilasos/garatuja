/** Device-level data tools for the teacher area. */
import type { ProjectRecord } from '../../core/types';

export const BACKUP_FORMAT = 'garatuja-backup';

function dataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Every work in one JSON file; images become data URLs so the file is self-contained. */
export async function backupFile(projects: ProjectRecord[], now = new Date()) {
  const works = await Promise.all(projects.map(async project => ({
    ...project,
    pages: await Promise.all(project.pages.map(async page => ({
      ...page,
      bitmap: await dataUrl(page.bitmap),
      paper: await dataUrl(page.paper),
      thumb: await dataUrl(page.thumb),
      foreground: page.foreground ? await dataUrl(page.foreground) : undefined,
    }))),
  })));
  const body = JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: now.toISOString(), projects: works });
  const day = now.toISOString().slice(0, 10);
  return { name: `garatuja-todos-os-trabalhos-${day}.json`, blob: new Blob([body], { type: 'application/json' }) };
}

export function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

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
