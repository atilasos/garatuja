import { interpolateDabs } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { edgeShade, highlightTint, rgba, shiftColor } from './_util/c-color';
import { DirtyTracker } from './_util/c-geom';

let remaining = 0;
let linkIndex = 0;

function drawLink(
  ctx: CanvasRenderingContext2D,
  p: Point,
  angle: number,
  size: number,
  color: string,
  flat: boolean,
  dirty: DirtyTracker,
) {
  const rx = size * 0.3;
  const ry = flat ? size * 0.17 : size * 0.06;
  const thick = Math.max(2.2, size * 0.095);
  const rim = edgeShade(color);
  const shine = highlightTint(color);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (flat) {
    // Wide front-facing oval link
    ctx.strokeStyle = rim;
    ctx.lineWidth = thick + 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Metallic top glint
    ctx.strokeStyle = rgba(shine, 0.72);
    ctx.lineWidth = Math.max(1, thick * 0.34);
    ctx.beginPath();
    ctx.ellipse(0, -thick * 0.14, rx * 0.84, ry * 0.72, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else {
    // Slim edge-on connector link bridging neighboring oval links
    const half = rx * 0.85;
    ctx.strokeStyle = rim;
    ctx.lineWidth = thick + 2.2;
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);
    ctx.stroke();

    ctx.strokeStyle = shiftColor(color, 0, 0, 0.06);
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);
    ctx.stroke();

    ctx.strokeStyle = rgba(shine, 0.78);
    ctx.lineWidth = Math.max(1, thick * 0.36);
    ctx.beginPath();
    ctx.moveTo(-half * 0.75, -thick * 0.15);
    ctx.lineTo(half * 0.75, -thick * 0.15);
    ctx.stroke();
  }

  ctx.restore();
  dirty.addPoint(p.x, p.y, rx + thick + 3);
}

export default {
  id: 'chain',
  label: { pt: 'Corrente', en: 'Chain' },
  hint: { pt: 'Arrasta para desenhar uma corrente de elos.', en: 'Drag to draw an interlocking chain.' },
  category: 'pintar',
  level: 2,
  order: 120,
  usesColor: true,
  begin() {
    remaining = 0;
    linkIndex = 0;
  },
  stroke(from, to, c, size) {
    const dirty = new DirtyTracker();
    const spacing = Math.max(7, size * 0.34);
    if (from.x === to.x && from.y === to.y) {
      drawLink(c.ctx, to, 0, size, c.color, true, dirty);
      linkIndex = 1;
      remaining = spacing;
    } else {
      remaining = interpolateDabs(from, to, spacing, remaining, (p, _f, angle) => {
        drawLink(c.ctx, p, angle, size, c.color, linkIndex % 2 === 0, dirty);
        linkIndex++;
      });
    }
    dirty.flush(c);
  },
} satisfies MagicEffect;
