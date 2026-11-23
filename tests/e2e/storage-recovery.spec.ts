import { readFile } from 'node:fs/promises';
import { expect, test, type Download, type Page } from '@playwright/test';
import { deserializeWorks } from '../../src/features/exchange/format';
import { answerAdultChallenge, openAdultGate } from './teacher-access';

const control = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
  await page.evaluate(() => window.__garatuja?.app.documents.save());
}

async function decode(file: Download) {
  const path = await file.path();
  if (!path) throw new Error('Missing download');
  return deserializeWorks(new Blob([new Uint8Array(await readFile(path))]));
}

test('clean tabs never rewrite the work, reload remote edits, and preserve simultaneous edits as a copy', async ({ page, context }) => {
  await ready(page);
  const other = await context.newPage();
  await ready(other);
  const initial = await page.evaluate(() => window.__garatuja?.app.store.get().project);
  const id = initial?.id;
  if (!id) throw new Error('Missing project');
  await control(other, 'Abrir').click();
  await expect(other.getByRole('dialog', { name: 'Abrir trabalho' })).toBeVisible();
  expect(await other.evaluate(id => window.__garatuja?.app.storage.get(id), id)).toMatchObject({ updatedAt: initial.updatedAt });
  await other.keyboard.press('Escape');

  await page.evaluate(async () => {
    const docs = window.__garatuja?.app.documents;
    docs?.editProject({ title: 'Alterado no primeiro separador' });
    docs?.editText('Texto recebido');
    await docs?.save();
  });
  await expect(other.locator('.work-title')).toHaveText('Alterado no primeiro separador');
  await expect(other.locator('.writing-preview')).toContainText('Texto recebido');

  const edit = (tab: Page, name: string) => tab.evaluate(title => {
    window.__garatuja?.app.documents.editProject({ title });
  }, name);
  await Promise.all([edit(page, 'Primeiro'), edit(other, 'Segundo')]);
  await Promise.all([page, other].map(tab => tab.evaluate(() => window.__garatuja?.app.documents.save())));
  const saved = await page.evaluate(() => window.__garatuja?.app.storage.list());
  expect(saved).toHaveLength(2);
  expect(saved?.find(work => work.id === id)?.title).toMatch(/^(Primeiro|Segundo)$/);
  const copy = saved?.find(work => work.id !== id);
  expect(copy?.title).toMatch(/^(Primeiro|Segundo) \(cópia\)$/);
  expect(new Set(saved?.map(work => work.title.split(' ')[0]))).toEqual(new Set(['Primeiro', 'Segundo']));
  const conflicted = copy?.title.startsWith('Primeiro') ? page : other;
  await expect(conflicted.getByRole('status').filter({ hasText: 'como cópia' })).toBeVisible();
});

test('retrying a recovered conflict cannot overwrite later edits to its copy', async ({ page }) => {
  await ready(page);
  const copies = await page.evaluate(async () => {
    const app = window.__garatuja?.app;
    if (!app) throw new Error('Missing app');
    const { storage } = app;
    const project = app.documents.snapshot();
    const draft = { id: crypto.randomUUID(), project, expectedAt: project.updatedAt - 1, copyTitle: 'Versão local (cópia)', time: Date.now() };
    await storage.stage(draft);
    await storage.recover();
    const recovered = await storage.get(draft.id);
    if (!recovered) throw new Error('Missing recovered copy');
    await storage.write({ id: crypto.randomUUID(), project: { ...recovered, title: 'Alterada depois da recuperação' },
      expectedAt: recovered.updatedAt, copyTitle: 'Alterada (cópia)', time: Date.now() });
    const retry = await storage.write(draft);
    return { retry: retry.title, recovered: (await storage.get(recovered.id))?.title };
  });
  expect(copies).toEqual({ retry: 'Versão local (cópia)', recovered: 'Alterada depois da recuperação' });
});

