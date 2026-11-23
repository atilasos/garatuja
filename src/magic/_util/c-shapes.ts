import { edgeShade, highlightTint, rgba, shiftColor } from './c-color';

/** Trace a star polygon with alternating outer and inner vertices. */
export function traceStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  points: number,
  outerR: number,
  innerR: number,
  rotation = -Math.PI / 2,
): void {
  ctx.beginPath();
  const total = points * 2;
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = rotation + (i * Math.PI) / points;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Trace a crisp 4-point concave diamond sparkle. */
export function traceSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  pinch = 0.22,
): void {
  const px = rx * pinch;
  const py = ry * pinch;
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.quadraticCurveTo(cx + px * 0.45, cy - py * 0.45, cx + rx, cy);
  ctx.quadraticCurveTo(cx + px * 0.45, cy + py * 0.45, cx, cy + ry);
  ctx.quadraticCurveTo(cx - px * 0.45, cy + py * 0.45, cx - rx, cy);
  ctx.quadraticCurveTo(cx - px * 0.45, cy - py * 0.45, cx, cy - ry);
  ctx.closePath();
}

/** Trace a plump symmetric heart centered near (cx, cy). */
export function traceHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rotation = 0,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  const s = radius;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.85);
  ctx.bezierCurveTo(-s * 1.1, s * 0.15, -s * 1.05, -s * 0.72, -s * 0.42, -s * 0.78);
  ctx.bezierCurveTo(-s * 0.1, -s * 0.8, 0, -s * 0.45, 0, -s * 0.36);
  ctx.bezierCurveTo(0, -s * 0.45, s * 0.1, -s * 0.8, s * 0.42, -s * 0.78);
  ctx.bezierCurveTo(s * 1.05, -s * 0.72, s * 1.1, s * 0.15, 0, s * 0.85);
  ctx.closePath();
  ctx.restore();
}

/** Draw an organic leaf with central midrib and side veins. */
export function drawLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  width: number,
  angle: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const dark = edgeShade(color);
  const light = highlightTint(color);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length * 0.42, -width * 0.82, length, 0);
  ctx.quadraticCurveTo(length * 0.42, width * 0.82, 0, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, length * 0.055);
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Subtle sunlit upper half tint
  ctx.beginPath();
  ctx.moveTo(length * 0.08, 0);
  ctx.quadraticCurveTo(length * 0.44, -width * 0.56, length * 0.9, 0);
  ctx.closePath();
  ctx.fillStyle = rgba(light, 0.25);
  ctx.fill();

  // Midrib and delicate lateral veins
  ctx.strokeStyle = rgba(dark, 0.65);
  ctx.lineWidth = Math.max(0.8, length * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(length * 0.04, 0);
  ctx.lineTo(length * 0.88, 0);
  for (const frac of [0.28, 0.5, 0.7]) {
    const bx = length * frac;
    const span = width * 0.34 * (1 - Math.abs(frac - 0.45));
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + length * 0.12, -span);
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + length * 0.12, span);
  }
  ctx.stroke();
  ctx.restore();
}

/** Draw a cheerful multi-petal bloom in the chosen color. */
export function drawFlowerBloom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  petals: number,
  rotation: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const rim = edgeShade(color);
  const bright = highlightTint(color);
  const petalLen = radius;
  const petalWid = radius * (petals <= 6 ? 0.52 : 0.42);

  for (let i = 0; i < petals; i++) {
    const a = (i * Math.PI * 2) / petals;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(petalLen * 0.35, -petalWid, petalLen * 1.05, -petalWid * 0.65, petalLen, 0);
    ctx.bezierCurveTo(petalLen * 1.05, petalWid * 0.65, petalLen * 0.35, petalWid, 0, 0);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? color : shiftColor(color, 4, 0.02, 0.04);
    ctx.fill();
    ctx.strokeStyle = rgba(rim, 0.7);
    ctx.lineWidth = Math.max(1, radius * 0.045);
    ctx.stroke();

    // Inner petal highlight
    ctx.beginPath();
    ctx.ellipse(petalLen * 0.52, -petalWid * 0.14, petalLen * 0.25, petalWid * 0.22, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = rgba(bright, 0.35);
    ctx.fill();
    ctx.restore();
  }

  // Sunny center disk with pollen dots
  const centerR = radius * 0.31;
  ctx.beginPath();
  ctx.arc(0, 0, centerR, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c242';
  ctx.fill();
  ctx.strokeStyle = '#c88719';
  ctx.lineWidth = Math.max(1, radius * 0.05);
  ctx.stroke();

  ctx.fillStyle = '#d98a18';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * centerR * 0.48, Math.sin(a) * centerR * 0.48, Math.max(1, centerR * 0.16), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(-centerR * 0.22, -centerR * 0.22, centerR * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 250, 220, 0.65)';
  ctx.fill();
  ctx.restore();
}

/** Trace a rounded rectangle path. */
export function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}
