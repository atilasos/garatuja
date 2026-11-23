import { floodRegion, paintRegion, type Region } from '../core/flood';
import { showCrossCursor, showSizeCursor } from '../core/tooling/brush-stroke';
import {
  defaultGradient, drawFillSample, fillModes, fillPainter, gradientModes, type FillMode, type Gradient,
} from '../core/tooling/fill-styles';
import { clampRect, hexToRgb, rgbToHex, strokeBounds } from '../core/draw';
import { viewport } from '../core/canvas';
import type { L10n, PaintPointer, Point, Tool, ToolContext } from '../core/types';
import { icons } from '../ui/icons';

type RegionMode = FillMode | 'brush' | 'erase';
const modes: RegionMode[] = [...fillModes, 'brush', 'erase'];
const names: Record<RegionMode, L10n> = {
  brush: { pt: 'Pincel', en: 'Brush' }, erase: { pt: 'Apagar zona', en: 'Erase area' },
  solid: { pt: 'Cor lisa', en: 'Solid' }, linear: { pt: 'Degradé reto', en: 'Straight fade' },
  radial: { pt: 'Degradé redondo', en: 'Round fade' }, stripes: { pt: 'Riscas', en: 'Stripes' },
  dots: { pt: 'Bolas', en: 'Dots' }, checks: { pt: 'Xadrez', en: 'Checks' },
  waves: { pt: 'Ondas', en: 'Waves' }, bricks: { pt: 'Tijolos', en: 'Bricks' },
};

const TOLERANCE = 32;

/** A fade waits for the drag that gives it a direction, so the flooded region is kept meanwhile. */
interface Pending { region: Region; source: ImageData; guide?: Uint8ClampedArray; start: Point; mode: 'linear' | 'radial' }
let pending: Pending | undefined;
let brushRegion: Region | undefined;
const fillHint = { pt: 'Toca numa zona para a encher.', en: 'Tap an area to fill it.' };
const brushHint = { pt: 'Arrasta para pintar sem sair da zona onde tocaste.', en: 'Drag to paint inside the area you touched.' };
const eraseHint = { pt: 'Toca numa zona para voltar a ver o papel.', en: 'Tap an area to bring back the paper.' };

function paintWithin(c: ToolContext, region: Region, from: Point, to: Point) {
  const brushRadius = c.opt<number>('size') / 2;
  const { x, y, w, h } = clampRect(strokeBounds(from, to, brushRadius + 1), c.width, c.height);
  if (!w || !h) return;
  const area = c.ctx.getImageData(x, y, w, h);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const span = dx * dx + dy * dy || 1;
  const { r, g, b } = hexToRgb(c.color);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      if (!region.mask[(y + row) * c.width + x + col]) continue;
      const px = x + col + .5 - from.x;
      const py = y + row + .5 - from.y;
      const along = Math.min(1, Math.max(0, (px * dx + py * dy) / span));
      const distance = Math.hypot(px - dx * along, py - dy * along);
      const opacity = Math.min(1, Math.max(0, brushRadius + .5 - distance));
      if (!opacity) continue;
      const i = (row * w + col) * 4;
      area.data[i] += (r - area.data[i]) * opacity;
      area.data[i + 1] += (g - area.data[i + 1]) * opacity;
      area.data[i + 2] += (b - area.data[i + 2]) * opacity;
    }
  }
  c.ctx.putImageData(area, x, y);
  c.markDirty({ x, y, w, h });
}

function eraseRegion(c: ToolContext, source: ImageData, region: Region, guide?: Uint8ClampedArray) {
  const paper = c.paper.getContext('2d')?.getImageData(0, 0, c.width, c.height).data;
  if (!paper) return;
  const result = paintRegion(source, region, (x, y, out) => {
    const i = (y * c.width + x) * 4;
    out.r = paper[i]; out.g = paper[i + 1]; out.b = paper[i + 2];
  }, { foreground: guide, fringe: true });
  if (!result) return;
  const { x, y, w, h } = result.dirty;
  source.data.set(result.data);
  c.ctx.putImageData(source, 0, 0, x, y, w, h);
  c.markDirty(result.dirty);
  c.sound('fill');
}

function gradientFor(p: Pending, to: Point): Gradient {
  const dragged = Math.hypot(to.x - p.start.x, to.y - p.start.y) >= 8;
  return dragged ? { from: p.start, to } : defaultGradient(p.mode, p.region.bounds, p.start);
}

