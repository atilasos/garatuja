/** Minimal canvas for unit tests. Node has no CanvasRenderingContext2D. */

interface Rgba { r: number; g: number; b: number; a: number }
interface Pt { x: number; y: number }
interface Subpath { points: Pt[]; closed: boolean }

class ImageDataPolyfill {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly colorSpace = 'srgb' as const;

  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.width = widthOrHeight;
      this.height = height ?? 0;
      if (dataOrWidth.length !== this.width * this.height * 4) throw new Error('Unexpected ImageData size');
      this.data = dataOrWidth;
    }
  }
}

if (typeof globalThis.ImageData !== 'function') {
  Object.assign(globalThis, { ImageData: ImageDataPolyfill });
}

class Stop {
  constructor(readonly t: number, readonly color: Rgba) {}
}

class SoftGradient {
  readonly stops: Stop[] = [];
  constructor(readonly kind: 'linear' | 'radial', readonly coords: number[]) {}
  addColorStop(offset: number, color: string) {
    this.stops.push(new Stop(offset, parseColor(color)));
    this.stops.sort((a, b) => a.t - b.t);
  }
  sample(x: number, y: number): Rgba {
    if (!this.stops.length) return { r: 0, g: 0, b: 0, a: 255 };
    const raw = this.kind === 'linear' ? this.linearT(x, y) : this.radialT(x, y);
    const t = Math.min(1, Math.max(0, raw));
    let lower = this.stops[0];
    let upper = this.stops[this.stops.length - 1];
    for (let i = 0; i < this.stops.length; i++) {
      if (this.stops[i].t <= t) lower = this.stops[i];
      if (this.stops[i].t >= t) { upper = this.stops[i]; break; }
    }
    const span = upper.t - lower.t || 1;
    const k = lower === upper ? 0 : (t - lower.t) / span;
    return mixColor(lower.color, upper.color, k);
  }

  private linearT(x: number, y: number) {
    const [x0, y0, x1, y1] = this.coords;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = dx * dx + dy * dy || 1;
    return ((x - x0) * dx + (y - y0) * dy) / len;
  }

  private radialT(x: number, y: number) {
    const [, , r0, x1, y1, r1] = this.coords;
    const dist = Math.hypot(x - x1, y - y1);
    return r1 === r0 ? 0 : (dist - r0) / (r1 - r0);
  }
}

type Style = string | SoftGradient;

function parseColor(input: string): Rgba {
  const value = input.trim();
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const full = hex.length === 3 ? hex.split('').map(ch => ch + ch).join('') : hex;
    const num = Number.parseInt(full.slice(0, 6), 16);
    const alpha = full.length >= 8 ? Number.parseInt(full.slice(6, 8), 16) : 255;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255, a: alpha };
  }
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const parts = match[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: Math.round((parts[3] ?? 1) * 255) };
  }
  return { r: 0, g: 0, b: 0, a: 255 };
}

function mixColor(a: Rgba, b: Rgba, t: number): Rgba {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t,
  };
}

function multiply(m: number[], n: number[]) {
  const [a, b, c, d, e, f] = m;
  const [a2, b2, c2, d2, e2, f2] = n;
  return [
    a * a2 + c * b2, b * a2 + d * b2,
    a * c2 + c * d2, b * c2 + d * d2,
    a * e2 + c * f2 + e, b * e2 + d * f2 + f,
  ];
}

class SoftContext {
  fillStyle: Style = '#000000';
  strokeStyle: Style = '#000000';
  lineWidth = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  globalAlpha = 1;
  globalCompositeOperation = 'source-over';
  filter = 'none';
  font = '10px sans-serif';
  imageSmoothingEnabled = true;
  canvas: SoftCanvas;
  private matrix = [1, 0, 0, 1, 0, 0];
  private stack: { matrix: number[]; fill: Style; stroke: Style; lineWidth: number; alpha: number; clipMask: Uint8Array | null }[] = [];
  private clipMask: Uint8Array | null = null;
  private subpaths: Subpath[] = [];
  private current?: Subpath;

  constructor(canvas: SoftCanvas) { this.canvas = canvas; }

