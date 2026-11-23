import type { Point } from '../../src/core/types';

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

type Matrix = [number, number, number, number, number, number];

interface ColorStop {
  offset: number;
  color: Rgba;
}

class SoftwareGradient {
  readonly stops: ColorStop[] = [];

  constructor(
    readonly kind: 'linear' | 'radial',
    readonly params: number[],
    readonly matrix: Matrix,
  ) {}

  addColorStop(offset: number, color: string): void {
    this.stops.push({ offset, color: parseColor(color) });
    this.stops.sort((a, b) => a.offset - b.offset);
  }

  sample(x: number, y: number): Rgba {
    if (!this.stops.length) return { r: 0, g: 0, b: 0, a: 0 };
    // Map device point back to gradient space via inverse of matrix at creation time
    const [a, b, c, d, e, f] = this.matrix;
    const det = a * d - b * c || 1;
    const lx = (d * (x - e) - c * (y - f)) / det;
    const ly = (-b * (x - e) + a * (y - f)) / det;
    let t: number;
    if (this.kind === 'linear') {
      const [x0, y0, x1, y1] = this.params;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const lenSq = dx * dx + dy * dy;
      t = lenSq > 1e-6 ? ((lx - x0) * dx + (ly - y0) * dy) / lenSq : 0;
    } else {
      const [, , r0, x1, y1, r1] = this.params;
      const dist = Math.hypot(lx - x1, ly - y1);
      t = r1 > r0 ? (dist - r0) / (r1 - r0) : 1;
    }
    t = Math.max(0, Math.min(1, t));
    if (t <= this.stops[0].offset) return this.stops[0].color;
    for (let i = 1; i < this.stops.length; i++) {
      const prev = this.stops[i - 1];
      const next = this.stops[i];
      if (t <= next.offset) {
        const span = Math.max(1e-6, next.offset - prev.offset);
        const k = (t - prev.offset) / span;
        return {
          r: prev.color.r + (next.color.r - prev.color.r) * k,
          g: prev.color.g + (next.color.g - prev.color.g) * k,
          b: prev.color.b + (next.color.b - prev.color.b) * k,
          a: prev.color.a + (next.color.a - prev.color.a) * k,
        };
      }
    }
    return this.stops[this.stops.length - 1].color;
  }
}

type PaintStyle = string | SoftwareGradient;

interface State {
  matrix: Matrix;
  fillStyle: PaintStyle;
  strokeStyle: PaintStyle;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  globalAlpha: number;
  globalCompositeOperation: GlobalCompositeOperation;
  clip: Uint8Array | null;
}

function parseColor(input: string): Rgba {
  const s = input.trim().toLowerCase();
  if (s.startsWith('#')) {
    if (s.length === 7) {
      const v = Number.parseInt(s.slice(1), 16);
      return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255, a: 1 };
    }
    if (s.length === 4) {
      const r = Number.parseInt(s[1] + s[1], 16);
      const g = Number.parseInt(s[2] + s[2], 16);
      const b = Number.parseInt(s[3] + s[3], 16);
      return { r, g, b, a: 1 };
    }
  }
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(s);
  if (m) {
    return {
      r: Number(m[1]),
      g: Number(m[2]),
      b: Number(m[3]),
      a: m[4] === undefined ? 1 : Number(m[4]),
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

function applyMatrix(m: Matrix, x: number, y: number): Point {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function matrixScale(m: Matrix): number {
  return Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]));
}

