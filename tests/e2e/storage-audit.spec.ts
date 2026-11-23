import { readFile } from 'node:fs/promises';
import { expect, test, type Download, type Page } from '@playwright/test';
import { deserializeWorks } from '../../src/features/exchange/format';
import { answerAdultChallenge, openAdultGate } from './teacher-access';

const control = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
}
async function saveNamed(page: Page, title: string) {
  return page.evaluate(async title => {
    const app = window.__garatuja!.app;
    app.documents.editProject({ title, author: 'Ana', audience: 'Turma' });
    await app.documents.save();
    return app.store.get().project.id;
  }, title);
}
async function readWorks(download: Download) {
  const path = await download.path();
  if (!path) throw new Error('Missing archive');
  return deserializeWorks(new Blob([new Uint8Array(await readFile(path))]));
}

for (const changed of [false, true]) {
  test(`trash expiry preserves work only when another tab changed its revision: ${changed}`, async ({ page, context }) => {
    await ready(page);
    const id = await saveNamed(page, 'Apagar da galeria');
    const other = await context.newPage();
    await ready(other);
    await page.bringToFront();
    await page.clock.install();
    await control(page, 'Abrir').click();
    const card = page.locator(`[data-project="${id}"]`);
    await card.getByRole('button', { name: 'Apagar', exact: true }).click();
    await card.getByRole('button', { name: /Sim/ }).click();
    await expect(card).toHaveCount(0);
    if (changed) await saveNamed(other, 'Guardado noutro separador');
    await page.clock.fastForward(31_000);
    await expect.poll(() => page.evaluate(async id => (await window.__garatuja!.app.storage.get(id))?.title, id))
      .toBe(changed ? 'Guardado noutro separador' : undefined);
    if (changed) await expect(page.getByText('Outro separador guardou alterações.', { exact: false })).toBeAttached();
  });
}

for (const [permission, name] of [['allowPrint', 'Imprimir'], ['allowImport', 'Importar .garatuja']] as const) {
  test(`child settings in an older tab preserve the teacher’s ${permission} setting`, async ({ page, context }) => {
    await ready(page);
    const stale = await context.newPage();
    await ready(stale);
    await page.evaluate(permission => window.__garatuja!.app.configure({ [permission]: false }), permission);
    await stale.evaluate(() => window.__garatuja!.app.configure({ sound: true }));
    await expect.poll(() => page.evaluate(permission => {
      const settings = window.__garatuja!.app.store.get().settings;
      return [settings[permission], settings.sound];
    }, permission)).toEqual([false, true]);
    await stale.reload();
    await stale.waitForFunction(() => Boolean(window.__garatuja));
    if (permission === 'allowImport') await control(stale, 'Abrir').click();
    await expect(control(stale, name)).toHaveCount(0);
  });
}

test('quota failure leaves both works recoverable after switching page and starting a new work', async ({ page, context }) => {
  await ready(page);
  const id = await saveNamed(page, 'Trabalho guardado');
  await page.evaluate(() => window.__garatuja!.app.documents.add());
  const other = await context.newPage();
  await ready(other);
  await page.bringToFront();
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && !sessionStorage.getItem('quota-released')) throw new DOMException('Quota', 'QuotaExceededError');
      return put.apply(this, args);
    };
    window.__garatuja!.app.documents.editText('Em memória');
  });
  await control(page, 'Página 1').click();
  await expect(control(page, 'Página 1')).toHaveAttribute('aria-pressed', 'true');
  await control(page, 'Novo').click();
  await control(page, 'Começar').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.save-recovery')).toBeVisible();
  const downloading = page.waitForEvent('download');
  await control(page, 'Guardar num ficheiro').click();
  const works = await readWorks(await downloading);
  expect(works.find(work => work.title === 'Trabalho guardado')?.pages[1].text).toBe('Em memória');
  await page.evaluate(() => sessionStorage.setItem('quota-released', 'true'));
  await control(page, 'Tentar de novo').click();
  await expect.poll(() => other.evaluate(async id => (await window.__garatuja!.app.storage.get(id))?.pages[1].text, id))
    .toBe('Em memória');
  await expect(page.locator('.save-recovery')).toBeHidden();
});

test('teacher archive excludes a work still in the trash of another tab', async ({ page, context }) => {
  await ready(page);
  await saveNamed(page, 'Na reciclagem');
  await control(page, 'Abrir').click();
  const card = page.getByRole('listitem').filter({ hasText: 'Na reciclagem' });
  await card.getByRole('button', { name: 'Apagar', exact: true }).click();
  await card.getByRole('button', { name: /Sim/ }).click();
  await expect(card).toHaveCount(0);
  const other = await context.newPage();
  await ready(other);
  await saveNamed(other, 'Para exportar');
  await openAdultGate(other);
  await answerAdultChallenge(other);
  const downloading = other.waitForEvent('download');
  await control(other, 'Exportar todos os trabalhos').click();
  const titles = (await readWorks(await downloading)).map(work => work.title);
  expect(titles).not.toContain('Na reciclagem');
  expect(titles).toContain('Para exportar');
});

test('opening New leaves the untouched initial sheet out of storage', async ({ page, context }) => {
  await ready(page);
  await control(page, 'Novo').click();
  await control(page, 'Começar').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const other = await context.newPage();
  await ready(other);
  expect(await other.evaluate(async () => (await window.__garatuja!.app.storage.list()).length)).toBe(1);
});

test('history evicts the least recently visited inactive page', async ({ page }) => {
  await ready(page);
  const retained = await page.evaluate(async () => {
    const { documents, surface } = window.__garatuja!.app;
    const context = surface.context({ color: () => '', opt: () => '', sound: () => {}, say: () => {} });
    function fill(count: number) {
      for (let i = 0; i < count; i++) {
        surface.begin();
        surface.ctx.fillStyle = i % 2 ? 'white' : 'black';
        surface.ctx.fillRect(0, 0, 1600, 1200);
        context.markAllDirty();
        surface.commit();
      }
    }
    const first = documents.page.id;
    fill(6);
    await documents.add();
    const second = documents.page.id;
    fill(6);
    await documents.add();
    const third = documents.page.id;
    await documents.select(first);
    await documents.select(third);
    fill(20);
    await documents.select(first);
    const recent = surface.canUndo;
    await documents.select(second);
    return [recent, surface.canUndo];
  });
  expect(retained).toEqual([true, false]);
});

test('personal stamps created concurrently receive separate names', async ({ page, context }) => {
  await ready(page);
  const other = await context.newPage();
  await ready(other);
  const write = (tab: Page) => tab.evaluate(async () => {
    const app = window.__garatuja!.app;
    const { thumb } = app.documents.page;
    return (await app.storage.createStamp('personal-' + crypto.randomUUID(), thumb)).number;
  });
  expect((await Promise.all([write(page), write(other)])).sort()).toEqual([1, 2]);
});
