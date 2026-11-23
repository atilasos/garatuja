import { shade, stepIndex } from '../core/tooling/brush-kit';
import type { BrushDef } from '../core/types';

const spacing = .75;

export default {
  id: 'leaves', label: { pt: 'Folhas', en: 'Leaves' }, order: 320, level: 2, spacing,
  hint: { pt: 'Arrasta para espalhar folhas no teu desenho.', en: 'Drag to scatter leaves on your drawing.' },
  dab(ctx, d) {
    const side = stepIndex(d.travelled, d.size, spacing) % 2 ? 1 : -1;
    const length = d.size * (.75 + d.random() * .3) * (.7 + .5 * d.pressure);
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle + side * (.8 + d.random() * .3));
    ctx.translate(length * .1, 0);
    ctx.fillStyle = shade(d.color, (d.random() - .5) * .22);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(length * .2, -length * .38, length * .75, -length * .3, length, 0);
    ctx.bezierCurveTo(length * .75, length * .3, length * .2, length * .38, 0, 0);
    ctx.fill();
    ctx.strokeStyle = shade(d.color, -.25);
    ctx.globalAlpha = .5;
    ctx.lineWidth = Math.max(1, d.size * .035);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(length * .05, 0);
    ctx.lineTo(length * .85, 0);
    ctx.stroke();
    ctx.restore();
  },
} satisfies BrushDef;
