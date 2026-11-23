import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type Download } from '@playwright/test';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const tools = ['text', 'label', 'move', 'shapes', 'lines', 'linear', 'radial', 'lightning', 'flowers'] as const;
type EditingTool = typeof tools[number];

async function prepare(page: Page, tool: EditingTool, previousMark = false) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
  await page.evaluate(async () => {
    const app = window.__garatuja!.app;
    app.documents.editProject({ title: 'Trabalho', author: 'Ana', audience: 'A turma' });
    await app.documents.add();
    await app.documents.select(app.store.get().project.pages[0].id);
  });
  const sheet = await page.locator('.sheet').boundingBox();
  if (!sheet) throw new Error('Missing sheet');
  const point = (x: number, y: number) => ({ x: sheet.x + sheet.width * x, y: sheet.y + sheet.height * y });
  const from = point(.22, .28);
  const to = point(.55, .56);
  const drag = async (start: typeof from, end: typeof from) => {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 5 });
    await page.mouse.up();
  };
  if (previousMark || tool === 'move') await page.mouse.click(from.x, from.y);
  if (tool === 'move') {
    await page.evaluate(() => window.__garatuja!.app.chooseTool('move'));
    await drag(point(.15, .20), point(.30, .36));
    await drag(from, to);
  } else {
    await page.evaluate(tool => {
      const app = window.__garatuja!.app;
      app.setColor('#652d96');
      if (tool === 'linear' || tool === 'radial') {
        app.chooseTool('fill');
        app.setOption('mode', tool);
      } else if (tool === 'lightning' || tool === 'flowers') {
        app.chooseTool('magic');
        app.setOption('effect', tool);
      } else {
        app.chooseTool(tool);
      }
      if (tool === 'shapes') app.setOption('turn', true);
      if (['lines', 'linear', 'radial', 'lightning', 'flowers'].includes(tool)) app.configure({ fixedClick: true });
    }, tool);
    if (tool === 'shapes') {
      await drag(from, to);
      await page.mouse.move(to.x + 40, to.y);
    } else {
      await page.mouse.click(from.x, from.y);
      if (tool === 'text' || tool === 'label') await page.locator('.label-field').fill('Frase por assentar');
      else await page.mouse.move(to.x, to.y, { steps: 4 });
    }
  }
  return page.evaluate(() => window.__garatuja!.app.store.get().project.pages[0].id);
}

