import { describe, expect, it } from 'vitest';
import {
  arrowHeading, curveSegments, defaultSize, placeShape, pointBounds, regularShapes, resolveBox, shapeIds, shapeOutline, turnTowards,
  type Heading,
} from '../../src/core/tooling/shape-geometry';

const close = (a: number, b: number, digits = 6) => expect(a).toBeCloseTo(b, digits);

describe('shape outlines', () => {
  it('fill the box that was dragged, exactly, for every shape', () => {
    for (const shape of shapeIds) {
      for (const [w, h] of [[200, 200], [320, 90], [60, 250], [4, 4]]) {
        for (const heading of [0, 1, 2, 3] as Heading[]) {
          const bounds = pointBounds(shapeOutline(shape, w, h, heading));
          close(bounds.w, w, 4);
          close(bounds.h, h, 4);
          close(bounds.x + bounds.w / 2, 0, 4);
          close(bounds.y + bounds.h / 2, 0, 4);
        }
      }
    }
  });

  it('has the right number of corners', () => {
    const corners: Record<string, number> = { square: 4, rectangle: 4, triangle: 3, diamond: 4, pentagon: 5, hexagon: 6, octagon: 8,
      star5: 10, star6: 12, arrow: 7 };
    for (const [shape, count] of Object.entries(corners)) {
      expect(shapeOutline(shape as never, 100, 100)).toHaveLength(count);
    }
  });

  it('puts the apex of the triangle, pentagon and stars at the top centre', () => {
    for (const shape of ['triangle', 'pentagon', 'star5', 'star6', 'diamond'] as const) {
      const points = shapeOutline(shape, 100, 120);
      const top = points.reduce((best, p) => (p.y < best.y ? p : best));
      close(top.x, 0, 4);
      close(top.y, -60, 4);
    }
  });

  it('alternates outer and inner radius in stars, with the classic five-point ratio', () => {
    const points = shapeOutline('star5', 200, 200);
    const centre = pointBounds(points);
    expect(centre.w).toBeCloseTo(200, 4);
    const radius = (p: { x: number; y: number }) => Math.hypot(p.x, p.y);
    const outer = points.filter((_, i) => i % 2 === 0).map(radius);
    const inner = points.filter((_, i) => i % 2 === 1).map(radius);
    expect(Math.min(...outer)).toBeGreaterThan(Math.max(...inner));
    // A regular pentagram has inner/outer radius of about 0.382; fitting to the box stretches both by similar amounts.
    expect(inner[0] / outer[0]).toBeGreaterThan(.33);
    expect(inner[0] / outer[0]).toBeLessThan(.43);
  });

  it('keeps a regular octagon flat on top and symmetrical', () => {
    const points = shapeOutline('octagon', 200, 200);
    const top = points.filter(p => Math.abs(p.y + 100) < 1e-6);
    expect(top).toHaveLength(2);
    close(top[0].x, -top[1].x, 4);
  });

  it('makes a heart that is symmetrical and wider at the top than at the point', () => {
    const points = shapeOutline('heart', 200, 200);
    for (const p of points) {
      const mirror = points.reduce((best, q) => (Math.hypot(q.x + p.x, q.y - p.y) < best ? Math.hypot(q.x + p.x, q.y - p.y) : best), Infinity);
      expect(mirror).toBeLessThan(6);
    }
    const widthAt = (y: number) => {
      const row = points.filter(p => Math.abs(p.y - y) < 12).map(p => p.x);
      return Math.max(...row) - Math.min(...row);
    };
    expect(widthAt(-60)).toBeGreaterThan(widthAt(80));
  });

  it('points an arrow where it was dragged', () => {
    const right = shapeOutline('arrow', 200, 100, 0);
    expect(right.reduce((best, p) => (p.x > best.x ? p : best)).y).toBeCloseTo(0);
    const left = shapeOutline('arrow', 200, 100, 2);
    expect(left.reduce((best, p) => (p.x < best.x ? p : best)).y).toBeCloseTo(0);
    const down = shapeOutline('arrow', 100, 200, 1);
    expect(down.reduce((best, p) => (p.y > best.y ? p : best)).x).toBeCloseTo(0);
    const up = shapeOutline('arrow', 100, 200, 3);
    expect(up.reduce((best, p) => (p.y < best.y ? p : best)).x).toBeCloseTo(0);
    expect(arrowHeading({ x: 0, y: 0 }, { x: 50, y: 10 })).toBe(0);
    expect(arrowHeading({ x: 0, y: 0 }, { x: -50, y: 10 })).toBe(2);
    expect(arrowHeading({ x: 0, y: 0 }, { x: 10, y: 50 })).toBe(1);
    expect(arrowHeading({ x: 0, y: 0 }, { x: 10, y: -50 })).toBe(3);
  });

  it('uses enough segments for round shapes to look round at any size', () => {
    expect(curveSegments(10, 10)).toBeGreaterThanOrEqual(32);
    expect(curveSegments(1200, 900)).toBeGreaterThan(curveSegments(100, 100));
    // The chord of a 600 px circle never strays more than half a pixel from the arc.
    const n = curveSegments(600, 600);
    expect(300 * (1 - Math.cos(Math.PI / n))).toBeLessThan(.5);
  });
});

