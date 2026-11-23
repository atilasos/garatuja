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

function fillProjectQuota(page: Page) {
  return page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects') throw new DOMException('Quota', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
}

for (const moveAway of [false, true]) {
  test(`backup exports both conflicting versions, and Duplicate takes the draft (left work: ${moveAway})`, async ({ page, context }) => {
    await ready(page);
    const id = await saveNamed(page, 'O meu livro');
    const other = await context.newPage();
    await ready(other);
    await fillProjectQuota(page);
    await page.evaluate(() => window.__garatuja!.app.documents.editText('Versão em memória'));
    await other.evaluate(async () => {
      const { documents } = window.__garatuja!.app;
      documents.editText('Versão guardada');
      await documents.save();
    });
    await page.bringToFront();
    if (moveAway) {
      await control(page, 'Novo').click();
      await control(page, 'Começar').click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    await control(page, 'Abrir').click();
    await control(page, 'Diapositivos').click();
    await page.locator(`[data-project="${id}"] .gallery-open`).click();
    await control(page, 'Reproduzir seleção').click();
    await expect(page.locator('.book-copy')).toContainText('Versão em memória');
    await control(page, 'Sair').click();
    await control(page, 'Abrir').click();
    await page.locator(`[data-project="${id}"]`).getByRole('button', { name: 'Duplicar', exact: true }).click();
    await expect.poll(() => page.evaluate(async id => (await window.__garatuja!.app.storage.list())
      .find(work => work.id !== id && work.title.startsWith('O meu livro'))?.pages[0].text, id)).toBe('Versão em memória');
    await page.keyboard.press('Escape');
    await openAdultGate(page);
    await answerAdultChallenge(page);
    const downloading = page.waitForEvent('download');
    await control(page, 'Exportar todos os trabalhos').click();
    const versions = await readWorks(await downloading);
    expect(versions.some(work => work.title === 'O meu livro' && work.pages[0].text === 'Versão guardada')).toBe(true);
    expect(versions.some(work => work.title === 'O meu livro (cópia)' && work.pages[0].text === 'Versão em memória')).toBe(true);
    expect(new Set(versions.map(work => work.id)).size).toBe(versions.length);
  });
}

test('deleting the active work with full storage restores only the saved revision if undone', async ({ page }) => {
  await ready(page);
  const id = await saveNamed(page, 'Folha cheia');
  await fillProjectQuota(page);
  await page.evaluate(() => window.__garatuja!.app.documents.editText('Texto por guardar'));
  await control(page, 'Abrir').click();
  const card = page.locator(`[data-project="${id}"]`);
  await card.getByRole('button', { name: 'Apagar', exact: true }).click();
  await card.getByRole('button', { name: 'Sim, apagar' }).click();
  await expect(card).toHaveCount(0);
  await expect(page.locator('.work-title')).toHaveText('Sem título');
  const gallery = page.getByRole('dialog', { name: 'Abrir trabalho' });
  await gallery.getByRole('button', { name: 'Anular', exact: true }).click();
  await card.getByRole('button', { name: /Folha cheia/ }).click();
  await expect(page.locator('.writing-preview')).toHaveText('Escreve aqui o teu texto');
  expect(await page.evaluate(() => window.__garatuja!.app.documents.recoveryProjects)).toHaveLength(0);
});

for (const delay of [0, 50, 100, 250, 350, 500]) {
  test(`the first stroke survives real navigation after ${delay} ms, three times`, async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('Missing base URL');
    for (let sample = 0; sample < 3; sample++) {
      const isolated = await browser.newContext({ baseURL });
      try {
        const page = await isolated.newPage();
        await ready(page);
        await page.evaluate(delay => {
          const { surface } = window.__garatuja!.app;
          surface.element.addEventListener('pointerup', () => {
            if (delay === 0) location.replace('about:blank');
            else setTimeout(() => location.replace('about:blank'), delay);
          }, { once: true });
        }, delay);
        await page.locator('.sheet').click();
        await page.waitForURL('about:blank');
        await ready(page);
        expect(await page.evaluate(() => window.__garatuja!.pixel(800, 600))).toEqual([41, 42, 51, 255]);
        expect(await page.evaluate(() => window.__garatuja!.app.storage.list())).toHaveLength(1);
      } finally {
        await isolated.close();
      }
    }
  });
}