async function expectIllustration(page: Page, download: Download, type: 'png' | 'gif') {
  expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${type}$`));
  const path = await download.path();
  if (!path) throw new Error('Missing illustration');
  const encoded = (await readFile(path)).toString('base64');
  const hasInk = await page.evaluate(async ({ encoded, type }) => {
    const blob = new Blob([Uint8Array.from(atob(encoded), letter => letter.charCodeAt(0))], { type: 'image/' + type });
    const image = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    image.close();
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 !== 3 && value < 250);
  }, { encoded, type });
  expect(hasInk).toBe(true);
}

const actions: Record<string, (page: Page) => Promise<void>> = {
  tool: async page => { await button(page, 'Borracha').click(); },
  page: async page => { await button(page, 'Página 2').click(); },
  duplicate: async page => {
    await button(page, 'Organizar').click();
    await page.getByRole('toolbar', { name: 'Organizar páginas' }).getByRole('button', { name: 'Duplicar página' }).click();
    await expect(button(page, 'Página 2')).toHaveAttribute('aria-pressed', 'true');
  },
  save: async page => { await button(page, 'Guardar').click(); },
  print: async page => { await button(page, 'Imprimir').click(); await expect(page.getByRole('dialog')).toBeVisible(); },
  read: async page => { await button(page, 'Ler').click(); await expect(page.getByRole('dialog')).toBeVisible(); },
  present: async page => { await button(page, 'Apresentar à turma').click(); await expect(page.locator('.class-presentation')).toBeVisible(); },
  animate: async page => { await button(page, 'Animar').click(); await expect(page.getByRole('dialog')).toBeVisible(); },
  png: async page => {
    await button(page, 'Abrir').click();
    const downloading = page.waitForEvent('download');
    await button(page, 'Guardar página em PNG').click();
    await expectIllustration(page, await downloading, 'png');
  },
  gif: async page => {
    await button(page, 'Animar').click();
    const downloading = page.waitForEvent('download');
    await button(page, 'Guardar GIF').click();
    await expectIllustration(page, await downloading, 'gif');
  },
  reload: async page => { await page.reload(); await page.waitForFunction(() => Boolean(window.__garatuja)); },
};

for (const tool of tools) {
  for (const [action, exit] of Object.entries(actions)) {
    test(`pending edit ${tool} survives ${action}`, async ({ page }) => {
      const id = await prepare(page, tool);
      await exit(page);
      await expect.poll(() => page.evaluate(async ({ id, tool, action }) => {
        const app = window.__garatuja!.app;
        const project = await app.storage.get(app.store.get().project.id);
        const saved = action === 'duplicate' ? project?.pages[1] : project?.pages.find(page => page.id === id);
        if (!saved) return false;
        if (tool === 'label') return saved.labels.some(label => label.text === 'Frase por assentar');
        const image = await createImageBitmap(saved.bitmap);
        const canvas = new OffscreenCanvas(1600, 1200);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        image.close();
        if (tool === 'move') {
          const previous = ctx.getImageData(352, 336, 1, 1).data;
          const moved = ctx.getImageData(880, 672, 1, 1).data;
          return previous[0] === 255 && moved[0] < 250;
        }
        const pixels = ctx.getImageData(0, 0, 1600, 1200).data;
        return pixels.some((value, index) => index % 4 !== 3 && value < 250);
      }, { id, tool, action })).toBe(true);
    });
  }
}

test('an oversized writing draft persists and reopens after saving', async ({ page }) => {
  await prepare(page, 'text');
  const text = 'Uma frase que quero conservar.\n'.repeat(40);
  await page.locator('.label-field').fill(text);
  await button(page, 'Guardar').click();
  await expect.poll(() => page.evaluate(async () => {
    const app = window.__garatuja!.app;
    return (await app.storage.get(app.store.get().project.id))?.pages[0].writingDraft?.text;
  })).toBe(text);
  await page.reload();
  await expect(page.locator('.label-field')).toHaveValue(text);
  await expect(page.locator('.label-field')).toBeFocused();
});

for (const tool of ['text', 'label'] as const) {
  for (const cancel of ['escape', 'button']) {
    test(`${tool} cancellation by ${cancel} can be undone and redone`, async ({ page }) => {
      await prepare(page, tool);
      if (cancel === 'escape') await page.keyboard.press('Escape');
      else await button(page, 'Cancelar').click();
      await expect(page.locator('.label-field')).toBeHidden();
      await button(page, 'Desfazer').click();
      await expect(page.locator('.label-field')).toHaveValue('Frase por assentar');
      await button(page, 'Refazer').click();
      await expect(page.locator('.label-field')).toBeHidden();
    });
  }
}

for (const tool of ['stamp', 'fill', 'magic']) {
  test(`${tool} settles on one fixed click`, async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__garatuja));
    await page.evaluate(tool => {
      const app = window.__garatuja!.app;
      app.configure({ fixedClick: true });
      app.chooseTool(tool);
      if (tool === 'magic') { app.setOption('effect', 'negative'); app.setOption('whole', true); }
    }, tool);
    await page.locator('.sheet').click();
    await expect(button(page, 'Desfazer')).not.toHaveAttribute('aria-disabled', 'true');
    await button(page, 'Pintar').click();
    expect(await page.evaluate(() => window.__garatuja!.app.surface.canUndo)).toBe(true);
  });
}

for (const tool of tools) {
  for (const via of ['button', 'shortcut']) {
    test(`first undo cancels ${tool} via ${via} and preserves previous ink`, async ({ page }) => {
      await prepare(page, tool, true);
      const pixel = () => page.evaluate(() => window.__garatuja!.pixel(352, 336).slice(0, 3));
      const undo = async () => {
        if (via === 'shortcut') {
          await page.locator('.sheet').focus();
          await page.keyboard.press('Control+z');
        } else await button(page, 'Desfazer').click();
      };
      await undo();
      await expect.poll(pixel).toEqual([41, 42, 51]);
      await expect(page.locator('.label-field')).toBeHidden();
      if (tool === 'text' || tool === 'label') {
        await button(page, 'Refazer').click();
        await expect(page.locator('.label-field')).toHaveValue('Frase por assentar');
        await undo();
      }
      await undo();
      await expect.poll(pixel).toEqual([255, 255, 255]);
    });
  }
}

for (const name of ['Só texto', 'Narrador']) {
  test(`fixed click opens the ${name} label on the first tap`, async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__garatuja));
    await page.evaluate(() => window.__garatuja!.app.configure({ fixedClick: true }));
    await button(page, 'Legenda').click();
    await button(page, name).click();
    await page.locator('.sheet').click({ position: { x: 250, y: 180 } });
    await expect(page.locator('.label-field')).toBeFocused();
  });
}

test('page writing and work details are reversible as sessions on the page', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
  await page.locator('.sheet').click({ position: { x: 180, y: 220 } });
  const writing = button(page, 'O meu texto');
  const text = page.getByRole('textbox', { name: 'O meu texto' });
  await writing.click();
  await text.fill('Texto da turma');
  await button(page, 'Fechar').click();
  await writing.click();
  await text.fill('Uma frase intermédia');
  await text.fill('');
  await button(page, 'Fechar').click();
  await button(page, 'Desfazer').click();
  await expect(page.locator('.writing-preview')).toHaveText('Texto da turma');
  await button(page, 'Refazer').click();
  await expect(page.locator('.writing-preview')).toHaveText('Escreve aqui o teu texto');
  await page.locator('.work-card').click();
  await page.getByRole('textbox', { name: 'Título' }).fill('Na escola');
  await page.getByRole('textbox', { name: 'Autor' }).fill('Ana');
  await page.getByRole('textbox', { name: 'Para quem é?' }).fill('A turma');
  await button(page, 'Pronto').click();
  const details = () => page.evaluate(() => {
    const { title, author, audience } = window.__garatuja!.app.store.get().project;
    return [title, author, audience];
  });
  await button(page, 'Desfazer').click();
  expect(await details()).toEqual(['', '', '']);
  await button(page, 'Refazer').click();
  expect(await details()).toEqual(['Na escola', 'Ana', 'A turma']);
});

test('closing page writing records it before an immediate mark', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
  await button(page, 'O meu texto').click();
  await page.getByRole('textbox', { name: 'O meu texto' }).fill('Cheguei à ponte.');
  for (const close of ['Fechar', 'Escape']) {
    if (close === 'Escape') {
      await button(page, 'O meu texto').click();
      await page.getByRole('textbox', { name: 'O meu texto' }).fill('Atravessei a ponte.');
    }
    // Run both normal entry points in one task, before a queued native close event.
    await page.evaluate(close => {
      const dialog = document.querySelector('dialog[open]');
      if (!(dialog instanceof HTMLDialogElement)) throw new Error('Missing writing dialog');
      if (close === 'Escape') dialog.requestClose();
      else dialog.querySelector('button')?.click();
      const { input } = window.__garatuja!.app;
      input.drawWithKeyboard(new KeyboardEvent('keydown', { key: 'Enter' }));
      input.drawWithKeyboard(new KeyboardEvent('keydown', { key: 'Enter' }));
    }, close);
    const pixel = () => page.evaluate(() => window.__garatuja!.app.surface.ctx.getImageData(800, 600, 1, 1).data[0]);
    expect(await pixel()).toBeLessThan(100);
    await button(page, 'Desfazer').click();
    expect(await pixel()).toBe(255);
    await expect(page.locator('.writing-preview')).toContainText(close === 'Escape' ? 'Atravessei a ponte.' : 'Cheguei à ponte.');
    await button(page, 'Desfazer').click();
    await expect(page.locator('.writing-preview')).toContainText('Escreve aqui o teu texto');
  }
});