/** Lightweight software Canvas 2D rasterizer for headless Vitest pixel & dirty-rect verification. */
export class SoftwareCanvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
  private state: State;
  private stack: State[] = [];
  private subpaths: { pts: Point[]; closed: boolean }[] = [];
  private current: { pts: Point[]; closed: boolean } | null = null;
  readonly canvas: { width: number; height: number };

  constructor(width: number, height: number, initialAlpha = 255) {
    this.width = width;
    this.height = height;
    this.canvas = { width, height };
    this.data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = 255;
      this.data[i + 1] = 255;
      this.data[i + 2] = 255;
      this.data[i + 3] = initialAlpha;
    }
    this.state = {
      matrix: [1, 0, 0, 1, 0, 0],
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      clip: null,
    };
  }

  get fillStyle(): PaintStyle { return this.state.fillStyle; }
  set fillStyle(v: PaintStyle) { this.state.fillStyle = v; }
  get strokeStyle(): PaintStyle { return this.state.strokeStyle; }
  set strokeStyle(v: PaintStyle) { this.state.strokeStyle = v; }
  get lineWidth(): number { return this.state.lineWidth; }
  set lineWidth(v: number) { this.state.lineWidth = v; }
  get lineCap(): CanvasLineCap { return this.state.lineCap; }
  set lineCap(v: CanvasLineCap) { this.state.lineCap = v; }
  get lineJoin(): CanvasLineJoin { return this.state.lineJoin; }
  set lineJoin(v: CanvasLineJoin) { this.state.lineJoin = v; }
  get globalAlpha(): number { return this.state.globalAlpha; }
  set globalAlpha(v: number) { this.state.globalAlpha = v; }
  get globalCompositeOperation(): GlobalCompositeOperation { return this.state.globalCompositeOperation; }
  set globalCompositeOperation(v: GlobalCompositeOperation) { this.state.globalCompositeOperation = v; }

  save(): void {
    this.stack.push({
      ...this.state,
      matrix: [...this.state.matrix],
      clip: this.state.clip ? this.state.clip.slice() : null,
    });
  }

  restore(): void {
    const prev = this.stack.pop();
    if (prev) this.state = prev;
  }

  translate(x: number, y: number): void {
    this.state.matrix = multiply(this.state.matrix, [1, 0, 0, 1, x, y]);
  }

  rotate(angle: number): void {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    this.state.matrix = multiply(this.state.matrix, [c, s, -s, c, 0, 0]);
  }

  scale(x: number, y: number): void {
    this.state.matrix = multiply(this.state.matrix, [x, 0, 0, y, 0, 0]);
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.state.matrix = [a, b, c, d, e, f];
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): SoftwareGradient {
    return new SoftwareGradient('linear', [x0, y0, x1, y1], [...this.state.matrix]);
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): SoftwareGradient {
    return new SoftwareGradient('radial', [x0, y0, r0, x1, y1, r1], [...this.state.matrix]);
  }

  beginPath(): void {
    this.subpaths = [];
    this.current = null;
  }

  moveTo(x: number, y: number): void {
    const p = applyMatrix(this.state.matrix, x, y);
    this.current = { pts: [p], closed: false };
    this.subpaths.push(this.current);
  }

  lineTo(x: number, y: number): void {
    const p = applyMatrix(this.state.matrix, x, y);
    if (!this.current) {
      this.current = { pts: [p], closed: false };
      this.subpaths.push(this.current);
    } else {
      this.current.pts.push(p);
    }
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    const p1 = applyMatrix(this.state.matrix, cpx, cpy);
    const p2 = applyMatrix(this.state.matrix, x, y);
    if (!this.current) {
      this.moveTo(x, y);
      return;
    }
    const p0 = this.current.pts[this.current.pts.length - 1];
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      this.current.pts.push({
        x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
      });
    }
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    const p1 = applyMatrix(this.state.matrix, cp1x, cp1y);
    const p2 = applyMatrix(this.state.matrix, cp2x, cp2y);
    const p3 = applyMatrix(this.state.matrix, x, y);
    if (!this.current) {
      this.moveTo(x, y);
      return;
    }
    const p0 = this.current.pts[this.current.pts.length - 1];
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      this.current.pts.push({
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      });
    }
  }

  arc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, ccw = false): void {
    this.ellipse(cx, cy, r, r, 0, startAngle, endAngle, ccw);
  }

  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    ccw = false,
  ): void {
    let sweep = endAngle - startAngle;
    if (ccw && sweep > 0) sweep -= Math.PI * 2;
    if (!ccw && sweep < 0) sweep += Math.PI * 2;
    const steps = Math.max(8, Math.ceil((Math.abs(sweep) / (Math.PI * 2)) * 28));
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (sweep * i) / steps;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      const lx = cx + ex * cosR - ey * sinR;
      const ly = cy + ex * sinR + ey * cosR;
      if (i === 0 && !this.current) this.moveTo(lx, ly);
      else this.lineTo(lx, ly);
    }
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }

  closePath(): void {
    if (this.current) this.current.closed = true;
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const idx = (py * this.width + px) * 4;
        this.data[idx] = 0;
        this.data[idx + 1] = 0;
        this.data[idx + 2] = 0;
        this.data[idx + 3] = 0;
      }
    }
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    const saved = this.subpaths;
    const savedCur = this.current;
    this.beginPath();
    this.rect(x, y, w, h);
    this.fill();
    this.subpaths = saved;
    this.current = savedCur;
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    const saved = this.subpaths;
    const savedCur = this.current;
    this.beginPath();
    this.rect(x, y, w, h);
    this.stroke();
    this.subpaths = saved;
    this.current = savedCur;
  }

  clip(): void {
    const mask = new Uint8Array(this.width * this.height);
    this.rasterizeFill(this.subpaths, (px, py) => {
      mask[py * this.width + px] = 1;
    });
    if (this.state.clip) {
      for (let i = 0; i < mask.length; i++) mask[i] = mask[i] & this.state.clip[i];
    }
    this.state.clip = mask;
  }

  fill(): void {
    const style = this.state.fillStyle;
    const solid = typeof style === 'string' ? parseColor(style) : null;
    this.rasterizeFill(this.subpaths, (px, py) => {
      this.blendPixel(px, py, solid ?? (style as SoftwareGradient).sample(px + 0.5, py + 0.5));
    });
  }

  stroke(): void {
    const style = this.state.strokeStyle;
    const solid = typeof style === 'string' ? parseColor(style) : null;
    const halfW = Math.max(0.5, (this.state.lineWidth * matrixScale(this.state.matrix)) * 0.5);
    const halfWSq = halfW * halfW;

    for (const sub of this.subpaths) {
      const pts = sub.pts;
      if (pts.length === 0) continue;
      const segCount = sub.closed ? pts.length : pts.length - 1;
      for (let i = 0; i < segCount; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const minX = Math.max(0, Math.floor(Math.min(a.x, b.x) - halfW - 1));
        const maxX = Math.min(this.width - 1, Math.ceil(Math.max(a.x, b.x) + halfW + 1));
        const minY = Math.max(0, Math.floor(Math.min(a.y, b.y) - halfW - 1));
        const maxY = Math.min(this.height - 1, Math.ceil(Math.max(a.y, b.y) + halfW + 1));
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;

        for (let py = minY; py <= maxY; py++) {
          const cy = py + 0.5;
          for (let px = minX; px <= maxX; px++) {
            const cx = px + 0.5;
            const t = lenSq > 1e-6 ? Math.max(0, Math.min(1, ((cx - a.x) * dx + (cy - a.y) * dy) / lenSq)) : 0;
            const qx = a.x + dx * t;
            const qy = a.y + dy * t;
            const dSq = (cx - qx) * (cx - qx) + (cy - qy) * (cy - qy);
            if (dSq <= halfWSq) {
              this.blendPixel(px, py, solid ?? (style as SoftwareGradient).sample(cx, cy));
            }
          }
        }
      }
    }
  }

  getImageData(sx: number, sy: number, sw: number, sh: number): { width: number; height: number; data: Uint8ClampedArray } {
    const out = new Uint8ClampedArray(sw * sh * 4);
    for (let y = 0; y < sh; y++) {
      const py = sy + y;
      if (py < 0 || py >= this.height) continue;
      for (let x = 0; x < sw; x++) {
        const px = sx + x;
        if (px < 0 || px >= this.width) continue;
        const src = (py * this.width + px) * 4;
        const dst = (y * sw + x) * 4;
        out[dst] = this.data[src];
        out[dst + 1] = this.data[src + 1];
        out[dst + 2] = this.data[src + 2];
        out[dst + 3] = this.data[src + 3];
      }
    }
    return { width: sw, height: sh, data: out };
  }

  putImageData(img: { width: number; height: number; data: Uint8ClampedArray }, dx: number, dy: number): void {
    for (let y = 0; y < img.height; y++) {
      const py = dy + y;
      if (py < 0 || py >= this.height) continue;
      for (let x = 0; x < img.width; x++) {
        const px = dx + x;
        if (px < 0 || px >= this.width) continue;
        const src = (y * img.width + x) * 4;
        const dst = (py * this.width + px) * 4;
        this.data[dst] = img.data[src];
        this.data[dst + 1] = img.data[src + 1];
        this.data[dst + 2] = img.data[src + 2];
        this.data[dst + 3] = img.data[src + 3];
      }
    }
  }

  private rasterizeFill(subpaths: { pts: Point[]; closed: boolean }[], plot: (px: number, py: number) => void): void {
    let minY = this.height;
    let maxY = -1;
    const edges: { x0: number; y0: number; x1: number; y1: number }[] = [];

    for (const sub of subpaths) {
      const pts = sub.pts;
      if (pts.length < 3) continue;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if (a.y === b.y) continue;
        const top = Math.min(a.y, b.y);
        const bot = Math.max(a.y, b.y);
        if (top < minY) minY = top;
        if (bot > maxY) maxY = bot;
        edges.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y });
      }
    }
    if (!edges.length) return;

    const yStart = Math.max(0, Math.floor(minY));
    const yEnd = Math.min(this.height - 1, Math.ceil(maxY));
    const xs: number[] = [];

    for (let py = yStart; py <= yEnd; py++) {
      const sy = py + 0.5;
      xs.length = 0;
      for (const e of edges) {
        if ((e.y0 <= sy && e.y1 > sy) || (e.y1 <= sy && e.y0 > sy)) {
          xs.push(e.x0 + ((sy - e.y0) * (e.x1 - e.x0)) / (e.y1 - e.y0));
        }
      }
      if (xs.length < 2) continue;
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const x0 = Math.max(0, Math.ceil(xs[i] - 0.5));
        const x1 = Math.min(this.width - 1, Math.floor(xs[i + 1] - 0.5));
        for (let px = x0; px <= x1; px++) plot(px, py);
      }
    }
  }

  private blendPixel(px: number, py: number, color: Rgba): void {
    const clip = this.state.clip;
    if (clip && !clip[py * this.width + px]) return;
    const srcA = Math.max(0, Math.min(1, color.a * this.state.globalAlpha));
    if (srcA <= 0) return;

    const idx = (py * this.width + px) * 4;
    if (this.state.globalCompositeOperation === 'destination-out') {
      this.data[idx + 3] = Math.round(this.data[idx + 3] * (1 - srcA));
      return;
    }
    const dstA = this.data[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) return;
    this.data[idx] = Math.round((color.r * srcA + this.data[idx] * dstA * (1 - srcA)) / outA);
    this.data[idx + 1] = Math.round((color.g * srcA + this.data[idx + 1] * dstA * (1 - srcA)) / outA);
    this.data[idx + 2] = Math.round((color.b * srcA + this.data[idx + 2] * dstA * (1 - srcA)) / outA);
    this.data[idx + 3] = Math.round(outA * 255);
  }
}