  save() {
    this.stack.push({
      matrix: this.matrix.slice(), fill: this.fillStyle, stroke: this.strokeStyle,
      lineWidth: this.lineWidth, alpha: this.globalAlpha, clipMask: this.clipMask ? this.clipMask.slice() : null,
    });
  }

  restore() {
    const saved = this.stack.pop();
    if (!saved) return;
    this.matrix = saved.matrix;
    this.fillStyle = saved.fill;
    this.strokeStyle = saved.stroke;
    this.lineWidth = saved.lineWidth;
    this.globalAlpha = saved.alpha;
    this.clipMask = saved.clipMask;
  }

  translate(x: number, y: number) { this.matrix = multiply(this.matrix, [1, 0, 0, 1, x, y]); }
  scale(x: number, y: number) { this.matrix = multiply(this.matrix, [x, 0, 0, y, 0, 0]); }
  rotate(angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.matrix = multiply(this.matrix, [cos, sin, -sin, cos, 0, 0]);
  }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number) { this.matrix = [a, b, c, d, e, f]; }
  resetTransform() { this.matrix = [1, 0, 0, 1, 0, 0]; }

  beginPath() { this.subpaths = []; this.current = undefined; }
  moveTo(x: number, y: number) {
    this.current = { points: [{ x, y }], closed: false };
    this.subpaths.push(this.current);
  }
  lineTo(x: number, y: number) {
    if (!this.current) this.moveTo(x, y);
    else this.current.points.push({ x, y });
  }
  closePath() {
    if (!this.current || this.current.points.length < 2) return;
    const first = this.current.points[0];
    this.current.points.push({ x: first.x, y: first.y });
    this.current.closed = true;
  }
  rect(x: number, y: number, w: number, h: number) {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }
  arc(x: number, y: number, radius: number, start: number, end: number, anticlockwise = false) {
    this.ellipse(x, y, radius, radius, 0, start, end, anticlockwise);
  }
  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number, anticlockwise = false) {
    let sweep = end - start;
    if (anticlockwise && sweep > 0) sweep -= Math.PI * 2;
    if (!anticlockwise && sweep < 0) sweep += Math.PI * 2;
    const steps = Math.max(8, Math.ceil(Math.abs(sweep) / 0.35));
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    for (let i = 0; i <= steps; i++) {
      const angle = start + sweep * i / steps;
      const px = x + (rx * Math.cos(angle)) * cos - (ry * Math.sin(angle)) * sin;
      const py = y + (rx * Math.cos(angle)) * sin + (ry * Math.sin(angle)) * cos;
      if (i === 0 && !this.current) this.moveTo(px, py);
      else this.lineTo(px, py);
    }
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    const from = this.current?.points.at(-1) ?? { x, y };
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      const u = 1 - t;
      this.lineTo(u * u * from.x + 2 * u * t * cpx + t * t * x, u * u * from.y + 2 * u * t * cpy + t * t * y);
    }
  }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
    const from = this.current?.points.at(-1) ?? { x, y };
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      const u = 1 - t;
      this.lineTo(
        u * u * u * from.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x,
        u * u * u * from.y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y,
      );
    }
  }

  fill() { this.paintPath(true); }
  stroke() { this.paintPath(false); }
  clip() {
    const mask = new Uint8Array(this.canvas.width * this.canvas.height);
    this.raster(true, (x, y) => { mask[y * this.canvas.width + x] = 1; });
    if (!this.clipMask) this.clipMask = mask;
    else for (let i = 0; i < mask.length; i++) this.clipMask[i] = this.clipMask[i] && mask[i] ? 1 : 0;
  }

  fillRect(x: number, y: number, w: number, h: number) {
    if (identity(this.matrix)) {
      this.blitRect(x, y, w, h, this.styleAt(this.fillStyle));
      return;
    }
    this.beginPath();
    this.rect(x, y, w, h);
    this.fill();
  }
  strokeRect(x: number, y: number, w: number, h: number) {
    this.beginPath();
    this.rect(x, y, w, h);
    this.stroke();
  }
  clearRect(x: number, y: number, w: number, h: number) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.canvas.width, Math.ceil(x + w));
    const y1 = Math.min(this.canvas.height, Math.ceil(y + h));
    const data = this.canvas.data;
    for (let py = y0; py < y1; py++) {
      data.fill(0, (py * this.canvas.width + x0) * 4, (py * this.canvas.width + x1) * 4);
    }
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
    return new SoftGradient('linear', [x0, y0, x1, y1]);
  }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    return new SoftGradient('radial', [x0, y0, r0, x1, y1, r1]);
  }
  createImageData(width: number, height: number) { return new ImageData(width, height); }

  fillText(text: string, x: number, y: number) {
    const size = Number(this.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 12);
    this.fillRect(x, y - size, Math.max(4, text.length * size * 0.5), size);
  }

  getImageData(x: number, y: number, w: number, h: number) {
    const image = new ImageData(w, h);
    const data = this.canvas.data;
    const width = this.canvas.width;
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const sx = x + col;
        const sy = y + row;
        const di = (row * w + col) * 4;
        if (sx < 0 || sy < 0 || sx >= width || sy >= this.canvas.height) continue;
        const si = (sy * width + sx) * 4;
        image.data[di] = data[si];
        image.data[di + 1] = data[si + 1];
        image.data[di + 2] = data[si + 2];
        image.data[di + 3] = data[si + 3];
      }
    }
    return image;
  }

  putImageData(image: ImageData, dx: number, dy: number, dirtyX = 0, dirtyY = 0, dirtyW = image.width, dirtyH = image.height) {
    const data = this.canvas.data;
    const width = this.canvas.width;
    const height = this.canvas.height;
    for (let row = 0; row < dirtyH; row++) {
      const sy = dirtyY + row;
      const destY = dy + sy;
      if (sy < 0 || sy >= image.height || destY < 0 || destY >= height) continue;
      for (let col = 0; col < dirtyW; col++) {
        const sx = dirtyX + col;
        const destX = dx + sx;
        if (sx < 0 || sx >= image.width || destX < 0 || destX >= width) continue;
        const from = (sy * image.width + sx) * 4;
        const to = (destY * width + destX) * 4;
        data[to] = image.data[from];
        data[to + 1] = image.data[from + 1];
        data[to + 2] = image.data[from + 2];
        data[to + 3] = image.data[from + 3];
      }
    }
  }

  drawImage(source: CanvasImageSource, ...args: number[]) {
    const src = source instanceof SoftCanvas ? source : null;
    if (!src) return;
    let sx = 0;
    let sy = 0;
    let sw = src.width;
    let sh = src.height;
    let dx = 0;
    let dy = 0;
    let dw = sw;
    let dh = sh;
    if (args.length === 2) [dx, dy] = args;
    else if (args.length === 4) [dx, dy, dw, dh] = args;
    else if (args.length === 8) [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    const image = new ImageData(Math.max(1, Math.round(dw)), Math.max(1, Math.round(dh)));
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const px = Math.max(0, Math.min(src.width - 1, Math.round(sx + (x / image.width) * sw)));
        const py = Math.max(0, Math.min(src.height - 1, Math.round(sy + (y / image.height) * sh)));
        const from = (py * src.width + px) * 4;
        const to = (y * image.width + x) * 4;
        image.data[to] = src.data[from];
        image.data[to + 1] = src.data[from + 1];
        image.data[to + 2] = src.data[from + 2];
        image.data[to + 3] = src.data[from + 3];
      }
    }
    if (identity(this.matrix)) this.putImageData(image, Math.round(dx), Math.round(dy));
    else {
      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          const i = (y * image.width + x) * 4;
          const point = this.device(dx + x, dy + y);
          this.plot(point.x | 0, point.y | 0, { r: image.data[i], g: image.data[i + 1], b: image.data[i + 2], a: image.data[i + 3] });
        }
      }
    }
  }

  private paintPath(fill: boolean) {
    this.raster(fill, (x, y, style) => this.plot(x, y, style));
  }

  private raster(fill: boolean, visit: (x: number, y: number, style: Rgba) => void) {
    const paths = this.subpaths.map(path => ({
      points: path.points.map(point => this.device(point.x, point.y)),
      closed: path.closed,
    })).filter(path => path.points.length);
    if (!paths.length) return;
    const style = this.styleAt(fill ? this.fillStyle : this.strokeStyle);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const path of paths) for (const point of path.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    const pad = fill ? 1 : this.lineWidth;
    const x0 = Math.max(0, Math.floor(minX - pad));
    const y0 = Math.max(0, Math.floor(minY - pad));
    const x1 = Math.min(this.canvas.width - 1, Math.ceil(maxX + pad));
    const y1 = Math.min(this.canvas.height - 1, Math.ceil(maxY + pad));
    const radius = Math.max(0.5, this.lineWidth / 2);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (fill) {
          let wind = 0;
          for (const path of paths) wind += winding(x + 0.5, y + 0.5, path.points);
          if (wind) visit(x, y, style);
        } else if (nearStroke(x + 0.5, y + 0.5, paths, radius)) visit(x, y, style);
      }
    }
  }

  private blitRect(x: number, y: number, w: number, h: number, style: Rgba) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.canvas.width, Math.ceil(x + w));
    const y1 = Math.min(this.canvas.height, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) this.plot(px, py, style);
  }

  private plot(x: number, y: number, style: Rgba) {
    if (x < 0 || y < 0 || x >= this.canvas.width || y >= this.canvas.height) return;
    const index = y * this.canvas.width + x;
    if (this.clipMask && !this.clipMask[index]) return;
    const alpha = style.a / 255 * this.globalAlpha;
    const data = this.canvas.data;
    const offset = index * 4;
    if (this.globalCompositeOperation === 'copy' || alpha >= 1) {
      data[offset] = style.r;
      data[offset + 1] = style.g;
      data[offset + 2] = style.b;
      data[offset + 3] = alpha >= 1 ? 255 : Math.round(alpha * 255);
      return;
    }
    const destA = data[offset + 3] / 255;
    const outA = alpha + destA * (1 - alpha);
    if (outA <= 0) {
      data[offset] = data[offset + 1] = data[offset + 2] = data[offset + 3] = 0;
      return;
    }
    data[offset] = (style.r * alpha + data[offset] * destA * (1 - alpha)) / outA;
    data[offset + 1] = (style.g * alpha + data[offset + 1] * destA * (1 - alpha)) / outA;
    data[offset + 2] = (style.b * alpha + data[offset + 2] * destA * (1 - alpha)) / outA;
    data[offset + 3] = Math.round(outA * 255);
  }

  private styleAt(style: Style, x = 0, y = 0): Rgba {
    return typeof style === 'string' ? parseColor(style) : style.sample(x, y);
  }

  private device(x: number, y: number): Pt {
    const [a, b, c, d, e, f] = this.matrix;
    return { x: a * x + c * y + e, y: b * x + d * y + f };
  }
}

