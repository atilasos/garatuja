import { strokeBounds } from '../core/draw';
import type { L10n, PaintPointer, Tool, ToolContext } from '../core/types';
import { icons } from '../ui/icons';

const names = {
  rectangle: { pt: 'Retângulo', en: 'Rectangle' }, square: { pt: 'Quadrado', en: 'Square' },
  ellipse: { pt: 'Elipse', en: 'Ellipse' }, circle: { pt: 'Círculo', en: 'Circle' },
  triangle: { pt: 'Triângulo', en: 'Triangle' }, star: { pt: 'Estrela', en: 'Star' },
} satisfies Record<string, L10n>;

let start: PaintPointer | undefined;
function shapePath(ctx: CanvasRenderingContext2D, shape: string, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  if (shape === 'rectangle' || shape === 'square') ctx.rect(x, y, w, h);
  else if (shape === 'ellipse' || shape === 'circle') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else {
    const vertices = shape === 'triangle' ? 3 : 10;
    for (let i = 0; i < vertices; i++) {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / vertices;
      const radius = vertices === 10 && i % 2 ? .43 : 1;
      const px = x + w / 2 + Math.cos(angle) * w / 2 * radius;
      const py = y + h / 2 + Math.sin(angle) * h / 2 * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}

function draw(p: PaintPointer, c: ToolContext, preview: boolean) {
  if (!start) return;
  const shape = c.opt<string>('shape');
  const dx = p.x - start.x;
  const dy = p.y - start.y;
  const regular = p.constrain || shape === 'square' || shape === 'circle';
  const w = Math.max(2, regular ? Math.max(Math.abs(dx), Math.abs(dy)) : Math.abs(dx));
  const h = Math.max(2, regular ? w : Math.abs(dy));
  const x = start.x - (dx < 0 ? w : 0);
  const y = start.y - (dy < 0 ? h : 0);
  const ctx = preview ? c.overlay : c.ctx;
  c.clearOverlay();
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = c.color;
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  shapePath(ctx, shape, x, y, w, h);
  if (c.opt('solid')) ctx.fill();
  else ctx.stroke();
  ctx.restore();
  if (!preview) c.markDirty(strokeBounds({ x, y }, { x: x + w, y: y + h }, 8));
}

export default {
  id: 'shapes', label: { pt: 'Formas', en: 'Shapes' }, icon: icons.shapes, order: 40, level: 1, usesColor: true,
  hint: { pt: 'Escolhe uma forma e arrasta para lhe dar tamanho.', en: 'Pick a shape and drag to set its size.' },
  options: [{
    kind: 'choice', id: 'shape', label: { pt: 'Forma', en: 'Shape' }, default: 'rectangle',
    items: Object.entries(names).map(([value, label]) => ({
      value, label,
      preview(ctx, w, h, color) {
        ctx.fillStyle = color;
        const size = h * .58;
        const width = value === 'square' || value === 'circle' ? size : w * .58;
        shapePath(ctx, value, (w - width) / 2, (h - size) / 2, width, size);
        ctx.fill();
      },
    })),
  }, { kind: 'toggle', id: 'solid', label: { pt: 'Cheia', en: 'Filled' }, icon: icons.solid, default: true }],
  down(p, c) { start = p; draw(p, c, true); },
  move(p, _prev, c) { draw(p, c, true); },
  up(p, c) { draw(p, c, false); start = undefined; c.sound('shape'); },
  cancel() { start = undefined; },
} satisfies Tool;
