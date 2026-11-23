import { clampRect, hexToRgb, rgbToHsl } from '../core/draw';
import { mix } from '../core/tooling/brush-kit';
import { showCrossCursor } from '../core/tooling/brush-stroke';
import {
  arrowHeading, defaultSize, placeShape, pointBounds, regularShapes, resolveBox, shapeIds, shapeOutline, turnTowards,
  type Box, type Heading, type ShapeId,
} from '../core/tooling/shape-geometry';
import type { L10n, PaintPointer, Point, Tool, ToolContext } from '../core/types';
import { drawingIcons } from '../ui/drawing-icons';
import { icons } from '../ui/icons';

const names: Record<ShapeId, L10n> = {
  square: { pt: 'Quadrado', en: 'Square' }, rectangle: { pt: 'Retângulo', en: 'Rectangle' },
  circle: { pt: 'Círculo', en: 'Circle' }, ellipse: { pt: 'Elipse', en: 'Ellipse' },
  triangle: { pt: 'Triângulo', en: 'Triangle' }, star5: { pt: 'Estrela', en: 'Star' },
  heart: { pt: 'Coração', en: 'Heart' }, diamond: { pt: 'Losango', en: 'Diamond' },
  pentagon: { pt: 'Pentágono', en: 'Pentagon' }, hexagon: { pt: 'Hexágono', en: 'Hexagon' },
  octagon: { pt: 'Octógono', en: 'Octagon' }, star6: { pt: 'Estrela de 6 pontas', en: '6-point star' },
  arrow: { pt: 'Seta', en: 'Arrow' },
};
const simple: ReadonlySet<ShapeId> = new Set(['square', 'rectangle', 'circle', 'ellipse', 'triangle', 'star5', 'heart']);

const hint: L10n = {
  pt: 'Escolhe uma forma e arrasta para lhe dar tamanho. Com «Rodar», depois aponta para onde ela deve olhar.',
  en: 'Pick a shape and drag to size it. With “Rotate”, then point where it should face.',
};

const rotateHint: L10n = {
  pt: 'Agora aponta para onde a forma deve olhar e toca para a pôr aqui.',
  en: 'Now point where the shape should face and tap to place it.',
};

type Style = 'solid' | 'outline' | 'both';

/** The shape being sized (start) or, once sized, waiting to be turned (placed). */
let start: PaintPointer | undefined;
let placed: { shape: ShapeId; box: Box; heading: Heading } | undefined;
let angle = 0;
let turning = false;

const widths = [3, 6, 10, 16, 24];

/** A darker (or, for dark colours, lighter) tone of the colour, for the outline of "filled + outline". */
function edgeColor(color: string) {
  return rgbToHsl(hexToRgb(color)).l < .28 ? mix(color, '#ffffff', .5) : mix(color, '#000000', .5);
}

function outlinePoints(c: ToolContext, shape: ShapeId, box: Box, heading: Heading, turn: number) {
  const style = c.opt<Style>('style');
  const inset = style === 'solid' ? 0 : c.opt<number>('width');
  const w = Math.max(2, box.w - inset);
  const h = Math.max(2, box.h - inset);
  // For a vertical arrow the outline swaps its own axes, so give it the page-space box.
  return placeShape(shapeOutline(shape, w, h, heading), box.cx, box.cy, turn);
}

function paint(c: ToolContext, shape: ShapeId, box: Box, heading: Heading, turn: number, preview: boolean) {
  const style = c.opt<Style>('style');
  const width = c.opt<number>('width');
  const points = outlinePoints(c, shape, box, heading, turn);
  const ctx = preview ? c.overlay : c.ctx;
  ctx.save();
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  if (preview) ctx.globalAlpha = .85;
  if (style !== 'outline') {
    ctx.fillStyle = c.color;
    ctx.fill();
  }
  if (style !== 'solid') {
    ctx.strokeStyle = style === 'both' ? edgeColor(c.color) : c.color;
    ctx.stroke();
  }
  ctx.restore();
  return pointBounds(points);
}

/** A line from the centre towards the pointer, so the child can see which way the shape will face. */
function drawTurnGuide(c: ToolContext, box: Box, pointer: Point) {
  const ctx = c.overlay;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([2, 12]);
  for (const [width, color] of [[6, 'rgba(255,255,255,.9)'], [2.6, '#332b25']] as const) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(box.cx, box.cy);
    ctx.lineTo(pointer.x, pointer.y);
    ctx.stroke();
  }
  ctx.restore();
}

