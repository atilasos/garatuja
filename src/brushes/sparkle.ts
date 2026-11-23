import { shade, sparklePath } from '../core/tooling/brush-kit';
import { pressureSize } from '../core/tooling/brush-stroke';
import type { BrushDef } from '../core/types';

export default {
  id: 'sparkle', label: { pt: 'Cintilante', en: 'Sparkle' }, order: 200, level: 1, spacing: .38,
  hint: { pt: 'Deixa pequenos brilhos por onde passas.', en: 'Leave little sparkles as you drag.' },
  dab(ctx, d) {
    const radius = pressureSize(d.size, d.pressure) / 2;
    for (let i = 0; i < 2; i++) {
      const angle = d.random() * Math.PI * 2;
      const distance = Math.sqrt(d.random()) * radius;
      ctx.fillStyle = shade(d.color, (d.random() - .35) * .4);
      sparklePath(ctx, d.x + Math.cos(angle) * distance, d.y + Math.sin(angle) * distance, radius * (.3 + d.random() * .5), d.random() * Math.PI / 2);
      ctx.fill();
    }
    ctx.fillStyle = d.color;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const angle = d.random() * Math.PI * 2;
      const distance = radius * (.4 + d.random() * .8);
      const dot = Math.max(1, radius * (.05 + d.random() * .08));
      const x = d.x + Math.cos(angle) * distance;
      const y = d.y + Math.sin(angle) * distance;
      ctx.moveTo(x + dot, y);
      ctx.arc(x, y, dot, 0, Math.PI * 2);
    }
    ctx.fill();
  },
} satisfies BrushDef;
