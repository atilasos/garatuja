import type { PageRecord } from '../../core/types';

export const maxPages = 60;

export function movePage(pages: readonly PageRecord[], id: string, position: number): PageRecord[] {
  const from = pages.findIndex(page => page.id === id);
  const result = [...pages];
  if (from >= 0 && position >= 0 && position < pages.length) {
    const [page] = result.splice(from, 1);
    result.splice(position, 0, page);
  }
  return result;
}

export function duplicatePage(page: PageRecord, id: string): PageRecord {
  return { ...page, id, labels: page.labels.map(label => ({ ...structuredClone(label), id: crypto.randomUUID() })) };
}

export function removePage(pages: readonly PageRecord[], id: string): PageRecord[] {
  return pages.length > 1 ? pages.filter(page => page.id !== id) : [...pages];
}

export function restorePage(pages: readonly PageRecord[], removed: PageRecord, before?: string, after?: string): PageRecord[] {
  const result = [...pages];
  if (result.length >= maxPages || result.some(page => page.id === removed.id)) return result;
  const nextIndex = result.findIndex(page => page.id === after);
  const prevIndex = result.findIndex(page => page.id === before);
  result.splice(nextIndex >= 0 ? nextIndex : prevIndex >= 0 ? prevIndex + 1 : result.length, 0, removed);
  return result;
}
