import { applyPalette, GIFEncoder, quantize } from 'gifenc';

export type GifRequest =
  | { kind: 'frame'; pixels: ImageData; delay: number; loop: boolean }
  | { kind: 'finish' };

const gif = GIFEncoder();

self.addEventListener('message', (event: MessageEvent<GifRequest>) => {
  const request = event.data;
  if (request.kind === 'finish') {
    gif.finish();
    const bytes = gif.bytes();
    self.postMessage(bytes, { transfer: [bytes.buffer] });
    return;
  }
  const { pixels, delay, loop } = request;
  const palette = quantize(pixels.data, 256);
  const index = applyPalette(pixels.data, palette);
  gif.writeFrame(index, pixels.width, pixels.height, { palette, delay, repeat: loop ? 0 : -1 });
  self.postMessage(null);
});
