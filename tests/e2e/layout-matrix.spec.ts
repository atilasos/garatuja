import { expect, test, type Locator } from '@playwright/test';
import type { Settings } from '../../src/core/store';

const formats = [
  [1024, 768, 580, 620], [1280, 800, 700, 740], [1366, 768, 700, 740], [1920, 1080, 1100, 1100],
  [768, 1024, 740, 740], [810, 1080, 780, 780], [834, 1194, 800, 800], [390, 844, 330, 330],
];
const modes: [string, Partial<Settings>][] = [
  ['normal', {}], ['uppercase', { uppercase: true }], ['contrast', { highContrast: true }],
  ['uppercase and contrast', { uppercase: true, highContrast: true }], ['left-handed', { leftHanded: true }],
  ['simple', { level: 1 }],
];

for (const [width, height, minOpen, minClosed] of formats) {
  for (const [mode, preferences] of modes) {
    test(`desk matrix ${width}×${height}, ${mode}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.waitForFunction(() => Boolean(window.__garatuja));
      await page.evaluate(preferences => window.__garatuja?.app.configure(preferences), preferences);
      await page.evaluate(() => document.fonts.ready);
      const ids = await page.locator('[data-tool]').evaluateAll(buttons => buttons.map(button => button.getAttribute('data-tool') ?? ''));
      expect(ids).toHaveLength(mode === 'simple' ? 8 : 10);
      for (const id of ids) {
        await page.evaluate(id => {
          const app = window.__garatuja?.app;
          document.querySelector<HTMLButtonElement>(`[data-tool="${id}"]`)?.click();
          if (id === 'magic') app?.setOption('effect', 'negative');
          window.scrollTo(0, 0);
        }, id);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const issues = await page.evaluate(({ minOpen, width, height }) => {
          const issues: string[] = [];
          const report = (condition: boolean, problem: string) => { if (condition) issues.push(problem); };
          const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
          const inside = (inner: DOMRect, outer: DOMRect) =>
            inner.left >= outer.left - 1 && inner.right <= outer.right + 1 &&
            inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
          const screen = new DOMRect(0, 0, width, height);
          const paper = box('.sheet');
          report(paper.width < minOpen - 1 || Math.abs(paper.width / paper.height - 4 / 3) > .01, `sheet ${paper.width}×${paper.height}`);
          report(document.documentElement.scrollWidth > width, 'horizontal page overflow');
          if (width >= 700 && width < height) report(box('.footer').bottom > height + 1, `portrait desk taller than the window (${box('.footer').bottom})`);
          for (const strip of document.querySelectorAll<HTMLElement>('.tool-deck, .feature-actions, .palette, .options-scroll, .options-fixed .option-categories')) {
            if (!strip.getClientRects().length) continue;
            const horizontal = getComputedStyle(strip).overflowX !== 'visible' && strip.scrollWidth > strip.clientWidth + 1;
            const vertical = getComputedStyle(strip).overflowY !== 'visible' && strip.scrollHeight > strip.clientHeight + 1;
            const cues = [...strip.parentElement!.querySelectorAll<HTMLElement>(':scope > .scroll-more-end')]
              .filter(cue => !cue.hidden && cue.previousElementSibling !== null);
            const end = (axis: string) => cues.some(cue => cue.classList.contains(`scroll-more-${axis}`) &&
              [...strip.parentElement!.children].indexOf(cue) > [...strip.parentElement!.children].indexOf(strip));
            if (horizontal && strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1) report(!end('x'), `no «more» cue on ${strip.className}`);
            if (vertical && strip.scrollTop + strip.clientHeight < strip.scrollHeight - 1) report(!end('y'), `no «more» cue below ${strip.className}`);
          }
          const thumbnail = box('.page-strip .page');
          report(!inside(thumbnail, box('.page-strip')), 'first page thumbnail clipped');
          for (const el of document.querySelectorAll<HTMLElement>('#app button, .options-fixed input[type=range]')) {
            if (!el.getClientRects().length) continue;
            const rect = el.getBoundingClientRect();
            const name = el.getAttribute('aria-label') ?? el.textContent;
            report(rect.width < 48 || rect.height < 48, `small target ${name} ${rect.width}×${rect.height}`);
            if (el.matches('.size-choice, .stamp-size, .stamp-transform, .stamp-angle-slider, .toggle-section .option-toggle') &&
                el.closest('.options-fixed') || el.closest('.history-actions') || ['Novo', 'Abrir', 'Guardar'].includes(name)) {
              report(!inside(rect, screen), `fixed control offscreen ${name}`);
            }
            const label = el.querySelector('.button-label');
            const node = label?.firstChild;
            if (!(node instanceof Text)) continue;
            const range = document.createRange();
            const area = el.matches('.page') ? undefined : el.querySelector('.icon, canvas, img, .paint-chip')?.getBoundingClientRect();
            for (const word of node.data.matchAll(/[^\s\p{Dash_Punctuation}]+/gu)) {
              const lines = new Set<number>();
              for (let i = word.index; i < word.index + word[0].length; i++) {
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                const measured = range.getBoundingClientRect();
                const lineHeight = parseFloat(getComputedStyle(label!).lineHeight);
                const char = new DOMRect(measured.x, measured.y + (measured.height - lineHeight) / 2, measured.width, lineHeight);
                if (!char.width) continue;
                lines.add(char.top);
                report(!inside(char, rect), `clipped label ${name}`);
                if (area) report(char.left < area.right - 1 && char.right > area.left + 1 &&
                  char.top < area.bottom - 1 && char.bottom > area.top + 1, `overlapping label ${name}`);
              }
              report(lines.size > 1, `split word ${word[0]} in ${name}`);
            }
          }
          const list = document.querySelector('.options-scroll');
          const first = list?.querySelector('.choice');
          if (list && first) {
            const choice = first.getBoundingClientRect();
            const hit = document.elementFromPoint(choice.left + choice.width / 2, choice.top + choice.height / 2);
            report(hit?.closest('button') !== first, 'first choice cannot receive clicks');
            const rect = first.getBoundingClientRect();
            report(!inside(rect, list.getBoundingClientRect()) || !inside(rect, screen),
              `first choice clipped ${first.textContent} at ${Math.round(rect.top)}–${Math.round(rect.bottom)}`);
            if (width >= 700 && width < height) {
              const second = [...list.querySelectorAll('.choice')].find(choice => {
                const other = choice.getBoundingClientRect();
                return other.top > rect.top && other.left < screen.right && other.left >= rect.left;
              });
              if (second) report(!inside(second.getBoundingClientRect(), list.getBoundingClientRect()) ||
                !inside(second.getBoundingClientRect(), screen), 'second row clipped');
            }
          }
          return [...new Set(issues)];
        }, { minOpen, width, height });
        expect.soft(issues, id).toEqual([]);
      }
      if (mode === 'normal' && process.env.GARATUJA_CAPTURE_SCREENS === '1' && [1280, 810, 834, 390].includes(width)) {
        await page.evaluate(() => {
          const app = window.__garatuja!.app;
          document.querySelector<HTMLButtonElement>('[data-tool="paint"]')?.click();
          app.documents.editText('A ribeira corre por baixo da ponte. Na margem há um salgueiro.');
        });
        await page.screenshot({ path: `docs/screens/final-${width}x${height}.png` });
      }
      await page.evaluate(() => window.__garatuja?.app.configure({ textCollapsed: true }));
      expect((await page.locator('.sheet').boundingBox())?.width).toBeGreaterThanOrEqual(minClosed - 1);
    });
  }
}

for (const [width, height] of formats) {
  test(`messages keep the sheet fixed and the work card and palette fit at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__garatuja));
    await page.evaluate(async () => {
      await document.fonts.ready;
      const app = window.__garatuja!.app;
      app.documents.editProject({ title: 'A ponte', author: 'Rui' });
      await app.documents.save();
    });
    const sheet = page.locator('.sheet');
    const bounds = await sheet.boundingBox();
    expect(bounds).toBeTruthy();
    for (const title of ['A ponte', 'A ponte da Lia']) {
      await page.evaluate(title => window.__garatuja!.app.documents.editProject({ title }), title);
      for (const field of ['.work-title', '.work-author']) {
        expect(await page.locator(field).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      }
    }
    for (const name of ['Conta-gotas', 'Misturar cor']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeInViewport({ ratio: 1 });
      const clear = await button.evaluate(el => {
        const { x, y, width, height } = el.getBoundingClientRect();
        return !el.closest('.palette') && document.elementFromPoint(x + width / 2, y + height / 2)?.closest('button') === el;
      });
      expect(clear).toBe(true);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => window.__garatuja!.app.confirm({ pt: 'Guardado em Os meus carimbos.', en: 'Saved to My stamps.' }));
    await expect(page.locator('.help .success-message')).toBeVisible();
    expect(await sheet.boundingBox()).toEqual(bounds);
    await page.evaluate(() => window.__garatuja!.app.notify({ pt: 'A ação precisa de mais espaço.', en: 'The action needs more space.' }));
    await expect(page.getByText('A ação precisa de mais espaço.')).toBeVisible();
    expect(await sheet.boundingBox()).toEqual(bounds);
    await page.evaluate(async () => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'projects') throw new DOMException('Quota', 'QuotaExceededError');
        return put.apply(this, args);
      };
      const { documents } = window.__garatuja!.app;
      documents.editText('Em memória.');
      await documents.save();
    });
    await expect(page.locator('#app .save-recovery')).toBeVisible();
    expect(await sheet.boundingBox()).toEqual(bounds);
  });
}

