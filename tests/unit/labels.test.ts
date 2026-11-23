import { describe, expect, it } from 'vitest';
import {
  arrowGeometry, defaultTarget, distanceToSegment, ellipseTail, hitLabel, labelExtent, labelRenderer, layoutLabel, layoutPlain,
  legibleInk, contrastWithWhite, movedLabel, nextBadge, onColor, shoutPoints, thoughtTrail, typeOf, typePatch, wrapText,
  type MeasureContext,
} from '../../src/core/labels';
import { CANVAS_H, CANVAS_W, type LabelObject } from '../../src/core/types';
import { canvasFont, fontDef, fontDefs } from '../../src/fonts/stacks';

/** Every glyph is half a font-size wide, whatever the font: wrapping becomes predictable. */
function ruler(): MeasureContext {
  const context: MeasureContext = {
    font: '',
    measureText(text: string) {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(context.font)?.[1] ?? 10);
      return { width: Array.from(text).length * size / 2 };
    },
  };
  return context;
}

function label(patch: Partial<LabelObject> = {}): LabelObject {
  return { id: 'a', kind: 'callout', x: 100, y: 100, text: 'raiz', font: 'Andika', size: 40, color: '#292a33', target: { x: 400, y: 400 }, ...patch };
}

describe('wrapText', () => {
  const measure = (text: string) => Array.from(text).length;

  it('wraps at word boundaries and keeps explicit newlines', () => {
    expect(wrapText('uma casa muito grande', 10, measure)).toEqual(['uma casa', 'muito', 'grande']);
    expect(wrapText('a\n\nb', 10, measure)).toEqual(['a', '', 'b']);
    expect(wrapText('', 10, measure)).toEqual(['']);
  });

  it('breaks a word wider than the line by code point, never inside an emoji', () => {
    expect(wrapText('abcdefghij', 4, measure)).toEqual(['abcd', 'efgh', 'ij']);
    expect(wrapText('😀😀😀😀😀', 2, measure)).toEqual(['😀😀', '😀😀', '😀']);
  });

  it('never returns a line wider than the limit (for words that can be broken)', () => {
    const lines = wrapText('Os meninos foram ao jardim ver as flores amarelas e vermelhas', 16, measure);
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(16);
    expect(lines.join(' ')).toBe('Os meninos foram ao jardim ver as flores amarelas e vermelhas');
  });

  it('lays plain text out with the same wrapping', () => {
    const plain = layoutPlain('um dois tres quatro', 'Andika', 20, 100, ruler());
    expect(plain.lines.length).toBeGreaterThan(1);
    expect(plain.width).toBeLessThanOrEqual(100);
    expect(plain.lineHeight).toBeCloseTo(20 * fontDef('Andika').lineHeight);
  });
});

describe('layout', () => {
  it('sizes a callout around its text and badge', () => {
    const plain = layoutLabel(label(), ruler());
    const numbered = layoutLabel(label({ badge: '1' }), ruler());
    expect(plain.bounds.x).toBe(100);
    expect(plain.bounds.w).toBeGreaterThan(plain.textBox.w);
    expect(numbered.bounds.w).toBeGreaterThan(plain.bounds.w);
    expect(numbered.badge?.r).toBeGreaterThan(0);
    expect(numbered.textBox.x).toBeGreaterThan(plain.textBox.x);
  });

  it('does not depend on where the label sits (moving never re-wraps)', () => {
    const long = 'Uma frase bastante comprida que obriga a mudar de linha duas vezes';
    const a = layoutLabel(label({ text: long, x: 10, y: 10 }), ruler());
    const b = layoutLabel(label({ text: long, x: 900, y: 700 }), ruler());
    expect(a.lines).toEqual(b.lines);
    expect(a.bounds.w).toBe(b.bounds.w);
  });

  it('centres balloon text inside the ellipse and keeps the anchor at the top-left', () => {
    const balloon = layoutLabel(label({ kind: 'balloon', shape: 'speech', text: 'Olá!' }), ruler());
    expect(balloon.align).toBe('center');
    expect(balloon.bounds.x).toBe(100);
    const centre = balloon.bounds.x + balloon.bounds.w / 2;
    expect(balloon.textBox.x + balloon.textBox.w / 2).toBeCloseTo(centre);
    expect(balloon.bounds.w).toBeGreaterThan(balloon.textBox.w);
  });

  it('has a sensible size for an empty label', () => {
    const empty = layoutLabel(label({ text: '' }), ruler());
    expect(empty.lines).toEqual(['']);
    expect(empty.bounds.w).toBeGreaterThan(40);
    expect(empty.bounds.h).toBeGreaterThan(40);
  });

  it('adds the arrow tip to the footprint', () => {
    const item = label({ target: { x: 900, y: 800 } });
    const extent = labelExtent(item, layoutLabel(item, ruler()));
    expect(extent.x + extent.w).toBeGreaterThan(900);
    expect(extent.y + extent.h).toBeGreaterThan(800);
  });
});