test('quota failure keeps the drawing, opens the gallery and exports from memory for child and teacher', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && !sessionStorage.getItem('released')) {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      return original.apply(this, args);
    };
    const app = window.__garatuja?.app;
    app?.documents.editProject({ title: 'Ainda aqui' });
    app?.documents.editText('Texto por guardar');
  });
  const canvas = page.locator('.sheet');
  await canvas.click({ position: { x: 120, y: 115 } });
  await control(page, 'Abrir').click();
  const gallery = page.getByRole('dialog', { name: 'Abrir trabalho' });
  const notice = gallery.locator('.save-recovery');
  await expect(notice).toContainText('Não consegui guardar. O teu desenho continua aqui.');
  await notice.getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(notice).toBeVisible();
  const childFile = page.waitForEvent('download');
  await notice.getByRole('button', { name: 'Guardar num ficheiro' }).click();
  const local = (await decode(await childFile))[0];
  expect(local).toMatchObject({ title: 'Ainda aqui', pages: [{ text: 'Texto por guardar' }] });
  const savedSize = await page.evaluate(async () => (await window.__garatuja?.app.storage.list())?.[0].pages[0].bitmap.size);
  expect(local.pages[0].bitmap.size).not.toEqual(savedSize);
  await page.keyboard.press('Escape');

  await openAdultGate(page);
  await answerAdultChallenge(page);
  const teacher = page.getByRole('dialog', { name: 'Área do professor' });
  const teacherFile = page.waitForEvent('download');
  await teacher.getByRole('button', { name: 'Exportar todos os trabalhos' }).click();
  const exported = await decode(await teacherFile);
  expect(exported).toHaveLength(1);
  expect(exported[0].pages[0].bitmap.size).toEqual(local.pages[0].bitmap.size);
  await page.keyboard.press('Escape');
  await page.evaluate(() => sessionStorage.setItem('released', 'true'));
  await control(page, 'Tentar de novo').click();
  await expect(page.locator('.save-recovery')).toBeHidden();
  await expect.poll(() => page.evaluate(async () => (await window.__garatuja?.app.storage.list())?.[0].title)).toBe('Ainda aqui');
});

test('recovers the exit draft when a reload interrupts the normal write', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects') throw new DOMException('Write interrupted', 'AbortError');
      return original.apply(this, args);
    };
    const app = window.__garatuja?.app;
    app?.documents.editProject({ title: 'Recuperado ao sair' });
    app?.documents.editText('A frase por guardar');
    window.dispatchEvent(new PageTransitionEvent('pagehide'));
  });
  await page.reload();
  await expect(page.locator('.work-title')).toHaveText('Recuperado ao sair');
  await expect(page.locator('.writing-preview')).toContainText('A frase por guardar');
  expect(await page.evaluate(() => window.__garatuja?.app.storage.list())).toHaveLength(1);
});

