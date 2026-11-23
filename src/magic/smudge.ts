import { clampRect, interpolateDabs } from '../core/draw';
import type { MagicEffect, Point } from '../core/types';
import { brushCoverage } from './_util/b-bitmap';
import { byte } from './_util/b-color';

let carry: Uint8ClampedArray | null = null;
let carryWidth = 0;
let carryHeight = 0;

function stamp(c: Parameters<NonNullable<MagicEffect['stroke']>>[2], center: Point, radius: number) {
  const rect = clampRect({ x: center.x - radius, y: center.y - radius, w: radius * 2, h: radius * 2 }, c.width, c.height);
  if (!rect.w || !rect.h) return;
  const image = c.ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  if (carry && carryWidth === rect.w && carryHeight === rect.h) {
    const data = image.data;
    for (let y = 0; y < rect.h; y++) {
      for (let x = 0; x < rect.w; x++) {
        const cover = brushCoverage(rect.x + x, rect.y + y, center, center, radius);
        if (cover <= 0) continue;
        const i = (y * rect.w + x) * 4;
        const t = cover * 0.78;
        data[i] = byte(data[i] + (carry[i] - data[i]) * t);
        data[i + 1] = byte(data[i + 1] + (carry[i + 1] - data[i + 1]) * t);
        data[i + 2] = byte(data[i + 2] + (carry[i + 2] - data[i + 2]) * t);
        data[i + 3] = 255;
      }
    }
    c.ctx.putImageData(image, rect.x, rect.y);
    c.markDirty(rect);
  }
  carry = image.data.slice();
  carryWidth = rect.w;
  carryHeight = rect.h;
}

export default {
  id: 'smudge',
  label: { pt: 'Esborratar', en: 'Smudge' },
  hint: { pt: 'Arrasta a tinta com o dedo, como se estivesse molhada.', en: 'Drag the paint with your finger, as if it were wet.' },
  category: 'distorcer', order: 204, level: 1, usesColor: false,
  begin() { carry = null; },
  end() { carry = null; },
  stroke(from, to, c, size) {
    const radius = Math.max(2, size / 2);
    stamp(c, from, radius);
    interpolateDabs(from, to, Math.max(2, size / 5), 0, point => stamp(c, point, radius));
    if (from.x !== to.x || from.y !== to.y) stamp(c, to, radius);
  },
} satisfies MagicEffect;