describe('hit testing', () => {
  it('hits the shape, the leader line and nothing else', () => {
    const item = label();
    const layout = layoutLabel(item, ruler());
    const inside = { x: layout.bounds.x + layout.bounds.w / 2, y: layout.bounds.y + layout.bounds.h / 2 };
    expect(hitLabel(item, layout, inside)).toBe(true);
    const mid = { x: (inside.x + 400) / 2, y: (inside.y + 400) / 2 };
    expect(hitLabel(item, layout, mid)).toBe(true);
    expect(hitLabel(item, layout, { x: 1500, y: 1100 })).toBe(false);
    expect(hitLabel({ ...item, target: undefined }, layout, mid)).toBe(false);
  });

  it('returns the topmost label first', () => {
    const below = label({ id: 'below', x: 100, y: 100, target: undefined });
    const above = label({ id: 'above', x: 110, y: 110, target: undefined });
    const point = { x: 130, y: 130 };
    const found = labelRenderer.at(ruler() as unknown as CanvasRenderingContext2D, [below, above], point);
    expect(found?.id).toBe('above');
    expect(labelRenderer.at(ruler() as unknown as CanvasRenderingContext2D, [below, above], { x: 5, y: 5 })).toBeUndefined();
  });
});

describe('arrow and tail geometry', () => {
  const box = { x: 100, y: 100, w: 200, h: 80 };

  it('starts the arrow at the box and ends exactly on the target', () => {
    const arrow = arrowGeometry(box, { x: 600, y: 140 }, 6);
    expect(arrow).toBeDefined();
    if (!arrow) return;
    expect(arrow.tip).toEqual({ x: 600, y: 140 });
    expect(arrow.head[0]).toEqual({ x: 600, y: 140 });
    expect(arrow.from.x).toBeLessThan(300);
    expect(arrow.from.x).toBeGreaterThan(200);
    expect(arrow.from.y).toBeCloseTo(140);
    expect(arrow.head[1].y).not.toBeCloseTo(arrow.head[3].y);
  });

  it('draws no arrow when the target is inside the box or touching it', () => {
    expect(arrowGeometry(box, { x: 200, y: 140 }, 6)).toBeUndefined();
    expect(arrowGeometry(box, { x: 302, y: 140 }, 6)).toBeUndefined();
  });

  it('attaches a speech tail on the side facing the target', () => {
    const c = { x: 300, y: 300 };
    const tail = ellipseTail(c, 150, 80, { x: 300, y: 600 }, 60);
    expect(tail).toBeDefined();
    if (!tail) return;
    expect(tail.tip).toEqual({ x: 300, y: 600 });
    expect(tail.p1.y).toBeGreaterThan(c.y);
    expect(tail.p2.y).toBeGreaterThan(c.y);
    expect(Math.abs(tail.p1.x - tail.p2.x)).toBeGreaterThan(20);
    expect(ellipseTail(c, 150, 80, { x: 320, y: 310 }, 60)).toBeUndefined();
  });

  it('trails thought bubbles towards the target, getting smaller', () => {
    const trail = thoughtTrail({ x: 300, y: 300 }, 150, 80, { x: 300, y: 700 }, 50);
    expect(trail).toHaveLength(3);
    expect(trail[0].r).toBeGreaterThan(trail[2].r);
    expect(trail[0].y).toBeLessThan(trail[2].y);
    expect(thoughtTrail({ x: 300, y: 300 }, 150, 80, { x: 310, y: 305 }, 50)).toEqual([]);
  });

  it('stretches the nearest spike of a shout balloon to the target', () => {
    const bounds = { x: 100, y: 100, w: 300, h: 160 };
    const plain = shoutPoints(bounds);
    const aimed = shoutPoints(bounds, { x: 250, y: 600 });
    expect(aimed).toHaveLength(plain.length);
    expect(aimed.some(point => point.x === 250 && point.y === 600)).toBe(true);
  });

  it('measures distances to segments', () => {
    expect(distanceToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
    expect(distanceToSegment({ x: -3, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
  });

  it('puts the default target on the page, below the label when there is room', () => {
    const below = defaultTarget({ x: 100, y: 100, w: 200, h: 80 }, 64);
    expect(below.y).toBeGreaterThan(180);
    const bottom = defaultTarget({ x: 100, y: CANVAS_H - 100, w: 200, h: 80 }, 64);
    expect(bottom.y).toBeLessThan(CANVAS_H - 100);
  });
});

describe('moving', () => {
  it('keeps the shape on the page and carries the target along', () => {
    const item = label({ x: 50, y: 50, target: { x: 300, y: 300 } });
    const layout = layoutLabel(item, ruler());
    const moved = movedLabel(item, layout, 200, 100);
    expect(moved.x).toBe(250);
    expect(moved.target).toEqual({ x: 500, y: 400 });
    const clamped = movedLabel(item, layout, -500, -500);
    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(0);
    expect(clamped.target).toEqual({ x: 250, y: 250 });
    const far = movedLabel(item, layout, 5000, 5000);
    expect(far.x + layout.bounds.w).toBeLessThanOrEqual(CANVAS_W);
    expect(far.y + layout.bounds.h).toBeLessThanOrEqual(CANVAS_H);
  });
});

describe('kinds, numbers and colours', () => {
  it('maps what the child picks to kind, shape and badge and back', () => {
    for (const type of ['text', 'callout', 'number', 'speech', 'thought', 'shout', 'box'] as const) {
      const patch = typePatch(type, []);
      expect(typeOf({ kind: patch.kind, shape: patch.shape, badge: patch.badge })).toBe(type);
    }
    expect(typePatch('number', []).badge).toBe('1');
    expect(typePatch('thought', []).kind).toBe('balloon');
  });

  it('numbers new labels with the smallest free number', () => {
    expect(nextBadge([])).toBe('1');
    expect(nextBadge([{ badge: '1' }, { badge: '2' }, { badge: '3' }])).toBe('4');
    expect(nextBadge([{ badge: '1' }, { badge: '3' }])).toBe('2');
    expect(nextBadge([{ badge: undefined }, { badge: 'A' }])).toBe('1');
  });

  it('darkens colours that cannot be read on white and leaves good ones alone', () => {
    expect(contrastWithWhite('#ffca49')).toBeLessThan(2);
    expect(contrastWithWhite(legibleInk('#ffca49'))).toBeGreaterThanOrEqual(4.5);
    expect(legibleInk('#292a33')).toBe('#292a33');
    expect(onColor('#292a33')).toBe('#ffffff');
    expect(onColor('#f8e99b')).toBe('#292a33');
  });
});

describe('serialization', () => {
  it('survives JSON and structuredClone with an identical layout', () => {
    const labels: LabelObject[] = [
      label({ id: 'x', badge: '2' }),
      label({ id: 'y', kind: 'balloon', shape: 'thought', text: 'Será?\nTalvez 😀', target: { x: 50, y: 700 } }),
      label({ id: 'z', kind: 'text', text: 'Título', target: undefined, font: 'Fredoka' }),
    ];
    const viaJson: LabelObject[] = JSON.parse(JSON.stringify(labels));
    const viaClone = structuredClone(labels);
    for (const copy of [viaJson, viaClone]) {
      expect(copy.map(item => layoutLabel(item, ruler()).bounds)).toEqual(labels.map(item => layoutLabel(item, ruler()).bounds));
      expect(copy.map(item => typeOf(item))).toEqual(['number', 'thought', 'text']);
    }
  });

  it('keeps unknown font ids usable and offers the four school fonts', () => {
    expect(fontDefs.map(font => font.id)).toEqual(['Andika', 'Playwrite PT', 'Fredoka', 'Courier Prime']);
    expect(canvasFont('Playwrite PT', 40)).toContain('"Playwrite PT"');
    expect(canvasFont('Outra', 40)).toContain('"Outra"');
  });
});