/** Preview at reduced resolution: only the flooded region, painted into a small canvas and stretched. */
function preview(c: ToolContext, p: Pending, to: Point) {
  const { region } = p;
  const { bounds } = region;
  const step = Math.max(1, Math.ceil(Math.max(bounds.w, bounds.h) / 420));
  const w = Math.ceil(bounds.w / step);
  const h = Math.ceil(bounds.h / step);
  const painter = fillPainter(p.mode, c.color, gradientFor(p, to));
  if (typeof painter !== 'function') return;
  const small = viewport(w, h);
  const image = small.createImageData(w, h);
  const out = { r: 0, g: 0, b: 0 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = bounds.x + x * step;
      const py = bounds.y + y * step;
      if (px >= region.width || py >= region.height || !region.mask[py * region.width + px]) continue;
      painter(px, py, out);
      image.data.set([out.r, out.g, out.b, 235], (y * w + x) * 4);
    }
  }
  small.putImageData(image, 0, 0);
  c.clearOverlay();
  c.overlay.drawImage(small.canvas, bounds.x, bounds.y, w * step, h * step);
}

function apply(c: ToolContext, source: ImageData, region: Region, mode: FillMode, gradient: Gradient | undefined, guide?: Uint8ClampedArray) {
  const result = paintRegion(source, region, fillPainter(mode, c.color, gradient), { foreground: guide, fringe: true });
  if (!result) return;
  const { x, y, w, h } = result.dirty;
  source.data.set(result.data);
  c.ctx.putImageData(source, 0, 0, x, y, w, h);
  c.markDirty(result.dirty);
  c.sound('fill');
}

function uniform(data: Uint8ClampedArray) {
  const words = new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4);
  const first = words[0];
  for (let i = 1; i < words.length; i++) {
    if (words[i] !== first) return false;
  }
  return true;
}

function start(p: PaintPointer, c: ToolContext) {
  pending = undefined;
  brushRegion = undefined;
  const source = c.ctx.getImageData(0, 0, c.width, c.height);
  const guide = c.foreground?.getContext('2d')?.getImageData(0, 0, c.width, c.height).data;
  const mode = c.opt<RegionMode>('mode');
  // A flat sheet has no boundary to discover or antialiased fringe to rebuild.
  if (mode === 'solid' && !guide && uniform(source.data)) {
    c.ctx.save();
    c.ctx.fillStyle = c.color;
    c.ctx.fillRect(0, 0, c.width, c.height);
    c.ctx.restore();
    const before = rgbToHex({ r: source.data[0], g: source.data[1], b: source.data[2] });
    if (c.markSolidChange) c.markSolidChange(before, c.color);
    else c.markAllDirty();
    c.sound('fill');
    return;
  }
  const region = floodRegion(source, p, TOLERANCE, guide);
  if (!region) return;
  if (mode === 'brush') {
    brushRegion = region;
    paintWithin(c, region, p, p);
    c.sound('fill');
  } else if (mode === 'erase') eraseRegion(c, source, region, guide);
  else if (mode === 'linear' || mode === 'radial') {
    pending = { region, source, guide, start: { x: p.x, y: p.y }, mode };
    preview(c, pending, p);
  } else apply(c, source, region, mode, undefined, guide);
}

export default {
  id: 'fill', label: { pt: 'Encher', en: 'Fill' }, icon: icons.fill, order: 50, level: 1, usesColor: true,
  hint: fillHint,
  optionHint(option) {
    const mode = option('mode') as RegionMode;
    if (mode === 'brush') return brushHint;
    if (mode === 'erase') return eraseHint;
    if (mode === 'linear' || mode === 'radial') return {
      pt: 'Toca numa zona e arrasta para orientar o degradé.', en: 'Tap an area and drag to aim the fade.',
    };
    return fillHint;
  },
  options: [{ kind: 'size', id: 'size', label: { pt: 'Tamanho', en: 'Size' },
    steps: [16, 36, 68, 104, 160], default: 104, visible: option => option('mode') === 'brush' }, {
    kind: 'choice', id: 'mode', label: { pt: 'Enchimento', en: 'Fill style' }, default: 'solid',
    items: modes.map(mode => mode === 'brush' || mode === 'erase' ? {
      value: mode, label: names[mode], icon: mode === 'brush' ? icons.paint : icons.eraser, level: 1,
    } : ({
      value: mode, label: names[mode], level: mode === 'solid' || mode === 'stripes' || mode === 'dots' ? 1 : 2,
      preview: (ctx, w, h, color) => drawFillSample(ctx, w, h, mode, color),
    })),
  }],
  tapOnly: c => c.opt<RegionMode>('mode') !== 'brush' && !gradientModes.has(c.opt<FillMode>('mode')),
  down(p, c) { c.clearOverlay(); start(p, c); },
  move(p, previous, c) {
    if (brushRegion) paintWithin(c, brushRegion, previous, p);
    else if (pending) preview(c, pending, p);
  },
  up(p, c) {
    brushRegion = undefined;
    const current = pending;
    pending = undefined;
    if (!current) return;
    c.clearOverlay();
    apply(c, current.source, current.region, current.mode, gradientFor(current, p), current.guide);
  },
  hover(p, c) {
    if (c.opt('mode') === 'brush') showSizeCursor(c, p, c.opt('size'));
    else showCrossCursor(c, p, 14);
  },
  cancel() { pending = undefined; brushRegion = undefined; },
} satisfies Tool;