test('PIN stays hashed across reload and typed confirmation clears stamps, pending trash and preferences', async ({ page, context }) => {
  await ready(page);
  const original = await page.evaluate(async () => {
    const app = window.__garatuja?.app;
    if (!app) throw new Error('Missing app');
    const work = app.store.get().project;
    await app.storage.saveStamp({ id: 'personal-test', number: 1, picture: work.pages[0].thumb });
    return work.id;
  });
  await page.addInitScript(() => {
    const revoke = URL.revokeObjectURL;
    URL.revokeObjectURL = url => {
      if (url === sessionStorage.getItem('personalStampUrl')) sessionStorage.setItem('revokedImageUrl', 'yes');
      revoke(url);
    };
  });
  await openAdultGate(page);
  await answerAdultChallenge(page);
  const teacher = page.getByRole('dialog', { name: 'Área do professor' });
  await teacher.getByLabel('PIN do adulto').fill('0137');
  await teacher.getByRole('button', { name: 'Definir PIN' }).click();
  await expect(teacher.getByRole('status')).toContainText('PIN guardado');
  expect(await page.evaluate(() => localStorage.getItem('garatuja.adultPin'))).toMatch(/^[\da-f-]{36}:[\da-f]{64}$/);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__garatuja));
  await control(page, 'Carimbo').click();
  await control(page, 'Categorias').click();
  const stamp = await control(page, 'Os meus carimbos').locator('img').getAttribute('src');
  if (!stamp) throw new Error('Missing personal stamp URL');
  await page.evaluate(url => sessionStorage.setItem('personalStampUrl', url), stamp);

  const stale = await context.newPage();
  await ready(stale);
  await stale.evaluate(() => window.__garatuja?.app.storage.changes.close());

  await control(page, 'Abrir').click();
  const gallery = page.getByRole('dialog', { name: 'Abrir trabalho' });
  await gallery.getByRole('button', { name: 'Apagar', exact: true }).click();
  await gallery.getByRole('button', { name: 'Sim, apagar', exact: true }).click();
  await expect(gallery.getByRole('button', { name: 'Anular', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.toast').getByRole('button', { name: 'Anular', exact: true })).toBeVisible();
  const gate = await openAdultGate(page);
  await gate.getByLabel('PIN do adulto').fill('9999');
  await gate.getByRole('button', { name: 'Entrar' }).click();
  await expect(gate.getByRole('alert')).toContainText('Experimenta outra vez');
  await gate.getByLabel('PIN do adulto').fill('0137');
  await gate.getByRole('button', { name: 'Entrar' }).click();
  await teacher.getByRole('button', { name: 'Apagar todos os dados do dispositivo' }).click();
  await teacher.getByRole('button', { name: 'Continuar' }).click();
  const erase = teacher.getByRole('button', { name: 'Sim, apagar tudo' });
  await teacher.getByLabel('Escreve APAGAR').fill('apaga');
  await expect(erase).toBeDisabled();
  await teacher.getByLabel('Escreve APAGAR').fill('apagar');
  await expect(erase).toBeEnabled();
  await teacher.getByLabel('Escreve APAGAR').fill('  APAGAR  ');
  await page.evaluate(() => sessionStorage.removeItem('revokedImageUrl'));
  const reload = page.waitForEvent('load');
  await erase.click();
  await reload;
  await page.waitForFunction(() => Boolean(window.__garatuja));
  const remaining = await page.evaluate(async id => ({
    work: await window.__garatuja?.app.storage.get(id),
    stamps: await window.__garatuja?.app.storage.listStamps(),
    pin: localStorage.getItem('garatuja.adultPin'),
    revoked: sessionStorage.getItem('revokedImageUrl'),
  }), original);
  expect(remaining).toEqual({ work: undefined, stamps: [], pin: null, revoked: 'yes' });
  expect(await stale.evaluate(async () => {
    const app = window.__garatuja?.app;
    app?.documents.editProject({ title: 'Não voltar' });
    return app?.documents.save();
  })).toBe(false);
  expect(await page.evaluate(async () => (await window.__garatuja?.app.storage.list())?.every(work => !work.title)))
    .toBe(true);
  await expect(page.locator('.toast').getByRole('button', { name: 'Anular', exact: true })).toHaveCount(0);
});

test('reload under full quota opens the latest text and drawing and retries publication', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && sessionStorage.getItem('quota-full')) {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      return put.apply(this, args);
    };
  });
  await ready(page);
  const id = await page.evaluate(() => {
    sessionStorage.setItem('quota-full', '1');
    return window.__garatuja!.app.store.get().project.id;
  });
  const sheet = page.locator('.sheet');
  await sheet.click({ position: { x: 120, y: 115 } });
  await expect(page.locator('#app .save-recovery')).toBeVisible();
  await page.evaluate(async () => {
    const docs = window.__garatuja!.app.documents;
    docs.editText('A Lia chegou ao Funchal.');
    await docs.save();
  });
  await page.reload();
  await expect(page.locator('.writing-preview')).toHaveText('A Lia chegou ao Funchal.');
  const notice = page.locator('#app .save-recovery');
  await expect(notice).toBeVisible();
  const bitmapSizes = await page.evaluate(async id => {
    const { storage, documents } = window.__garatuja!.app;
    return [documents.snapshot().pages[0].bitmap.size, (await storage.get(id))?.pages[0].bitmap.size];
  }, id);
  expect(bitmapSizes[0]).not.toBe(bitmapSizes[1]);
  const download = page.waitForEvent('download');
  await notice.getByRole('button', { name: 'Guardar num ficheiro' }).click();
  expect((await decode(await download))[0].pages[0].bitmap.size).toBe(bitmapSizes[0]);
  const retry = notice.getByRole('button', { name: 'Tentar de novo' });
  await retry.click();
  await expect(retry).toBeEnabled();
  await expect(notice).toBeVisible();
  await page.evaluate(() => sessionStorage.removeItem('quota-full'));
  await retry.click();
  await expect(notice).toBeHidden();
  await page.reload();
  await expect(page.locator('.writing-preview')).toHaveText('A Lia chegou ao Funchal.');
  await expect(notice).toBeHidden();
});

