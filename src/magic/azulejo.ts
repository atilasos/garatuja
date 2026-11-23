import type { MagicEffect } from '../core/types';
import { edgeShade, mixColors, shiftColor } from './_util/c-color';
import { paintClippedPattern } from './_util/c-geom';

/** Paint one original geometric azulejo tile inspired by traditional Portuguese tilework. */
function drawAzulejoTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tile: number,
  ink: string,
  mid: string,
  deep: string,
  glaze: string,
) {
  const cx = x + tile * 0.5;
  const cy = y + tile * 0.5;
  const half = tile * 0.5;
  const stroke = Math.max(1, tile * 0.028);

  // Porcelain glaze tile base + thin grout frame
  ctx.fillStyle = glaze;
  ctx.fillRect(x, y, tile, tile);
  ctx.strokeStyle = mixColors(ink, '#d4cdc0', 0.65);
  ctx.lineWidth = stroke;
  ctx.strokeRect(x + stroke * 0.5, y + stroke * 0.5, tile - stroke, tile - stroke);

  // Delicate inner geometric border frame
  const inset = tile * 0.09;
  ctx.strokeStyle = mid;
  ctx.lineWidth = stroke * 0.9;
  ctx.strokeRect(x + inset, y + inset, tile - inset * 2, tile - inset * 2);

  // Four corner quarter-medallions that unite into full rosettes across adjacent tiles
  const corners = [
    [x, y, 0, Math.PI * 0.5],
    [x + tile, y, Math.PI * 0.5, Math.PI],
    [x + tile, y + tile, Math.PI, Math.PI * 1.5],
    [x, y + tile, Math.PI * 1.5, Math.PI * 2],
  ] as const;

  for (const [kx, ky, a0, a1] of corners) {
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.arc(kx, ky, tile * 0.23, a0, a1);
    ctx.closePath();
    ctx.fillStyle = mid;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.arc(kx, ky, tile * 0.13, a0, a1);
    ctx.closePath();
    ctx.fillStyle = glaze;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(kx, ky, tile * 0.23, a0, a1);
    ctx.strokeStyle = deep;
    ctx.lineWidth = stroke;
    ctx.stroke();
  }

  // Central diamond lattice behind the rosette
  ctx.beginPath();
  ctx.moveTo(cx, y + inset * 1.2);
  ctx.lineTo(x + tile - inset * 1.2, cy);
  ctx.lineTo(cx, y + tile - inset * 1.2);
  ctx.lineTo(x + inset * 1.2, cy);
  ctx.closePath();
  ctx.strokeStyle = ink;
  ctx.lineWidth = stroke;
  ctx.stroke();

  // 8-petal geometric rosette star at center
  const petalLen = half * 0.64;
  const petalWid = half * 0.2;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const isCardinal = i % 2 === 0;
    const len = isCardinal ? petalLen : petalLen * 0.78;
    const wid = isCardinal ? petalWid : petalWid * 0.78;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.45, -wid, len, 0);
    ctx.quadraticCurveTo(len * 0.45, wid, 0, 0);
    ctx.closePath();
    ctx.fillStyle = isCardinal ? ink : mid;
    ctx.fill();
    ctx.strokeStyle = deep;
    ctx.lineWidth = stroke * 0.75;
    ctx.stroke();
    ctx.restore();
  }

  // Crisp porcelain ring + cobalt center jewel
  ctx.beginPath();
  ctx.arc(cx, cy, tile * 0.095, 0, Math.PI * 2);
  ctx.fillStyle = glaze;
  ctx.fill();
  ctx.strokeStyle = deep;
  ctx.lineWidth = stroke;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, tile * 0.045, 0, Math.PI * 2);
  ctx.fillStyle = deep;
  ctx.fill();
}

export default {
  id: 'azulejo',
  label: { pt: 'Azulejo', en: 'Azulejo tile' },
  hint: { pt: 'Arrasta para pintar azulejos geométricos.', en: 'Drag to paint Portuguese geometric tiles.' },
  category: 'padroes',
  level: 1,
  order: 412,
  usesColor: true,
  stroke(from, to, c, size) {
    const radius = size * 0.65;
    const tile = Math.max(28, Math.round(size * 1.12));
    const ink = c.color;
    const mid = shiftColor(ink, 0, -0.06, 0.22);
    const deep = edgeShade(ink);
    const glaze = '#faf8f2';

    paintClippedPattern(from, to, c, radius, (ctx, area) => {
      const colStart = Math.floor(area.x / tile);
      const colEnd = Math.ceil((area.x + area.w) / tile);
      const rowStart = Math.floor(area.y / tile);
      const rowEnd = Math.ceil((area.y + area.h) / tile);

      for (let row = rowStart; row <= rowEnd; row++) {
        for (let col = colStart; col <= colEnd; col++) {
          drawAzulejoTile(ctx, col * tile, row * tile, tile, ink, mid, deep, glaze);
        }
      }
    });
  },
} satisfies MagicEffect;