describe('dragging a box', () => {
  it('uses the drag as a corner-to-corner box in any direction', () => {
    expect(resolveBox({ x: 100, y: 100 }, { x: 300, y: 250 }, { fromCenter: false, square: false })).toEqual({ cx: 200, cy: 175, w: 200, h: 150 });
    expect(resolveBox({ x: 300, y: 250 }, { x: 100, y: 100 }, { fromCenter: false, square: false })).toEqual({ cx: 200, cy: 175, w: 200, h: 150 });
  });

  it('treats the start as the centre when drawing from the centre', () => {
    expect(resolveBox({ x: 400, y: 300 }, { x: 500, y: 250 }, { fromCenter: true, square: false })).toEqual({ cx: 400, cy: 300, w: 200, h: 100 });
  });

  it('keeps width equal to height, growing towards the pointer', () => {
    const box = resolveBox({ x: 100, y: 100 }, { x: 40, y: 260 }, { fromCenter: false, square: true });
    expect(box).toEqual({ cx: 20, cy: 180, w: 160, h: 160 });
    const centred = resolveBox({ x: 100, y: 100 }, { x: 140, y: 120 }, { fromCenter: true, square: true });
    expect(centred).toEqual({ cx: 100, cy: 100, w: 80, h: 80 });
    expect(regularShapes.has('square') && regularShapes.has('circle') && !regularShapes.has('rectangle')).toBe(true);
  });

  it('gives a plain tap a friendly size', () => {
    for (const shape of shapeIds) {
      const size = defaultSize(shape);
      expect(size.w).toBeGreaterThan(100);
      expect(size.h).toBeGreaterThan(100);
    }
  });
});

describe('turning a shape', () => {
  it('rotates around the centre without changing its size', () => {
    const outline = shapeOutline('rectangle', 200, 80);
    const turned = placeShape(outline, 500, 400, Math.PI / 2);
    const bounds = pointBounds(turned);
    close(bounds.w, 80, 4);
    close(bounds.h, 200, 4);
    close(bounds.x + bounds.w / 2, 500, 4);
    close(bounds.y + bounds.h / 2, 400, 4);
    const original = placeShape(outline, 500, 400, 0);
    turned.forEach((p, i) => close(Math.hypot(p.x - 500, p.y - 400), Math.hypot(original[i].x - 500, original[i].y - 400), 4));
  });

  it('faces the pointer: above is upright, to the right is a quarter turn', () => {
    const centre = { x: 400, y: 300 };
    close(turnTowards(centre, { x: 400, y: 100 }, false) ?? NaN, 0);
    close(turnTowards(centre, { x: 700, y: 300 }, false) ?? NaN, Math.PI / 2);
    close(turnTowards(centre, { x: 400, y: 500 }, false) ?? NaN, Math.PI);
    expect(turnTowards(centre, { x: 403, y: 304 }, false)).toBeUndefined();
  });

  it('snaps to multiples of 15° with Shift', () => {
    const snapped = turnTowards({ x: 0, y: 0 }, { x: 300, y: 10 }, true) ?? NaN;
    close(snapped / (Math.PI / 12), Math.round(snapped / (Math.PI / 12)));
    close(snapped, Math.PI / 2);
  });
});
