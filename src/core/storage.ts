import type { ProjectRecord } from './types';

export interface StoredStamp {
  id: string;
  picture: Blob;
  number: number;
}

interface StoredProject extends ProjectRecord {
  writeId?: string;
}

export interface Draft {
  id: string;
  project: ProjectRecord;
  pageId?: string;
  expectedAt?: number;
  copyTitle: string;
  previous?: string;
  time: number;
  background?: boolean;
}

export interface Recovery {
  copied: boolean;
  active?: Draft;
  pending: Draft[];
}

interface StoredDraft extends Draft {
  epoch?: string;
}

const epochKey = 'erase-epoch';

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new DOMException('Storage transaction aborted', 'AbortError'));
  });
}

export class Storage {
  readonly changes = new BroadcastChannel('garatuja.storage');

  private constructor(private db: IDBDatabase, private readonly epoch?: string) {}

  static async open(): Promise<Storage> {
    const request = indexedDB.open('garatuja', 3);
    request.onupgradeneeded = event => {
      if (event.oldVersion < 1) {
        request.result.createObjectStore('projects', { keyPath: 'id' });
        request.result.createObjectStore('workspace');
      }
      if (event.oldVersion < 2) request.result.createObjectStore('stamps', { keyPath: 'id' });
      if (event.oldVersion < 3) request.result.createObjectStore('drafts', { keyPath: 'id' });
    };
    const db = await result(request);
    db.onversionchange = () => db.close();
    const epoch = await result<string | undefined>(db.transaction('workspace').objectStore('workspace').get(epochKey));
    return new Storage(db, epoch);
  }

  listStamps(): Promise<StoredStamp[]> {
    return result(this.db.transaction('stamps').objectStore('stamps').getAll());
  }

  saveStamp(stamp: StoredStamp): Promise<void> {
    return this.editStamps(store => { store.put(stamp); });
  }

  createStamp(id: string, picture: Blob): Promise<StoredStamp> {
    return this.editStamps(async (store, workspace) => {
      const existing = await result<StoredStamp | undefined>(store.get(id));
      if (existing) return existing;
      const last = await result<number | undefined>(workspace.get('last-stamp-number'));
      const number = (last ?? (await result<StoredStamp[]>(store.getAll()))
        .reduce((greatest, stamp) => Math.max(greatest, stamp.number), 0)) + 1;
      const stamp = { id, picture, number };
      store.add(stamp);
      workspace.put(number, 'last-stamp-number');
      return stamp;
    });
  }

  restoreStamp(stamp: StoredStamp): Promise<void> {
    return this.editStamps(async store => {
      if (await result(store.getKey(stamp.id)) === undefined) store.add(stamp);
    });
  }

  removeStamp(id: string): Promise<StoredStamp | undefined> {
    return this.editStamps(async (store, workspace) => {
      const stamp = await result<StoredStamp | undefined>(store.get(id));
      if (!stamp) return;
      const last = await result<number | undefined>(workspace.get('last-stamp-number'));
      if ((last ?? 0) < stamp.number) workspace.put(stamp.number, 'last-stamp-number');
      store.delete(id);
      return stamp;
    });
  }

