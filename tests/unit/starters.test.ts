import { describe, expect, it } from 'vitest';
import { CANVAS_H, CANVAS_W, type StarterDef } from '../../src/core/types';

const starters = Object.values(import.meta.glob<StarterDef>('../../src/starters/*.ts', { eager: true, import: 'default' }));

type Call = { name: string; args: unknown[]; fillStyle: unknown; globalAlpha: number };

/** A recording stand-in for CanvasRenderingContext2D (Node has no canvas). */
function recorder() {
  const calls: Call[] = [];
  const state: Record<string | symbol, unknown> = { fillStyle: '#000000', strokeStyle: '#000000', globalAlpha: 1, lineWidth: 1 };
  const gradient = () => ({ stops: [] as [number, string][], addColorStop(at: number, color: string) {
    if (!(at >= 0 && at <= 1)) throw new RangeError('Bad gradient stop');
    if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$|^rgba?\(/i.test(color)) throw new SyntaxError('Bad colour ' + color);
    this.stops.push([at, color]);
  } });
  const ctx: CanvasRenderingContext2D = new Proxy({} as CanvasRenderingContext2D, {
    get(_target, key) {
      if (key === 'canvas') return { width: CANVAS_W, height: CANVAS_H };
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient();
      if (key in state) return state[key];
      return (...args: unknown[]) => {
        for (const value of args) if (typeof value === 'number' && !Number.isFinite(value)) throw new RangeError(`${String(key)} got ${value}`);
        calls.push({ name: String(key), args, fillStyle: state.fillStyle, globalAlpha: state.globalAlpha as number });
      };
    },
    set(_target, key, value) {
      if ((key === 'fillStyle' || key === 'strokeStyle') && typeof value === 'string' && !/^#[0-9a-f]{6}([0-9a-f]{2})?$|^rgba?\(/i.test(value)) {
        throw new SyntaxError(`Bad colour ${value}`);
      }
      state[key] = value;
      return true;
    },
  });
  return { ctx, calls };
}

const opaque = (style: unknown) => typeof style !== 'string' || /^#[0-9a-f]{6}$/i.test(style);

describe('starters', () => {
  it('include every structural template and eight scenes', () => {
    const ids = starters.map(starter => starter.id);
    for (const id of ['plain', 'notebook', 'squared', 'dotted', 'frame', 'comic-2', 'comic-3', 'comic-4', 'comic-6', 'diagram',
      'cycle', 'timeline', 'before-after', 'poster', 'book-page', 'book-cover', 'postcard']) expect(ids).toContain(id);
    expect(starters.filter(starter => starter.category.pt === 'Cenários')).toHaveLength(8);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const starter of starters) {
    it(`${starter.id} paints without errors and keeps the page usable`, () => {
      expect(starter.label.pt.trim()).not.toBe('');
      expect(starter.label.en.trim()).not.toBe('');
      const paper = recorder();
      starter.paper(paper.ctx, CANVAS_W, CANVAS_H);
      if (starter.category.pt === 'Cenários') {
        // A scene replaces the paper colour: its first fill must cover the page with an opaque colour.
        const first = paper.calls.find(call => call.name === 'fillRect');
        expect(first?.args).toEqual([0, 0, CANVAS_W, CANVAS_H]);
        expect(opaque(first?.fillStyle)).toBe(true);
        expect(first?.globalAlpha).toBe(1);
      }
      if (starter.foreground) {
        const top = recorder();
        starter.foreground(top.ctx, CANVAS_W, CANVAS_H);
        expect(top.calls.length).toBeGreaterThan(0);
        // Foreground line art must never cover the child's drawing.
        expect(top.calls.some(call => call.name === 'fill' || call.name === 'fillRect')).toBe(false);
      }
    });
  }
});
