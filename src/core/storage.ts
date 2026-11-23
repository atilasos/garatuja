import type { ProjectRecord } from './types';

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class Storage {
  private constructor(private db: IDBDatabase) {}

  static async open(): Promise<Storage> {
    const request = indexedDB.open('garatuja', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('projects', { keyPath: 'id' });
      request.result.createObjectStore('workspace');
    };
    return new Storage(await result(request));
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

  save(project: ProjectRecord, pageId?: string): Promise<void> {
    const transaction = this.db.transaction(pageId === undefined ? ['projects'] : ['projects', 'workspace'], 'readwrite', { durability: 'strict' });
    transaction.objectStore('projects').put(project);
    if (pageId !== undefined) transaction.objectStore('workspace').put({ projectId: project.id, pageId }, 'recent');
    transaction.commit();
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
  }

  remove(id: string): Promise<void> {
    const transaction = this.db.transaction('projects', 'readwrite');
    transaction.objectStore('projects').delete(id);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
  }
}