test('page and comment Undo follow the conflict copy across tabs', async ({ page, context }) => {
  await ready(page);
  await page.evaluate(async () => {
    const { app } = window.__garatuja!;
    app.documents.editProject({ title: 'Livro a duas mãos',
      comments: [{ id: 'rui', from: 'Rui', text: 'Gostei da ponte.', kind: 'gostei' }] });
    await app.documents.add();
    app.documents.editText('A página a repor.');
    await app.documents.save();
  });
  const other = await context.newPage();
  await ready(other);
  const original = await page.evaluate(() => {
    const { app } = window.__garatuja!;
    app.documents.stopSaving();
    return app.store.get().project.id;
  });
  async function remoteEdit(title: string) {
    await other.evaluate(async title => {
      const { documents } = window.__garatuja!.app;
      documents.editProject({ title });
      await documents.save();
    }, title);
  }
  const remote = page.evaluate(() => new Promise(resolve => {
    window.__garatuja!.app.storage.changes.addEventListener('message', () => resolve(true), { once: true });
  }));
  await remoteEdit('Livro alterado no outro separador');
  await remote;
  await page.evaluate(() => window.__garatuja!.app.documents.resumeSaving());
  await page.bringToFront();
  await control(page, 'Organizar').click();
  await control(page, 'Apagar página').click();
  await expect(page.locator('.work-title')).toHaveText('Livro a duas mãos (cópia)');
  const undo = page.locator('.toast').getByRole('button', { name: 'Anular', exact: true });
  await undo.click();
  await expect(page.locator('.writing-preview')).toHaveText('A página a repor.');
  const copyId = await page.evaluate(async () => {
    const { app } = window.__garatuja!;
    await app.documents.save();
    return app.store.get().project.id;
  });
  expect(copyId).not.toBe(original);
  expect(await other.evaluate(async id => (await window.__garatuja!.app.storage.get(id))?.title, original))
    .toBe('Livro alterado no outro separador');

  await other.evaluate(async id => {
    const { app } = window.__garatuja!;
    const project = await app.storage.get(id);
    if (!project) throw new Error('Missing conflict copy');
    await app.documents.open(project, undefined, true);
  }, copyId);
  await page.bringToFront();
  await control(page, 'Apresentar à turma').click();
  const present = page.getByRole('dialog', { name: 'Apresentar à turma' });
  for (let i = 0; i < 3; i++) await page.keyboard.press('PageDown');
  await expect(present.locator('.class-comment')).toHaveText(/Gostei da ponte/);
  await remoteEdit('A cópia já tinha alterações');
  await present.getByRole('button', { name: 'Apagar comentário' }).click();
  await present.getByRole('button', { name: 'Anular' }).click();
  await expect(present.locator('.class-comment')).toHaveText(/Gostei da ponte/);
  const result = await page.evaluate(async id => {
    const { app } = window.__garatuja!;
    await app.documents.save();
    const current = app.store.get().project;
    return { id: current.id, local: current.comments.length, remote: (await app.storage.get(id))?.title };
  }, copyId);
  expect(result).toMatchObject({ local: 1, remote: 'A cópia já tinha alterações' });
  expect(result.id).not.toBe(copyId);
});

