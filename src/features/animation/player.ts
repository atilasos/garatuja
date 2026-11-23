import { viewport } from '../../core/canvas';
import type { Surface } from '../../core/surface';
import type { PageRecord } from '../../core/types';
import { frameDuration, nextFrame } from './frames';

export class Player {
  readonly view = viewport(800, 600, true);
  private readonly frame = viewport(800, 600, true);
  private pending = Promise.resolve();
  private timer?: number;
  private revision = 0;
  index = 0;
  playing = false;
  loop = true;

  constructor(private surface: Surface, private pages: readonly PageRecord[], public fps: number,
    private changed: () => void, private failed: (error: unknown) => void) {}

  async show(index: number) {
    const page = this.pages[index];
    if (!page) return;
    window.clearTimeout(this.timer);
    const revision = ++this.revision;
    const started = performance.now();
    const drawn = this.pending.then(async () => {
      if (revision !== this.revision) return;
      await this.surface.compositePage(page, this.frame);
      if (revision !== this.revision) return;
      this.view.drawImage(this.frame.canvas, 0, 0);
      this.index = index;
      this.changed();
      this.schedule(started);
    });
    this.pending = drawn.catch(() => {});
    await drawn;
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.changed();
    if (this.index === this.pages.length - 1) {
      this.render(0);
    } else {
      this.schedule();
    }
  }

  pause() {
    window.clearTimeout(this.timer);
    this.revision++;
    this.playing = false;
    this.changed();
  }

  step(offset: number) {
    this.pause();
    this.render(Math.min(this.pages.length - 1, Math.max(0, this.index + offset)));
  }

  private render(index: number) {
    void this.show(index).catch(error => { this.pause(); this.failed(error); });
  }

  private schedule(started = performance.now()) {
    if (!this.playing) return;
    this.timer = window.setTimeout(() => {
      const next = nextFrame(this.index, this.pages.length, this.loop);
      if (next === undefined) this.pause();
      else this.render(next);
    }, Math.max(0, frameDuration(this.fps) - (performance.now() - started)));
  }
}
