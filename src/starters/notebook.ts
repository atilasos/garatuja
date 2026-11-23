import type { StarterDef } from '../core/types';

export default {
  id: 'notebook', label: { pt: 'Linhas de caderno', en: 'Notebook lines' }, category: { pt: 'Papel', en: 'Paper' },
  paper(ctx, w, h) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#a8c4dd';
    ctx.beginPath();
    for (let y = 100; y < h; y += 94) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.strokeStyle = '#de989b';
    ctx.beginPath();
    ctx.moveTo(148, 0);
    ctx.lineTo(148, h);
    ctx.stroke();
    ctx.restore();
  },
} satisfies StarterDef;
