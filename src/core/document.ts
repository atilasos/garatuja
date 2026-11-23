import { t } from './i18n';
import { png, viewport } from './canvas';
import type { PointerInput } from './pointer';
import type { Draft, Storage } from './storage';
import type { Store } from './store';
import type { Surface } from './surface';
import { CANVAS_H, CANVAS_W, type L10n, type PageRecord, type ProjectRecord, type StarterDef, type WritingDraft } from './types';

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
  private readonly memory = new Map<string, Draft>();
  private savedAt?: number;
  private timer?: number;
  private writing?: Promise<boolean>;
  private inFlight?: Draft;
  private staged?: Draft;
  private discarding = false;
  private checkpointedPixels = false;
  private prepared?: { revision: number; draft: Draft };
  private stopped = false;
  private remoteId?: string;
  private reloadTimer?: number;

  constructor(private store: Store, private surface: Surface, private storage: Storage,
    private input: PointerInput, persisted: boolean, private onSave: (ok: boolean) => void,
    private onConflict: (message: L10n) => void) {
    this.savedAt = persisted ? store.get().project.updatedAt : undefined;
    surface.onChange = () => this.schedule(true);
    storage.changes.addEventListener('message', event => {
      if (event.data === this.store.get().project.id) {
        this.remoteId = event.data;
        void this.reloadRemote();
      }
    });
    store.subscribe((state, previous) => {
      if (!state.busy && previous.busy && this.remoteId) void this.reloadRemote();
    });
    window.addEventListener('pagehide', this.stageOnExit);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { this.input.flushPending(); void this.saveCommitted(); }
    });
  }

  get page() {
    const { project, pageId } = this.store.get();
    return project.pages.find(page => page.id === pageId) ?? project.pages[0];
  }

  editProject(patch: Partial<Pick<ProjectRecord, 'title' | 'author' | 'audience' | 'fps' | 'comments'>>) {
    const { project, busy } = this.store.get();
    if (busy || Object.entries(patch).every(([key, value]) => Object.is(Reflect.get(project, key), value))) return;
    this.store.set({ project: { ...project, ...patch } });
    this.schedule();
  }

  editText(text: string) {
    const { project, pageId, busy } = this.store.get();
    if (busy || this.page.text === text) return;
    this.store.set({ project: { ...project, pages: project.pages.map(page => page.id === pageId ? { ...page, text } : page) } });
    this.schedule();
  }

  rememberText(before: string) {
    const after = this.page.text;
    if (before !== after) this.surface.rememberWriting(() => this.editText(before), () => this.editText(after),
      2 * (before.length + after.length));
    this.store.set({});
  }

  rememberDetails(before: Pick<ProjectRecord, 'title' | 'author' | 'audience'>) {
    const { title, author, audience } = this.store.get().project;
    const after = { title, author, audience };
    if (title !== before.title || author !== before.author || audience !== before.audience) {
      this.surface.rememberWriting(() => this.editProject(before), () => this.editProject(after),
        2 * (title.length + author.length + audience.length + before.title.length + before.author.length + before.audience.length));
      this.store.set({});
    }
  }

  setWritingDraft(draft?: WritingDraft) {
    const { project, pageId } = this.store.get();
    if (JSON.stringify(this.page.writingDraft) === JSON.stringify(draft)) return;
    this.store.set({ project: { ...project, pages: project.pages.map(page => page.id === pageId ? { ...page, writingDraft: draft } : page) } });
    this.schedule();
  }

  get hasUnsavedChanges() { return this.pending; }
  get hasWork() { return this.savedAt !== undefined || this.pending; }
  get recoveryProjects() { return [...this.memory.values()].map(draft => draft.project); }

  async resolveProject(entry: ProjectRecord) {
    if (entry.id === this.store.get().project.id && this.pending) return this.snapshot();
    return this.memory.get(entry.id)?.project ?? await this.storage.get(entry.id) ?? entry;
  }

  backupDrafts() {
    this.input.flushPending();
    return this.pending ? [...this.memory.values(), this.draft()] : [...this.memory.values()];
  }

  async discardForTrash(id: string) {
    const active = id === this.store.get().project.id;
    if (!active) {
      const draft = this.memory.get(id);
      if (draft) {
        await this.storage.discardDrafts(draft);
        this.memory.delete(id);
        this.onSave(!this.pending && !this.memory.size);
      }
      return;
    }
    this.discarding = true;
    this.store.set({ busy: true });
    window.clearTimeout(this.timer);
    try {
      this.input.cancel();
      await this.writing;
      const draft = this.prepared?.draft ?? this.staged;
      if (draft) await this.storage.discardDrafts(draft);
      if (this.staged && this.staged.id !== draft?.id) await this.storage.discardDrafts(this.staged);
      await this.storage.forget(id);
      const page = createPage();
      await this.surface.load(page);
      this.surface.discardHistory();
      this.savedAt = undefined;
      this.remoteId = undefined;
      this.pending = this.pixelsChanged = this.checkpointedPixels = false;
      this.prepared = this.staged = undefined;
      const replacement = createProject(page);
      this.store.set({ project: replacement, pageId: page.id });
      this.onSave(!this.memory.size);
      return replacement.id;
    } finally {
      this.discarding = false;
      this.store.set({ busy: false });
      if (this.pending) this.scheduleSave();
    }
  }

  async keepReplacement(id: string) {
    if (this.store.get().project.id !== id || this.hasWork || this.stopped) return;
    this.store.set({ busy: true });
    try {
      // Keep the replacement sheet in the gallery when there is room for it.
      // Deleting the old work does not depend on creating this entry.
      const saved = await this.storage.write(this.draft());
      if (this.stopped) return;
      this.savedAt = saved.updatedAt;
      this.store.set({ project: saved });
    } catch { /* The replacement sheet can stay empty in memory. */ }
    finally {
      this.prepared = undefined;
      this.store.set({ busy: false });
    }
  }

  snapshot(): ProjectRecord {
    this.input.flushPending();
    return this.capture();
  }

  private capture(): ProjectRecord {
    const { project, pageId } = this.store.get();
    if (!this.pixelsChanged) return project;
    const page = this.surface.capture(this.page);
    return { ...project, pages: project.pages.map(current => current.id === pageId ? page : current) };
  }

  stopSaving() {
    this.stopped = true;
    window.clearTimeout(this.timer);
    window.clearTimeout(this.reloadTimer);
  }

  resumeSaving() {
    this.stopped = false;
    if (this.pending) this.scheduleSave();
  }

  async save(create = true): Promise<boolean> {
    this.input.flushPending();
    if (create && !this.hasWork) this.schedule();
    if (!await this.saveCommitted()) return false;
    for (const [id, draft] of this.memory) {
      try {
        const saved = await this.storage.write({ ...draft, pageId: undefined });
        this.memory.delete(id);
        if (saved.id !== id) this.reportConflict();
      } catch {
        this.onSave(false);
        return false;
      }
    }
    this.onSave(true);
    return true;
  }

  private async saveCommitted(): Promise<boolean> {
    window.clearTimeout(this.timer);
    if (this.stopped || this.discarding) return false;
    if (this.writing && !await this.writing) return false;
    if (this.stopped || this.discarding) return false;
    if (!this.pending) return true;
    // A waiter may have started saving another edit while this one was suspended.
    if (this.writing) return this.saveCommitted();
    this.writing = this.persist().finally(() => {
      this.writing = undefined;
      this.inFlight = undefined;
      if (this.remoteId) void this.reloadRemote();
    });
    const ok = await this.writing;
    return ok && (!this.pending || await this.saveCommitted());
  }

  async open(project: ProjectRecord, pageId = project.pages[0]?.id, persisted = false) {
    const page = project.pages.find(page => page.id === pageId) ?? project.pages[0];
    if (!page) throw new Error('A project needs at least one page');
    return this.switchPage(() => ({ project, page }), persisted);
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
    { project: ProjectRecord; page: PageRecord } | undefined | Promise<{ project: ProjectRecord; page: PageRecord } | undefined>,
    opening?: boolean) {
    if (this.store.get().busy) return false;
    this.input.flushPending();
    this.store.set({ busy: true });
    try {
      const saved = await this.saveCommitted();
      const current = saved ? this.store.get().project : this.capture();
      let target = await select(current);
      if (!target) return false;
      if (opening === true && target.project.id === current.id && target.project.updatedAt < current.updatedAt) {
        // Opening the gallery may have captured the card before the last autosave.
        return true;
      }
      const previousPage = this.page;
      const changingWork = target.project.id !== current.id;
      const departingDraft = !saved && changingWork ? this.draft() : undefined;
      if (departingDraft) this.stageCurrent();
      if (opening && target.project.id === current.id && target.project.updatedAt === current.updatedAt) {
        target = { project: current, page: current.pages.find(page => page.id === target?.page.id) ?? previousPage };
      }
      if (target.page !== previousPage) await this.surface.load(target.page);
      if (!saved) {
        this.pixelsChanged = false;
        this.prepared = undefined;
        this.revision++;
      }
      if (departingDraft) this.memory.set(current.id, departingDraft);
      if (changingWork) {
        const recovered = this.memory.get(target.project.id);
        this.memory.delete(target.project.id);
        this.pending = Boolean(recovered);
        this.staged = recovered;
        if (recovered?.pageId === target.page.id) this.prepared = { revision: this.revision, draft: recovered };
        this.checkpointedPixels = Boolean(recovered);
        this.surface.discardHistory();
        this.savedAt = recovered ? recovered.expectedAt : opening ? target.project.updatedAt : undefined;
      } else {
        const kept = new Set(target.project.pages.map(page => page.id));
        for (const page of current.pages) if (!kept.has(page.id)) this.surface.discardHistory(page.id);
      }
      this.store.set({ project: target.project, pageId: target.page.id });
      if (opening === false || (opening === undefined && target.project !== current)) {
        this.schedule();
        await this.saveCommitted();
      } else if (saved && this.savedAt !== undefined && (opening !== undefined || previousPage.id !== target.page.id)) {
        await this.storage.remember(target.project.id, target.page.id).catch(() => {});
      }
      return true;
    } finally {
      this.store.set({ busy: false });
    }
  }

  private async reloadRemote() {
    const id = this.remoteId;
    const { project, pageId, busy } = this.store.get();
    if (!id || this.stopped || busy || this.writing) return;
    if (this.surface.inGesture || document.querySelector('dialog[open]')) {
      window.clearTimeout(this.reloadTimer);
      this.reloadTimer = window.setTimeout(() => { void this.reloadRemote(); }, 350);
      return;
    }
    this.remoteId = undefined;
    if (this.pending || id !== project.id) return;
    this.input.flushPending();
    if (this.pending) return;
    this.store.set({ busy: true });
    try {
      const fresh = await this.storage.get(id);
      if (!fresh || fresh.updatedAt === this.savedAt) return;
      const page = fresh.pages.find(page => page.id === pageId) ?? fresh.pages[0];
      await this.surface.load(page);
      this.surface.discardHistory();
      this.savedAt = fresh.updatedAt;
      this.store.set({ project: fresh, pageId: page.id });
    } catch (error) {
      console.error(error);
    } finally {
      this.store.set({ busy: false });
    }
  }

  private schedule(pixels = false) {
    this.revision++;
    this.pending = true;
    this.pixelsChanged ||= pixels;
    window.clearTimeout(this.timer);
    if (pixels) {
      // The first committed marks must have an independent write queued before
      // autosave or a visibility change can open the project transaction.
      if (!this.checkpointedPixels) {
        this.checkpointedPixels = true;
        this.stageCurrent();
      }
      this.store.set({});
    }
    this.scheduleSave();
  }

  private scheduleSave() {
    this.timer = window.setTimeout(() => {
      if (this.surface.inGesture) this.scheduleSave();
      else void this.saveCommitted();
    }, 350);
  }

  private draft(): Draft {
    if (this.prepared?.revision === this.revision) return this.prepared.draft;
    const project = this.capture();
    const name = project.title.trim() || t({ pt: 'Sem título', en: 'Untitled' });
    const draft: Draft = {
      id: crypto.randomUUID(), project, pageId: this.page.id, expectedAt: this.savedAt,
      previous: this.inFlight?.id ?? this.staged?.id,
      time: Math.max(Date.now(), (this.staged?.time ?? 0) + 1),
      copyTitle: t({ pt: `${name} (cópia)`, en: `${name} (copy)` }),
    };
    this.prepared = { revision: this.revision, draft };
    return draft;
  }

  private async persist() {
    const revision = this.revision;
    try {
      const draft = this.draft();
      const { project } = draft;
      this.inFlight = draft;
      const saved = await this.storage.write(draft);
      if (this.stopped || this.discarding) return false;
      this.savedAt = saved.updatedAt;
      if (this.staged?.id === draft.id || this.staged?.id === draft.previous) this.staged = undefined;
      const conflict = saved.id !== project.id;
      if (revision === this.revision) {
        this.prepared = undefined;
        this.pixelsChanged = false;
        this.pending = false;
        this.store.set({ project: saved });
      } else {
        const current = this.store.get().project;
        this.store.set({ project: { ...current, id: saved.id, createdAt: saved.createdAt, updatedAt: saved.updatedAt,
          title: conflict && current.title === project.title ? saved.title : current.title } });
      }
      this.onSave(this.memory.size === 0);
      if (conflict) this.reportConflict();
      return true;
    } catch (error) {
      console.error(error);
      this.onSave(false);
      return false;
    }
  }

  private reportConflict() {
    this.onConflict({ pt: 'Outro separador guardou alterações. Guardei o teu trabalho como cópia.',
      en: 'Another tab saved changes. I saved your work as a copy.' });
  }

  /**
   * Queue the current revision before a UI action that may be followed by a
   * reload, even when another revision still owns the normal write queue.
   */
  checkpoint() {
    this.stageOnExit();
    return this.saveCommitted();
  }

  private stageCurrent() {
    try {
      const draft = this.draft();
      const previous = this.staged;
      this.staged = draft;
      void this.storage.stage(draft, previous?.id).catch(error => {
        if (this.staged === draft) this.staged = previous;
        console.error(error);
      });
    } catch (error) {
      console.error(error);
    }
  }

  private stageOnExit = () => {
    if (this.stopped || this.discarding) return;
    this.input.flushPending();
    for (const draft of this.memory.values()) void this.storage.stage(draft).catch(error => console.error(error));
    if (this.pending) this.stageCurrent();
  };
}
