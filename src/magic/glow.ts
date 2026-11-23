import { hexToRgb } from '../core/draw';
import type { MagicEffect } from '../core/types';
import { boxBlur, filterStroke } from './_util/b-bitmap';
import { byte, luma, mix, screenChannel, type RgbOut } from './_util/b-color';

function luminous(ink: RgbOut): RgbOut {
  return { r: ink.r * 0.45 + 150, g: ink.g * 0.45 + 120, b: ink.b * 0.45 + 70 };
}

export default {
  id: 'glow',
  label: { pt: 'Brilho', en: 'Glow' },
  hint: { pt: 'Arrasta para acender um halo com a cor escolhida.', en: 'Drag to light a halo in the color you picked.' },
  category: 'cor', order: 172, level: 2, usesColor: true,
  stroke(from, to, c, size) {
    const ink = luminous(hexToRgb(c.color));
    filterStroke(c, from, to, size, (r, g, b, _x, _y, out) => {
      out.r = mix(screenChannel(r, ink.r), 255, 0.28);
      out.g = mix(screenChannel(g, ink.g), 255, 0.28);
      out.b = mix(screenChannel(b, ink.b), 255, 0.28);
    });
  },
  whole(c) {
    const w = c.width;
    const h = c.height;
    const src = c.ctx.getImageData(0, 0, w, h);
    const blurred = boxBlur(src.data, w, h, Math.max(2, Math.round(Math.min(w, h) / 48)));
    const ink = luminous(hexToRgb(c.color));
    const image = new ImageData(w, h);
    const data = src.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const edge = Math.abs(luma(data[i], data[i + 1], data[i + 2]) - luma(blurred[i], blurred[i + 1], blurred[i + 2]));
        const glow = Math.min(1, edge / 36);
        const r = mix(data[i], blurred[i], 0.4);
        const g = mix(data[i + 1], blurred[i + 1], 0.4);
        const b = mix(data[i + 2], blurred[i + 2], 0.4);
        image.data[i] = byte(mix(r, screenChannel(r, ink.r), 0.35 + glow * 0.65));
        image.data[i + 1] = byte(mix(g, screenChannel(g, ink.g), 0.35 + glow * 0.65));
        image.data[i + 2] = byte(mix(b, screenChannel(b, ink.b), 0.35 + glow * 0.65));
        image.data[i + 3] = 255;
      }
    }
    c.ctx.putImageData(image, 0, 0);
    c.markAllDirty();
  },
} satisfies MagicEffect;