  private async editStamps<T>(edit: (store: IDBObjectStore, workspace: IDBObjectStore) => T | Promise<T>): Promise<T> {
    const transaction = this.db.transaction(['stamps', 'workspace'], 'readwrite', { durability: 'strict' });
    const done = complete(transaction);
    try {
      await this.requireEpoch(transaction);
      const updated = await edit(transaction.objectStore('stamps'), transaction.objectStore('workspace'));
      await done;
      this.changes.postMessage({ kind: 'stamps' });
      return updated;
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
  }

  private async requireEpoch(transaction: IDBTransaction) {
    if (await result(transaction.objectStore('workspace').get(epochKey)) !== this.epoch) {
      throw new DOMException('Device data was cleared', 'AbortError');
    }
  }

  private async abort(transaction: IDBTransaction, done: Promise<void>) {
    try { transaction.abort(); } catch { /* The request may already have aborted it. */ }
    await done.catch(() => {});
  }

  list(): Promise<ProjectRecord[]> {
    return result(this.db.transaction('projects').objectStore('projects').getAll());
  }

  get(id: string): Promise<ProjectRecord | undefined> {
    return result(this.db.transaction('projects').objectStore('projects').get(id));
  }

  async recent(): Promise<{ project: ProjectRecord; pageId: string } | undefined> {
    const recent = await result<{ projectId: string; pageId: string } | undefined>(
      this.db.transaction('workspace').objectStore('workspace').get('recent'),
    );
    if (!recent) return;
    const project = await this.get(recent.projectId);
    if (project) return { project, pageId: recent.pageId };
    return undefined;
  }

  async remember(projectId: string, pageId: string) {
    const transaction = this.db.transaction('workspace', 'readwrite');
    const done = complete(transaction);
    try {
      await this.requireEpoch(transaction);
      transaction.objectStore('workspace').put({ projectId, pageId }, 'recent');
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
    await done;
  }

  async forget(projectId: string) {
    const transaction = this.db.transaction('workspace', 'readwrite');
    const done = complete(transaction);
    const workspace = transaction.objectStore('workspace');
    try {
      await this.requireEpoch(transaction);
      const recent = await result<{ projectId: string } | undefined>(workspace.get('recent'));
      if (recent?.projectId === projectId) workspace.delete('recent');
      await done;
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
  }

  async save(project: ProjectRecord): Promise<void> {
    await this.saveWorks([project]);
    this.changes.postMessage(project.id);
  }

  async stage(draft: Draft, superseded?: string) {
    // Enqueue the whole draft synchronously. During pagehide there may be no
    // opportunity to run an IndexedDB read callback before the tab disappears.
    const transaction = this.db.transaction('drafts', 'readwrite', { durability: 'strict' });
    const drafts = transaction.objectStore('drafts');
    drafts.put({ ...draft, epoch: this.epoch } satisfies StoredDraft);
    if (superseded && superseded !== draft.id) drafts.delete(superseded);
    transaction.commit();
    await complete(transaction);
  }

  async discardDrafts(draft: Draft) {
    const transaction = this.db.transaction('drafts', 'readwrite', { durability: 'strict' });
    const drafts = transaction.objectStore('drafts');
    drafts.delete(draft.id);
    if (draft.previous) drafts.delete(draft.previous);
    transaction.commit();
    await complete(transaction);
  }

  async recover(): Promise<Recovery> {
    const drafts = await result<StoredDraft[]>(this.db.transaction('drafts').objectStore('drafts').getAll());
    let copied = false;
    let active: Draft | undefined;
    const pending: Draft[] = [];
    for (const draft of drafts.sort((a, b) => a.time - b.time)) {
      if (draft.epoch !== this.epoch) continue;
      try {
        const restored = await this.write(draft, true);
        copied ||= Boolean(restored && restored.id !== draft.project.id);
        if (restored && !draft.background && draft.pageId) active = undefined;
      } catch (error) {
        console.error(error);
        // A write from another tab may have published this very checkpoint.
        const current = await this.get(draft.project.id) as StoredProject | undefined;
        const copy = await this.get(draft.id) as StoredProject | undefined;
        if (current?.writeId === draft.id || copy?.writeId === draft.id) continue;
        pending.push(draft);
        if (!draft.background && draft.pageId) active = draft;
      }
    }
    // The gallery holds one pending revision per work. Keep independent
    // drafts of the same work under their future conflict-copy IDs.
    const claimed = new Set(active ? [active.project.id] : []);
    const remaining = pending.filter(draft => draft !== active).reverse().map(draft => {
      if (!claimed.has(draft.project.id)) {
        claimed.add(draft.project.id);
        return draft;
      }
      return { ...draft, expectedAt: undefined, previous: undefined, background: true,
        project: { ...draft.project, id: draft.id, title: draft.copyTitle } };
    });
    return { copied, active, pending: remaining.reverse() };
  }

  async write(draft: Draft): Promise<ProjectRecord>;
  async write(draft: Draft, recovery: true): Promise<ProjectRecord | undefined>;
  async write(draft: Draft, recovery = false) {
    // Publishing may wait on other project revisions. Keep the emergency
    // draft store outside that transaction so pagehide can still queue a checkpoint.
    const transaction = this.db.transaction(recovery ? ['projects', 'workspace', 'drafts'] : ['projects', 'workspace'],
      'readwrite', { durability: 'strict' });
    const done = complete(transaction);
    const projects = transaction.objectStore('projects');
    const drafts = recovery ? transaction.objectStore('drafts') : undefined;
    const { project, id, pageId, expectedAt, copyTitle, previous } = draft;
    const get = (key: string) => result<StoredProject | undefined>(projects.get(key));
    let saved: StoredProject | undefined;
    try {
      await this.requireEpoch(transaction);
      if (drafts) {
        const staged = await result<StoredDraft | undefined>(drafts.get(id));
        if (!staged || staged.epoch !== this.epoch) {
          if (staged) drafts.delete(id);
          await done;
          return;
        }
      }
      const current = await get(project.id);
      // A normal autosave may have finished after the exit draft was staged.
      const previousCopy = current?.writeId === id ? undefined : await get(id);
      saved = current?.writeId === id ? current
        : recovery || previousCopy?.writeId === id ? previousCopy : undefined;
      if (!saved) {
        const parent = previous ? current?.writeId === previous ? current : await get(previous) : undefined;
        const sameWriter = parent !== undefined && parent.writeId === previous;
        const base = sameWriter ? parent : current;
        const published = base?.updatedAt === expectedAt || sameWriter;
        const updatedAt = Math.max(Date.now(), (base?.updatedAt ?? 0) + 1);
        // An exit draft can already have been saved and edited by another tab.
        // Preserve that copy if its original writer returns from the page cache.
        const targetId = published ? base?.id ?? project.id : previousCopy ? crypto.randomUUID() : id;
        saved = { ...project, id: targetId, updatedAt, writeId: id,
          title: published && targetId === project.id ? project.title : copyTitle,
          createdAt: published ? base?.createdAt ?? project.createdAt : updatedAt };
        projects.put(saved);
        if (!draft.background && pageId !== undefined) transaction.objectStore('workspace').put({ projectId: saved.id, pageId }, 'recent');
      }
      drafts?.delete(id);
      if (previous) drafts?.delete(previous);
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
    await done;
    if (!drafts) void this.discardDrafts(draft).catch(error => console.error(error));
    this.changes.postMessage(saved.id);
    return saved;
  }

  async clear() {
    const transaction = this.db.transaction([...this.db.objectStoreNames], 'readwrite', { durability: 'strict' });
    const done = complete(transaction);
    try {
      await this.requireEpoch(transaction);
      for (const name of transaction.objectStoreNames) transaction.objectStore(name).clear();
      // A delayed write from a previous session must never re-create erased work.
      transaction.objectStore('workspace').put(crypto.randomUUID(), epochKey);
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
    await done;
    this.changes.postMessage(null);
  }

  async saveWorks(projects: readonly ProjectRecord[]): Promise<void> {
    const transaction = this.db.transaction(['projects', 'workspace'], 'readwrite', { durability: 'strict' });
    const done = complete(transaction);
    const store = transaction.objectStore('projects');
    try {
      await this.requireEpoch(transaction);
      for (const project of projects) store.add(project);
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
    await done;
  }

  async remove(id: string, expectedAt?: number): Promise<boolean> {
    const transaction = this.db.transaction(['projects', 'workspace'], 'readwrite');
    const done = complete(transaction);
    try {
      await this.requireEpoch(transaction);
      const projects = transaction.objectStore('projects');
      const project = await result<StoredProject | undefined>(projects.get(id));
      const unchanged = !project || expectedAt === undefined || project.updatedAt === expectedAt;
      if (unchanged && project) projects.delete(id);
      await done;
      if (unchanged && project) this.changes.postMessage(id);
      return unchanged;
    } catch (error) {
      await this.abort(transaction, done);
      throw error;
    }
  }
}