for (const [width, height] of formats) {
  for (const uppercase of [false, true]) {
    test(`lower-half keyboard and fixed dialog actions at ${width}×${height}, uppercase ${uppercase}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.waitForFunction(() => Boolean(window.__garatuja));
      await page.evaluate(uppercase => window.__garatuja!.app.configure({ screenKeyboard: true, uppercase }), uppercase);
      const board = page.getByRole('toolbar', { name: 'Teclado no ecrã' });
      const sheet = page.locator('.sheet');
      for (const [tool, kind, action] of [['text', '', 'Pousar'], ['label', 'text', 'Pronto'], ['label', 'speech', 'Pronto']]) {
        await page.evaluate(({ tool, kind }) => {
          const app = window.__garatuja!.app;
          app.chooseTool(tool);
          if (kind) app.setOption('type', kind);
          window.scrollTo(0, 0);
        }, { tool, kind });
        const size = await sheet.boundingBox();
        if (!size) throw new Error('Missing paper');
        await sheet.click({ position: { x: size.width * .35, y: size.height * .90 } });
        const field = page.locator('.label-field');
        const done = page.getByRole('button', { name: action, exact: true });
        const cancel = page.getByRole('button', { name: 'Cancelar', exact: true });
        await expect(board).toBeVisible();
        await expect(board).toHaveClass(/writing-keyboard-top/);
        await expect.poll(async () => {
          const keyboard = await board.boundingBox();
          if (!keyboard) return false;
          const bottom = keyboard.y + keyboard.height;
          const controls = await Promise.all([field.boundingBox(), done.boundingBox(), cancel.boundingBox()]);
          return controls.every(box => box && box.y >= bottom && box.y + box.height <= height);
        }).toBe(true);
        for (const key of ['Maiúsculas', 'Espaço', 'Apagar', 'Nova linha']) {
          const target = board.getByRole('button', { name: key, exact: true });
          await expect(target).toBeInViewport({ ratio: 1 });
          const box = await target.boundingBox();
          expect(box?.width).toBeGreaterThanOrEqual(48);
          expect(box?.height).toBeGreaterThanOrEqual(48);
        }
        await expectControlsFit(board);
        if (width === 390) await board.getByRole('button', { name: 'á ç 123' }).click();
        for (const key of (uppercase ? 'ÁÇ' : 'áç')) await board.getByRole('button', { name: key, exact: true }).click();
        for (const key of '0123456789ºª-:;—«»"()…') {
          const target = board.getByRole('button', { name: key, exact: true });
          await expect(target).toBeInViewport({ ratio: 1 });
          await target.click();
        }
        await expect(field).toHaveValue((uppercase ? 'ÁÇ' : 'áç') + '0123456789ºª-:;—«»"()…');
        await expectControlsFit(board);
        if (tool === 'text' && (width === 1366 && !uppercase || width === 390 && uppercase)) {
          const name = `final-teclado-em-baixo-${width}x${height}.png`;
          await page.screenshot({ path: process.env.GARATUJA_CAPTURE_SCREENS === '1' ? 'docs/screens/' + name : info.outputPath(name) });
        }
        await cancel.click();
        await expect(board).toHaveCount(0);
      }

      await page.getByRole('button', { name: 'Novo', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Novo trabalho' });
      const region = dialog.locator('.dialog-scroll');
      const footer = dialog.getByRole('button', { name: 'Começar' });
      await expect(footer).toBeInViewport({ ratio: 1 });
      const models = region.locator('.model-choice');
      for (const model of [models.first(), models.last()]) {
        await model.focus();
        await expect(model).toBeInViewport({ ratio: .95 });
        const bounds = await model.boundingBox();
        const start = await footer.boundingBox();
        expect(bounds && start && bounds.y + bounds.height < start.y).toBe(true);
        await expect(model).toBeEnabled();
      }
      await footer.click();
      await expect(dialog).toHaveCount(0);
    });
  }
}

for (const [width, rows] of [[1366, 3], [1024, 2]]) {
  test(`stamp controls leave ${rows} full rows of choices at ${width}×768`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__garatuja));
    await page.getByRole('button', { name: 'Carimbo', exact: true }).click();
    await page.getByRole('button', { name: 'Categorias', exact: true }).click();
    await page.getByRole('button', { name: 'Animais', exact: true }).click();
    const visibleRows = await page.locator('.stamp-gallery .stamp-tile').evaluateAll(items => {
      const limit = items[0].closest('.options-scroll')!.getBoundingClientRect();
      return new Set(items.map(item => item.getBoundingClientRect())
        .filter(box => box.bottom <= limit.bottom && box.top >= limit.top).map(box => box.top)).size;
    });
    expect(visibleRows).toBeGreaterThanOrEqual(rows);
    const alignment = await page.locator('.stamp-actions button').evaluateAll(items => new Set(items.map(item => item.getBoundingClientRect().top)).size);
    expect(alignment).toBe(1);
  });
}

test('the keyboard leaves room for a multiline field and its actions around mid-sheet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
  await page.evaluate(() => {
    const app = window.__garatuja!.app;
    app.configure({ screenKeyboard: true });
    app.chooseTool('text');
  });
  const sheet = page.locator('.sheet');
  const size = await sheet.boundingBox();
  if (!size) throw new Error('Missing paper');
  await sheet.click({ position: { x: size.width * .35, y: size.height * .50 } });
  const field = page.locator('.label-field');
  await field.fill('No meio da folha\nEscrevi duas linhas\nE ainda cabe outra.');
  const board = page.getByRole('toolbar', { name: 'Teclado no ecrã' });
  await expect.poll(async () => {
    const keyboard = await board.boundingBox();
    if (!keyboard) return false;
    const controls = [field, page.getByRole('button', { name: 'Pousar' }), page.getByRole('button', { name: 'Cancelar' })];
    const boxes = await Promise.all(controls.map(control => control.boundingBox()));
    return boxes.every(box => box && box.y >= 0 && box.y + box.height <= 768 &&
      (box.y + box.height <= keyboard.y || box.y >= keyboard.y + keyboard.height));
  }).toBe(true);
  const symbols = board.getByRole('button', { name: 'á ç 123' });
  await symbols.click();
  await board.getByRole('button', { name: '7', exact: true }).click();
  await expect(field).toHaveValue(/7$/);
  await page.getByRole('button', { name: 'Pousar' }).click();
  await expect(board).toHaveCount(0);
});

async function expectControlsFit(region: Locator) {
  const issues = await region.evaluate(root => {
    const issues = new Set<string>();
    const range = document.createRange();
    for (const control of root.querySelectorAll<HTMLElement>('button, input[type="range"], summary')) {
      if (!control.getClientRects().length) continue;
      const box = control.getBoundingClientRect();
      const name = control.getAttribute('aria-label') ?? control.textContent;
      if (box.width < 48 || box.height < 48) issues.add(`small target ${name} ${box.width}×${box.height}`);
      const label = control.querySelector('.button-label');
      const node = label?.firstChild;
      if (!(node instanceof Text) || !label || getComputedStyle(label).clipPath !== 'none') continue;
      // Page numbers are intentionally painted above the thumbnail.
      const icon = control.matches('.page') ? undefined : control.querySelector('.icon, img, canvas')?.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
      for (const word of node.data.matchAll(/[^\s\p{Dash_Punctuation}]+/gu)) {
        range.setStart(node, word.index);
        range.setEnd(node, word.index + word[0].length);
        const pieces = range.getClientRects();
        if (pieces.length > 1) issues.add(`split word ${word[0]} in ${name}`);
        for (const piece of pieces) {
          const top = piece.top + (piece.height - lineHeight) / 2;
          const bottom = top + lineHeight;
          if (piece.left < box.left - 1 || piece.right > box.right + 1 || top < box.top - 1 || bottom > box.bottom + 1) {
            issues.add(`clipped label ${name}`);
          }
          if (icon && piece.left < icon.right - 1 && piece.right > icon.left + 1 &&
            top < icon.bottom - 1 && bottom > icon.top + 1) issues.add(`overlapping label ${name}`);
        }
      }
    }
    return [...issues];
  });
  expect.soft(issues).toEqual([]);
}

for (const [width, height] of formats) {
  for (const [mode, preferences] of modes.slice(0, 3)) {
    test(`active tools and dialogs fit at ${width}×${height}, ${mode}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.waitForFunction(() => Boolean(window.__garatuja));
      await page.evaluate(async preferences => {
        const app = window.__garatuja!.app;
        app.configure(preferences);
        await document.fonts.ready;
        app.documents.editProject({ title: 'A ponte', author: 'Lia' });
        app.documents.editText('A Lia chegou ao Funchal.');
        await app.documents.add();
      }, preferences);
      const named = (name: string) => page.getByRole('button', { name, exact: true });
      const audit = async (name: string, region: Locator) => test.step(name, async () => {
        await expect(region).toBeVisible();
        await expectControlsFit(region);
      });
      const sheet = page.locator('.sheet');
      const tap = async (x: number, y: number) => {
        await sheet.scrollIntoViewIfNeeded();
        const box = (await sheet.boundingBox())!;
        await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
      };
      const drag = async (from: [number, number], to: [number, number]) => {
        await sheet.scrollIntoViewIfNeeded();
        const box = (await sheet.boundingBox())!;
        await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1]);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 4 });
        await page.mouse.up();
      };

      await named('Legenda').click();
      await named('Só texto').click();
      await tap(.43, .45);
      await page.locator('.label-field').fill('Onde passa a ribeira');
      await named('Pronto').click();
      await tap(.46, .45);
      await expect(named('Duplicar legenda')).toBeVisible();
      await audit('selected label', page.locator('.label-bar'));
      if (width === 1024 && mode === 'normal') {
        const name = 'final-legenda-selecionada-1024x768.png';
        await page.screenshot({ path: process.env.GARATUJA_CAPTURE_SCREENS === '1' ? 'docs/screens/' + name : info.outputPath(name) });
      }

      await named('Mover').click();
      await drag([.2, .2], [.55, .6]);
      await expect(named('Duplicar recorte')).not.toHaveAttribute('aria-disabled', 'true');
      await audit('floating cutout', page.locator('.options'));
      await named('Pousar').click();

      await named('Formas').click();
      await named('Rodar').click();
      await drag([.25, .3], [.52, .6]);
      await expect(page.locator('.hint')).toContainText('Agora aponta');
      await audit('shape awaiting rotation', page.locator('#app'));
      await page.keyboard.press('Escape');

      await named('Texto').click();
      await tap(.5, .55);
      await page.locator('.label-field').fill('A ponte');
      await audit('bitmap text editor', page.locator('.label-bar'));
      await named('Cancelar').click();

      const dialog = page.locator('dialog[open]').last();
      async function auditDialog(title: string) {
        await audit(title, dialog);
        await dialog.getByRole('button', { name: 'Fechar', exact: true }).first().click();
        await expect(dialog).toHaveCount(0);
      }
      for (const name of ['Novo', 'Abrir', 'O meu texto', 'Ler', 'Imprimir', 'Animar', 'Misturar cor']) {
        await named(name).click();
        await auditDialog(name);
      }
      await page.getByRole('button', { name: /^Dados do trabalho/ }).click();
      await auditDialog('Work details');
      await named('Apresentar à turma').click();
      await audit('Class presentation', dialog.locator('.book-reader'));
      for (let i = 0; i < 3; i++) await page.keyboard.press('PageDown');
      await expect(dialog.locator('.class-comment-form')).toBeVisible();
      await audit('Class comments', dialog.locator('.class-comments'));
      await dialog.getByRole('button', { name: 'Sair', exact: true }).click();
      await named('Abrir').click();
      await named('Diapositivos').click();
      await dialog.getByRole('button', { name: /^A ponte, Lia/ }).click();
      await named('Reproduzir seleção').click();
      await audit('Slideshow', dialog.locator('.book-reader'));
      await dialog.getByRole('button', { name: 'Sair', exact: true }).click();
      await named('Definições').click();
      await auditDialog('Settings');
      for (const [screen, title] of [
        ['help.show', 'Help'], ['credits.show', 'Credits'], ['teacher.gate', 'Adult gate'], ['teacher.panel', 'Teacher settings'],
      ]) {
        await page.evaluate(id => window.__garatuja!.app.openScreen(id), screen);
        await auditDialog(title);
      }
    });
  }
}