test('first-stroke checkpoint is written while normal project publication is blocked by another transaction', async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('garatuja');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const transaction = db.transaction('projects', 'readwrite');
    const store = transaction.objectStore('projects');
    const hold = () => {
      const request = store.count();
      request.onsuccess = hold;
    };
    hold();
    setTimeout(() => { transaction.abort(); db.close(); }, 3000);
  });
  await page.locator('.sheet').click();
  await page.evaluate(() => { void window.__garatuja!.app.documents.save(); });
  const persisted = await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const req = indexedDB.open('garatuja');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const count = db.transaction('drafts').objectStore('drafts').count();
      count.onsuccess = () => { resolve(count.result); db.close(); };
      count.onerror = () => { reject(count.error); db.close(); };
    };
  }));
  expect(persisted).toBe(1);
});

test('page selection stays busy until the last-page preference is stored', async ({ page }) => {
  await ready(page);
  await saveNamed(page, 'A ponte');
  const sheet = page.locator('.sheet');
  const ink = () => page.evaluate(() => window.__garatuja!.app.surface.ctx.getImageData(800, 600, 1, 1).data[0]);
  await sheet.click();
  expect(await ink()).toBeLessThan(100);
  await control(page, 'Adicionar página').click();
  await expect(control(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
  await expect(control(page, 'Desfazer')).toHaveAttribute('aria-busy', 'false');
  await page.evaluate(() => {
    const { storage } = window.__garatuja!.app;
    const remember = storage.remember.bind(storage);
    storage.remember = async (...args) => {
      await new Promise<void>(resolve => {
        window.addEventListener('continue-remember', () => resolve(), { once: true });
        document.body.dataset.rememberPending = 'true';
      });
      await remember(...args);
    };
  });
  await control(page, 'Página 1').click();
  await expect(page.locator('body')).toHaveAttribute('data-remember-pending', 'true');
  await expect(control(page, 'Página 1')).toHaveAttribute('aria-pressed', 'false');
  expect(await ink()).toBe(255);
  await expect(control(page, 'Desfazer')).toHaveAttribute('aria-busy', 'true');
  await page.keyboard.press('Control+z');
  await expect(page.locator('.hint')).toHaveText('Espera que a folha esteja pronta.');
  await page.evaluate(() => window.dispatchEvent(new Event('continue-remember')));
  await expect(control(page, 'Página 1')).toHaveAttribute('aria-pressed', 'true');
  await expect(control(page, 'Desfazer')).toHaveAttribute('aria-busy', 'false');
  expect(await ink()).toBeLessThan(100);
  await control(page, 'Desfazer').click();
  expect(await ink()).toBe(255);
  await expect(control(page, 'Refazer')).toBeEnabled();
  await page.reload();
  await expect(control(page, 'Página 1')).toHaveAttribute('aria-pressed', 'true');
});

test('persistent save recovery updates both its message and actions in each language', async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    const { documents } = window.__garatuja!.app;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects') throw new DOMException('Quota', 'QuotaExceededError');
      return put.apply(this, args);
    };
    documents.editText('Em memória.');
    await documents.save();
  });
  const notice = page.locator('#app .save-recovery');
  await expect(notice).toContainText('Não consegui guardar.');
  await page.evaluate(() => window.__garatuja!.app.configure({ locale: 'en' }));
  await expect(notice).toContainText('I couldn’t save.');
  await expect(notice.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(notice.getByRole('button', { name: 'Save to a file' })).toBeVisible();
  await page.evaluate(() => window.__garatuja!.app.configure({ locale: 'pt' }));
  await expect(notice).toContainText('Não consegui guardar.');
  await expect(notice.getByRole('button', { name: 'Guardar num ficheiro' })).toBeVisible();
});
