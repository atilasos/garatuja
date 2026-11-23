import { viewport } from '../../core/canvas';
import type { Surface } from '../../core/surface';
import type { PageRecord } from '../../core/types';
import { frameDuration, gifDelay } from './frames';
import Worker from './gif.worker?worker';
import type { GifRequest } from './gif.worker';

interface AnimationExport {
  surface: Surface;
  pages: readonly PageRecord[];
  fps: number;
  loop: boolean;
  signal: AbortSignal;
  progress(done: number): void;
}

export async function encodeGif({ surface, pages, fps, loop, signal, progress }: AnimationExport) {
  signal.throwIfAborted();
  const worker = new Worker();
  const canvas = viewport(800, 600, true, true);
  const send = (message: GifRequest, transfer: Transferable[] = []) => new Promise<unknown>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    const cleanup = () => signal.removeEventListener('abort', abort);
    worker.onmessage = event => { cleanup(); resolve(event.data); };
    worker.onerror = event => { cleanup(); reject(new Error(event.message)); };
    worker.postMessage(message, transfer);
  });
  try {
    for (const [index, page] of pages.entries()) {
      signal.throwIfAborted();
      await surface.compositePage(page, canvas);
      const pixels = canvas.getImageData(0, 0, 800, 600);
      await send({ kind: 'frame', pixels, delay: gifDelay(index, fps), loop }, [pixels.data.buffer]);
      progress(index + 1);
    }
    const output = await send({ kind: 'finish' });
    if (!(output instanceof Uint8Array)) throw new Error('GIF encoding did not return an image');
    return new Blob([Uint8Array.from(output)], { type: 'image/gif' });
  } finally {
    worker.terminate();
  }
}

export function webmType() {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return;
  return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export async function encodeWebm({ surface, pages, fps, signal, progress }: AnimationExport, mimeType: string) {
  const stage = viewport(800, 600, true);
  const frame = viewport(800, 600, true);
  const stream = stage.canvas.captureStream(0);
  const [track] = stream.getVideoTracks();
  const duration = frameDuration(fps);
  let recorder: MediaRecorder | undefined;
  try {
    if (!track || !('requestFrame' in track) || typeof track.requestFrame !== 'function') throw new Error('Manual canvas capture is unavailable');
    const recording = new MediaRecorder(stream, { mimeType });
    recorder = recording;
    const parts: Blob[] = [];
    const result = new Promise<Blob>((resolve, reject) => {
      recording.ondataavailable = event => parts.push(event.data);
      recording.onstop = () => {
        const video = new Blob(parts, { type: 'video/webm' });
        if (video.size) resolve(video);
        else reject(new Error('The recording is empty'));
      };
      recording.onerror = () => reject(new Error('Recording failed'));
    });
    // Attach a handler while the frame loop is still running.
    void result.catch(() => {});
    await surface.compositePage(pages[0], frame);
    signal.throwIfAborted();
    recording.start();
    for (let index = 0; index < pages.length; index++) {
      signal.throwIfAborted();
      const now = performance.now();
      stage.drawImage(frame.canvas, 0, 0);
      track.requestFrame();
      progress(index + 1);
      if (pages[index + 1]) await surface.compositePage(pages[index + 1], frame);
      await wait(Math.max(20, duration - (performance.now() - now)), signal);
      if (recording.state !== 'recording') throw new Error('Recording stopped');
    }
    // Hold the final still for its full frame interval in the WebM timeline.
    stage.drawImage(frame.canvas, 0, 0);
    track.requestFrame();
    await wait(35, signal);
    recording.stop();
    return await result;
  } finally {
    if (recorder?.state === 'recording') recorder.stop();
    track?.stop();
  }
}
