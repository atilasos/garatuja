import { describe, expect, test } from 'vitest';
import type { PageRecord } from '../../src/core/types';
import { duplicatePage, movePage, removePage, restorePage } from '../../src/features/pages/operations';

function page(id: string): PageRecord {
  const png = new Blob();
  return { id, bitmap: png, thumb: png, paper: png, text: id, labels: [{
    id: 'label', kind: 'callout', text: 'hello', size: 48, x: 1, y: 1, color: '#000',
    font: 'Andika', target: { x: 24, y: 36 },
  }] };
}

describe('page collection', () => {
  const pages = ['a', 'b', 'c'].map(page);
  const ids = (list: readonly PageRecord[]) => list.map(item => item.id);

  test('moves in both directions without mutating the original', () => {
    expect(ids(movePage(pages, 'a', 2))).toEqual(['b', 'c', 'a']);
    expect(ids(movePage(pages, 'c', 0))).toEqual(['c', 'a', 'b']);
    expect(ids(movePage(pages, 'a', -1))).toEqual(ids(pages));
    expect(ids(pages)).toEqual(['a', 'b', 'c']);
  });

  test('duplicates drawing, paper and text with independent labels', () => {
    const copy = duplicatePage(pages[0], 'copy');
    expect(copy.id).toBe('copy');
    expect(copy.bitmap).toBe(pages[0].bitmap);
    expect(copy.paper).toBe(pages[0].paper);
    expect(copy.text).toBe(pages[0].text);
    expect(copy.labels[0].id).not.toBe(pages[0].labels[0].id);
    expect(copy.labels[0].target).not.toBe(pages[0].labels[0].target);
  });

  test('protects the last page and restores a deleted page by its neighbors', () => {
    expect(removePage([pages[0]], 'a')).toEqual([pages[0]]);
    const remaining = removePage(pages, 'b');
    expect(ids(remaining)).toEqual(['a', 'c']);
    expect(ids(restorePage(remaining, pages[1], 'a', 'c'))).toEqual(ids(pages));
    expect(ids(restorePage(remaining, pages[1], undefined, 'c'))).toEqual(ids(pages));
    expect(restorePage(pages, pages[1], 'a', 'c')).toEqual(pages);
  });
});