function dragBox(p: PaintPointer, c: ToolContext) {
  if (!start) return undefined;
  const shape = c.opt<ShapeId>('shape');
  const square = p.constrain || regularShapes.has(shape);
  const fromCenter = c.opt<boolean>('center');
  let box = resolveBox(start, p, { fromCenter, square });
  if (Math.max(box.w, box.h) < 6) {
    const size = defaultSize(shape);
    box = { cx: start.x, cy: start.y, ...size };
  }
  return { shape, box, heading: shape === 'arrow' ? arrowHeading(start, p) : 0 as Heading };
}

function show(p: PaintPointer, c: ToolContext) {
  c.clearOverlay();
  if (placed) {
    const turned = turnTowards({ x: placed.box.cx, y: placed.box.cy }, p, p.constrain);
    if (turned !== undefined) angle = turned;
    paint(c, placed.shape, placed.box, placed.heading, angle, true);
    drawTurnGuide(c, placed.box, p);
  } else {
    const target = dragBox(p, c);
    if (target) paint(c, target.shape, target.box, target.heading, 0, true);
  }
}

function place(c: ToolContext, shape: ShapeId, box: Box, heading: Heading, turn: number) {
  c.clearOverlay();
  const bounds = paint(c, shape, box, heading, turn, false);
  c.markDirty(clampRect({ x: bounds.x - c.opt<number>('width'), y: bounds.y - c.opt<number>('width'),
    w: bounds.w + c.opt<number>('width') * 2, h: bounds.h + c.opt<number>('width') * 2 }));
  c.commit();
  c.sound('shape');
  if (turning) {
    turning = false;
    c.say(hint);
  }
}

export default {
  id: 'shapes', label: { pt: 'Formas', en: 'Shapes' }, icon: icons.shapes, order: 40, level: 1, usesColor: true,
  hint,
  manualCommit: true,
  options: [{
    kind: 'choice', id: 'shape', label: { pt: 'Forma', en: 'Shape' }, default: 'rectangle',
    items: shapeIds.map(shape => ({
      value: shape, label: names[shape], level: simple.has(shape) ? 1 : 2,
      preview(ctx, w, h, color) {
        const box = Math.min(w, h) * .74;
        const outline = shapeOutline(shape, shape === 'rectangle' || shape === 'ellipse' ? box * 1.45 : box, box, 0);
        const points = placeShape(outline, w / 2, h / 2, 0);
        ctx.fillStyle = color;
        ctx.beginPath();
        points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.fill();
      },
    })),
  }, {
    kind: 'choice', id: 'style', label: { pt: 'Preenchimento', en: 'Style' }, default: 'solid',
    items: [
      { value: 'solid', label: { pt: 'Cheia', en: 'Filled' }, icon: drawingIcons.styleFilled },
      { value: 'outline', label: { pt: 'Contorno', en: 'Outline' }, icon: drawingIcons.styleOutline },
      { value: 'both', label: { pt: 'Cheia e contorno', en: 'Filled and outline' }, icon: drawingIcons.styleBoth },
    ],
  }, { kind: 'size', id: 'width', label: { pt: 'Espessura do contorno', en: 'Outline thickness' }, steps: widths, default: 10 },
  { kind: 'toggle', id: 'center', label: { pt: 'Do centro', en: 'From the center' }, icon: drawingIcons.fromCenter, default: false },
  { kind: 'toggle', id: 'turn', label: { pt: 'Rodar', en: 'Rotate' }, icon: drawingIcons.rotate, default: false }],
  down(p, c) {
    if (placed) {
      show(p, c);
      return;
    }
    start = p;
    show(p, c);
  },
  move(p, _previous, c) { show(p, c); },
  up(p, c) {
    if (placed) {
      const { shape, box, heading } = placed;
      const turned = turnTowards({ x: box.cx, y: box.cy }, p, p.constrain);
      if (turned !== undefined) angle = turned;
      placed = undefined;
      start = undefined;
      place(c, shape, box, heading, angle);
      return;
    }
    const target = dragBox(p, c);
    start = undefined;
    if (!target) return;
    if (c.opt('turn')) {
      placed = target;
      angle = 0;
      // Show it upright until the pointer moves; the release point is just a corner of the box.
      c.clearOverlay();
      paint(c, target.shape, target.box, target.heading, 0, true);
      turning = true;
      c.say(rotateHint);
      return;
    }
    place(c, target.shape, target.box, target.heading, 0);
  },
  hover(p, c) {
    if (placed) show(p, c);
    else showCrossCursor(c, p);
  },
  cancel() { start = undefined; placed = undefined; angle = 0; turning = false; },
} satisfies Tool;
