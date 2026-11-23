import { png, viewport } from './canvas';
import type { PointerInput } from './pointer';
import type { Storage } from './storage';
import type { Store } from './store';
import type { Surface } from './surface';
import { CANVAS_H, CANVAS_W, type PageRecord, type ProjectRecord, type StarterDef } from './types';

export function createPage(color = '#ffffff', starter?: StarterDef): PageRecord {
  const paper = viewport(CANVAS_W, CANVAS_H, true);
  paper.fillStyle = color;
  paper.fillRect(0, 0, CANVAS_W, CANVAS_H);
  if (starter) starter.paper(paper, CANVAS_W, CANVAS_H);
  const top = starter?.foreground ? viewport() : undefined;
  if (top) starter?.foreground?.(top, CANVAS_W, CANVAS_H);
  const thumb = viewport(240, 180, true);
  thumb.drawImage(paper.canvas, 0, 0, 240, 180);
  if (top) thumb.drawImage(top.canvas, 0, 0, 240, 180);
  const bitmap = png(paper.canvas);
  const thumbnail = png(thumb.canvas);
  const foreground = top && png(top.canvas);
  return { id: crypto.randomUUID(), bitmap, paper: bitmap, thumb: thumbnail, foreground, labels: [], text: '' };
}

export function createProject(page: PageRecord): ProjectRecord {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: '', author: '', audience: '', pages: [page], comments: [], fps: 6, createdAt: now, updatedAt: now };
}

export class Documents {
  private revision = 0;
  private pixelsChanged = false;
  private pending = false;
  private timer?: number;
  private writing?: { revision: number; result: Promise<void> };

  constructor(private store: Store, private surface: Surface, private storage: Storage,
    private input: PointerInput, private onError: (error: unknown) => void) {
    surface.onChange = () => this.schedule(true);
    window.addEventListener('pagehide', this.flushOnHide);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flushOnHide();
    });
  }

  get page() {
    const { project, pageId } = this.store.get();
    return project.pages.find(page => page.id === pageId) ?? project.pages[0];
  }

  editProject(patch: Partial<Pick<ProjectRecord, 'title' | 'author' | 'audience' | 'fps' | 'comments'>>) {
    const { project, busy } = this.store.get();
    if (busy) return;
    this.store.set({ project: { ...project, ...patch } });
    this.schedule();
  }

  editText(text: string) {
    const { project, pageId, busy } = this.store.get();
    if (busy) return;
    this.store.set({ project: { ...project, pages: project.pages.map(page => page.id === pageId ? { ...page, text } : page) } });
    this.schedule();
  }

  async save(force = true) {
    window.clearTimeout(this.timer);
    if (this.writing?.revision === this.revision) return this.writing.result;
    if (!this.pending && !force) return;
    const { project, pageId } = this.store.get();
    const revision = this.revision;
    const page = this.pixelsChanged ? this.surface.capture(this.page) : this.page;
    const result = this.persist(project, page, pageId, revision).finally(() => {
      if (this.writing?.revision === revision) this.writing = undefined;
    });
    this.writing = { revision, result };
    return result;
  }

  async open(project: ProjectRecord, pageId = project.pages[0]?.id) {
    const page = project.pages.find(page => page.id === pageId) ?? project.pages[0];
    if (!page) throw new Error('A project needs at least one page');
    await this.switchPage(() => ({ project, page }));
  }

  async select(pageId: string) {
    if (this.store.get().pageId === pageId) return;
    await this.switchPage(project => {
      const page = project.pages.find(page => page.id === pageId);
      return page && { project, page };
    });
  }

  async add(page?: PageRecord | Promise<PageRecord>) {
    await this.switchPage(async project => {
      const next = await (page ?? createPage());
      return { project: { ...project, pages: [...project.pages, next] }, page: next };
    });
  }

  /** Replace page order or membership after flushing the current page. */
  async editPages(update: (pages: readonly PageRecord[]) => PageRecord[], pageId = this.store.get().pageId) {
    await this.switchPage(project => {
      const pages = update(project.pages);
      const page = pages.find(candidate => candidate.id === pageId) ?? pages[0];
      if (!page) throw new Error('A project needs at least one page');
      return { project: { ...project, pages }, page };
    });
  }

  private async switchPage(select: (project: ProjectRecord) =>
    { project: ProjectRecord; page: PageRecord } | undefined | Promise<{ project: ProjectRecord; page: PageRecord } | undefined>) {
    if (this.store.get().busy) return;
    this.input.cancel();
    this.store.set({ busy: true });
    try {
      await this.save(false);
      const target = await select(this.store.get().project);
      if (!target) return;
      await this.surface.load(target.page);
      this.store.set({ project: target.project, pageId: target.page.id });
      this.schedule();
      await this.save(false);
    } finally {
      this.store.set({ busy: false });
    }
  }

  private schedule(pixels = false) {
    this.revision++;
    this.pending = true;
    this.pixelsChanged ||= pixels;
    window.clearTimeout(this.timer);
    this.scheduleSave();
    if (pixels) this.store.set({});
  }

  private scheduleSave() {
    this.timer = window.setTimeout(() => {
      if (this.surface.inGesture) this.scheduleSave();
      else void this.save(false).catch(this.onError);
    }, 350);
  }

  private persist(project: ProjectRecord, page: PageRecord, pageId: string, revision: number) {
    const updated = { ...project, pages: project.pages.map(current => current.id === pageId ? page : current), updatedAt: Date.now() };
    const write = this.storage.save(updated, pageId);
    return write.then(() => {
      if (revision !== this.revision) return;
      this.pixelsChanged = false;
      this.pending = false;
      this.store.set({ project: updated });
    });
  }

  private flushOnHide = () => {
    // save() starts the transaction synchronously before the browser freezes the tab.
    void this.save(false).catch(this.onError);
  };
}