test('a background quota draft stays in the gallery after reload and supplies the template paper', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && sessionStorage.getItem('quota-full')) throw new DOMException('Quota', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
  await ready(page);
  const first = await page.evaluate(async () => {
    const { app } = window.__garatuja!;
    app.documents.editProject({ title: 'Papel da ponte' });
    await app.documents.save();
    return app.store.get().project.id;
  });
  await control(page, 'Novo').click();
  await control(page, 'Começar').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(async id => {
    const { app } = window.__garatuja!;
    app.documents.editProject({ title: 'Outro desenho' });
    await app.documents.save();
    await app.documents.open((await app.storage.get(id))!, undefined, true);
    sessionStorage.setItem('quota-full', 'yes');
  }, first);
  await page.locator('.sheet').click();
  await expect(page.locator('#app .save-recovery')).toBeVisible();
  await control(page, 'Abrir').click();
  await page.getByRole('button', { name: /^Outro desenho,/ }).click();
  await expect(page.locator('.work-title')).toHaveText('Outro desenho');
  await page.reload();
  await expect(page.locator('.work-title')).toHaveText('Outro desenho');
  await expect(page.locator('#app .save-recovery')).toBeVisible();
  await control(page, 'Abrir').click();
  const card = page.locator(`[data-project="${first}"]`);
  await card.getByRole('button', { name: 'Usar como modelo' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.__garatuja!.pixel(800, 600))).toEqual([41, 42, 51, 255]);
  await expect(page.locator('.work-title')).toHaveText('Sem título');
});

test('independent quota drafts of the same work stay separately recoverable', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && sessionStorage.getItem('quota-full')) throw new DOMException('Quota', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
  await ready(page);
  await page.evaluate(async () => {
    const { storage, documents } = window.__garatuja!.app;
    const project = documents.snapshot();
    const time = Date.now();
    for (const [i, text] of ['Primeiro rascunho', 'Segundo rascunho', 'Terceiro rascunho'].entries()) {
      await storage.stage({
        id: crypto.randomUUID(), expectedAt: project.updatedAt, time: time + i,
        pageId: project.pages[0].id, copyTitle: text + ' (cópia)',
        project: { ...project, pages: [{ ...project.pages[0], text }] },
      });
    }
    sessionStorage.setItem('quota-full', 'yes');
  });
  await page.reload();
  await expect(page.locator('.writing-preview')).toHaveText('Terceiro rascunho');
  const recovery = page.locator('#app .save-recovery');
  const download = page.waitForEvent('download');
  await recovery.getByRole('button', { name: 'Guardar num ficheiro' }).click();
  expect((await decode(await download)).map(work => work.pages[0].text).sort())
    .toEqual(['Primeiro rascunho', 'Segundo rascunho', 'Terceiro rascunho']);
  await control(page, 'Abrir').click();
  const gallery = page.getByRole('dialog', { name: 'Abrir trabalho' });
  const card = gallery.getByRole('listitem').filter({ hasText: 'Primeiro rascunho (cópia)' });
  await card.getByRole('button', { name: 'Apagar', exact: true }).click();
  await card.getByRole('button', { name: 'Sim, apagar' }).click();
  await expect(card).toHaveCount(0);
  await gallery.getByRole('button', { name: 'Anular', exact: true }).click();
  await expect(card).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(() => sessionStorage.removeItem('quota-full'));
  await recovery.getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(recovery).toBeHidden();
  expect(await page.evaluate(async () => (await window.__garatuja!.app.storage.list()).map(work => work.pages[0].text).sort()))
    .toEqual(['Primeiro rascunho', 'Segundo rascunho', 'Terceiro rascunho']);
});
