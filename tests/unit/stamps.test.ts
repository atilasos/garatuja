import { readdirSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stamps } from '../../src/core/registry';
import { catalog } from '../../src/stamps/noto/catalog';
import { outline, outlineBounds, removePaper, tracePath } from '../../src/stamps/ui/cutout';
import type { Point } from '../../src/core/types';

describe('stamp catalog', () => {
  it('has a unique id, both names and a source for every stamp', () => {
    const library = stamps.all();
    expect(library.length).toBeGreaterThanOrEqual(220);
    expect(new Set(library.map(stamp => stamp.id)).size).toBe(library.length);
    for (const { label, category, src } of library) {
      expect([label.pt, label.en, category.pt, category.en].every(name => name.trim().length)).toBe(true);
      expect(src).toBeTruthy();
    }
  });

  it('ships precisely the SVGs listed in the manifest as asset URLs', () => {
    const folder = new URL('../../src/stamps/noto/', import.meta.url);
    const files = catalog.flatMap(([, entries]) => entries.map(([code]) => `emoji_u${code}.svg`));
    expect(readdirSync(folder).filter(file => file.endsWith('.svg')).sort()).toEqual(files.sort());
    const bySource = new Map(stamps.all().map(stamp => [basename(new URL(stamp.src, 'http://localhost').pathname), stamp]));
    for (const file of files) {
      expect(readFileSync(new URL(file, folder), 'utf8')).toContain('<svg');
      expect(bySource.get(file)?.credit).toBe('Noto Emoji');
    }
  });
});

describe('cutouts', () => {
  it('keeps the concave lasso outline, closes it, and clips its bounds to the sheet', () => {
    const path = [{ x: -5, y: 6 }, { x: 12, y: 3 }, { x: 4, y: 8 }, { x: 17, y: 20 }];
    const polygon = outline('lasso', path);
    const traced: (Point | string)[] = [];
    tracePath({
      beginPath: () => { traced.push('begin'); },
      moveTo: (x, y) => { traced.push({ x, y }); },
      lineTo: (x, y) => { traced.push({ x, y }); },
      closePath: () => { traced.push('close'); },
    }, polygon);
    expect(traced).toEqual(['begin', ...path, 'close']);
    expect(outlineBounds(polygon, 15, 19)).toEqual({ x: 0, y: 3, w: 15, h: 16 });
  });

  it('removes exact and near paper matches without touching ink or the lasso transparency', () => {
    const picture = new Uint8ClampedArray([255, 255, 255, 255, 11, 95, 220, 255, 6, 120, 180, 127, 0, 0, 0, 0]);
    const paper = new Uint8ClampedArray([255, 255, 255, 255, 0, 100, 218, 255, 23, 120, 180, 255, 255, 255, 255, 255]);
    expect(removePaper(picture, paper)).toBe(true);
    expect([...picture]).toEqual([255, 255, 255, 0, 11, 95, 220, 0, 6, 120, 180, 127, 0, 0, 0, 0]);
    expect(removePaper(paper.slice(), paper)).toBe(false);
  });
});
