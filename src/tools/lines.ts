import { seededRandom, strokeBounds } from '../core/draw';
import { BrushStroke, brushChoice, brushSizes, currentBrush, pressureSize, showSizeCursor } from '../core/tooling/brush-stroke';
import type { PaintPointer, Tool, ToolContext } from '../core/types';
import { icons } from '../ui/icons';

let start: PaintPointer | undefined;
let seed = 0;

function draw(p: PaintPointer, c: ToolContext, preview: boolean) {
  if (!start) return;
  const dx = p.x - start.x;
  const dy = p.y - start.y;
  const length = Math.hypot(dx, dy);
  let angle = Math.atan2(dy, dx);
  if (p.constrain) angle = Math.round(angle / (Math.PI / 12)) * Math.PI / 12;
  const end = { ...p, x: start.x + length * Math.cos(angle), y: start.y + length * Math.sin(angle) };
  const ctx = preview ? c.overlay : c.ctx;
  c.clearOverlay();
  const stroke = new BrushStroke(currentBrush(c), c.opt('size'), c.color, seededRandom(seed));
  stroke.line(ctx, start, end, angle);
  if (!preview) c.markDirty(strokeBounds(start, end, stroke.padding));
}

export default {
  id: 'lines', label: { pt: 'Linhas', en: 'Lines' }, icon: icons.lines, order: 30, level: 2, usesColor: true,
  hint: { pt: 'Arrasta para fazer uma linha reta. Usa Shift para acertar o ângulo.', en: 'Drag to draw a straight line. Hold Shift to snap the angle.' },
  options: [brushSizes, brushChoice],
  down(p, c) { start = p; seed = Math.floor(c.random() * 4294967296); draw(p, c, true); },
  move(p, _prev, c) { draw(p, c, true); },
  up(p, c) { draw(p, c, false); start = undefined; c.sound('line'); },
  hover(p, c) { showSizeCursor(c, p, pressureSize(c.opt('size'), .5)); },
  cancel() { start = undefined; },
} satisfies Tool;