function identity(matrix: number[]) {
  return matrix.every((value, index) => value === [1, 0, 0, 1, 0, 0][index]);
}

function winding(x: number, y: number, points: Pt[]) {
  let wind = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a.y <= y) {
      if (b.y > y && (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y) > 0) wind++;
    } else if (b.y <= y && (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y) < 0) wind--;
  }
  return wind;
}

function nearStroke(x: number, y: number, paths: { points: Pt[] }[], radius: number) {
  const limit = radius * radius;
  for (const path of paths) {
    for (let i = 0; i < path.points.length - 1; i++) {
      if (segmentDistanceSq(x, y, path.points[i], path.points[i + 1]) <= limit) return true;
    }
  }
  return false;
}

function segmentDistanceSq(px: number, py: number, a: Pt, b: Pt) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  if (len < 1e-6) return (px - a.x) ** 2 + (py - a.y) ** 2;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len));
  const x = a.x + dx * t - px;
  const y = a.y + dy * t - py;
  return x * x + y * y;
}

class SoftCanvas {
  readonly data: Uint8ClampedArray;
  width: number;
  height: number;
  private readonly context: SoftContext;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    this.context = new SoftContext(this);
  }
  getContext(kind: string) {
    if (kind !== '2d') return null;
    return this.context;
  }
}

export function makeCanvas(width: number, height: number) {
  return new SoftCanvas(width, height) as unknown as HTMLCanvasElement;
}
