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
  await teacher.getByLabel('Escreve APAGAR').fill('APAGAR');
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
