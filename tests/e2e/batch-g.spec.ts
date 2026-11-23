import { expect, test, type Page } from '@playwright/test';

const white = [255, 255, 255, 255];

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Pintar', exact: true })).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__garatuja && window.__garatujaStarters));
}

const read = (page: Page, x: number, y: number) => page.evaluate(([x, y]) => window.__garatuja?.pixel(x, y), [x, y]);
const projectId = (page: Page) => page.evaluate(() => window.__garatuja?.app.store.get().project.id);
const choose = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();

async function newWork(page: Page, model: string, title?: string) {
  await choose(page, 'Novo');
  const dialog = page.getByRole('dialog', { name: 'Novo trabalho' });
  await dialog.locator(`[data-starter="${model}"]`).click();
  await dialog.getByRole('button', { name: 'Começar' }).click();
  await expect(dialog).toHaveCount(0);
  if (title) await page.getByRole('textbox', { name: 'Título' }).fill(title);
}

const numbers: Record<string, number> = { três: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9 };

async function enterTeacherArea(page: Page) {
  await choose(page, 'Definições');
  const adult = page.getByRole('button', { name: 'Adulto' });
  const box = await adult.boundingBox();
  if (!box) throw new Error('Missing adult button');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3300);
  await page.mouse.up();
  const gate = page.getByRole('dialog', { name: 'Área do adulto' });
  await expect(gate).toBeVisible();
  const [a, b] = (await gate.locator('strong').innerText()).split(' mais ');
  await gate.getByRole('textbox').fill(String(numbers[a] + numbers[b]));
  await gate.getByRole('button', { name: 'Entrar' }).click();
  return page.getByRole('dialog', { name: 'Área do professor' });
}

test('Novo creates a work from every template and keeps the previous one', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await page.getByRole('textbox', { name: 'Título' }).fill('O primeiro');
  const first = await projectId(page);
  const ids = await page.evaluate(() => window.__garatujaStarters?.ids() ?? []);
  expect(ids.length).toBeGreaterThanOrEqual(25);
  await choose(page, 'Novo');
  const dialog = page.getByRole('dialog', { name: 'Novo trabalho' });
  await expect(dialog.getByText('fica guardado na galeria')).toBeVisible();
  await expect(dialog.getByRole('toolbar', { name: 'Cor do papel' }).getByRole('button')).toHaveCount(13);
  await dialog.getByRole('button', { name: 'Rosa' }).click();
  await dialog.getByRole('button', { name: 'Liso' }).click();
  await dialog.getByRole('button', { name: 'Começar' }).click();
  await expect(page.getByRole('status').first()).toContainText('Guardei o trabalho anterior');
  expect(await read(page, 800, 600)).toEqual([249, 211, 223, 255]);
  const seen = new Set([first, await projectId(page)]);
  for (const id of ids) {
    await newWork(page, id);
    seen.add(await projectId(page));
    const corner = await read(page, 4, 4);
    expect(corner?.[3]).toBe(255);
    if (id.startsWith('scene-')) expect(await read(page, 800, 60)).not.toEqual([249, 211, 223, 255]);
  }
  expect(seen.size).toBe(ids.length + 2);
  const saved = await page.evaluate(async () => (await window.__garatuja?.app.storage.list())?.map(project => project.title));
  expect(saved).toContain('O primeiro');
  expect(errors).toEqual([]);
});

test('a comic template limits the fill to one panel', async ({ page }) => {
  await ready(page);
  await newWork(page, 'comic-4');
  await choose(page, 'Encher');
  await choose(page, 'Azul');
  const sheet = await page.getByRole('group', { name: 'Folha de desenho' }).boundingBox();
  if (!sheet) throw new Error('Missing sheet');
  await page.mouse.click(sheet.x + sheet.width * 400 / 1600, sheet.y + sheet.height * 300 / 1200);
  expect(await read(page, 400, 300)).toEqual([73, 125, 187, 255]);
  expect(await read(page, 1200, 300)).toEqual(white);
});

test('gallery opens, duplicates, deletes and undoes', async ({ page }) => {
  await ready(page);
  await page.getByRole('textbox', { name: 'Título' }).fill('Mar');
  await page.getByRole('textbox', { name: 'Autor' }).fill('Rui');
  await newWork(page, 'scene-forest', 'Floresta');
  await newWork(page, 'cycle', 'Ciclo da água');
  await choose(page, 'Abrir');
  const gallery = page.getByRole('dialog', { name: 'Abrir trabalho' });
  const cards = gallery.getByRole('listitem');
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toContainText('Ciclo da água');
  await expect(cards.last()).toContainText('Mar');
  await expect(cards.last().locator('.gallery-pages')).toHaveAttribute('aria-label', '1 página');

  await cards.filter({ hasText: 'Floresta' }).getByRole('button', { name: 'Duplicar' }).click();
  await expect(cards).toHaveCount(4);
  await expect(cards.filter({ hasText: 'Floresta' })).toHaveCount(2);

  await cards.filter({ hasText: 'Mar' }).getByRole('button', { name: 'Apagar' }).click();
  await expect(gallery.getByText('Apagar este trabalho?')).toBeVisible();
  await gallery.getByRole('button', { name: 'Não' }).click();
  await expect(cards).toHaveCount(4);
  await cards.filter({ hasText: 'Mar' }).getByRole('button', { name: 'Apagar' }).click();
  await gallery.getByRole('button', { name: 'Sim, apagar' }).click();
  await expect(cards).toHaveCount(3);
  await expect(gallery.getByText('Apagaste «Mar».')).toBeVisible();
  await gallery.getByRole('button', { name: 'Anular' }).click();
  await expect(cards).toHaveCount(4);

  await cards.filter({ hasText: 'Mar' }).getByRole('button', { name: 'Apagar' }).click();
  await gallery.getByRole('button', { name: 'Sim, apagar' }).click();
  await expect(cards).toHaveCount(3);
  await page.keyboard.press('Escape');
  const toast = page.locator('.toast').filter({ hasText: 'Apagaste «Mar».' });
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'Anular' }).click();

  await choose(page, 'Abrir');
  await gallery.getByRole('button', { name: 'Mar, Rui, 1 página' }).click();
  await expect(gallery).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Título' })).toHaveValue('Mar');
  await expect(page.getByRole('textbox', { name: 'Autor' })).toHaveValue('Rui');
});

test('deleting the open work moves to a fresh sheet', async ({ page }) => {
  await ready(page);
  await page.getByRole('textbox', { name: 'Título' }).fill('Atual');
  await choose(page, 'Abrir');
  const gallery = page.getByRole('dialog', { name: 'Abrir trabalho' });
  await gallery.getByRole('button', { name: 'Apagar' }).click();
  await gallery.getByRole('button', { name: 'Sim, apagar' }).click();
  await expect(gallery.getByText('Toca')).toHaveCount(0);
  await expect(gallery.getByRole('listitem')).toHaveCount(1);
  await expect(gallery.getByRole('listitem')).not.toContainText('Atual');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox', { name: 'Título' })).toHaveValue('');
});

test('the gallery has a friendly empty state', async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    const app = window.__garatuja?.app;
    for (const project of await app?.storage.list() ?? []) await app?.storage.remove(project.id);
  });
  await page.evaluate(() => window.__garatuja?.app.openScreen('gallery.open'));
  // The current work is saved again when the gallery opens; remove it to see the empty state.
  const gallery = page.getByRole('dialog', { name: 'Abrir trabalho' });
  await expect(gallery.getByRole('listitem')).toHaveCount(1);
  await gallery.getByRole('button', { name: 'Apagar' }).click();
  await gallery.getByRole('button', { name: 'Sim, apagar' }).click();
  await expect(gallery.getByRole('listitem')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const app = window.__garatuja?.app;
    for (const project of await app?.storage.list() ?? []) {
      if (project.id !== app?.store.get().project.id) await app?.storage.remove(project.id);
    }
  });
  await page.evaluate(() => window.__garatuja?.app.openScreen('gallery.open'));
  await expect(gallery.getByRole('listitem')).toHaveCount(1);
});

test('imports a picture as the paper of a new work, only when allowed', async ({ page }) => {
  await ready(page);
  const before = await projectId(page);
  await choose(page, 'Abrir');
  const chooser = page.waitForEvent('filechooser');
  await choose(page, 'Importar imagem');
  await (await chooser).setFiles('public/icons/pingo-192.png');
  await expect(page.getByRole('dialog', { name: 'Abrir trabalho' })).toHaveCount(0);
  expect(await projectId(page)).not.toBe(before);
  expect(await read(page, 100, 600)).toEqual(white);
  expect(await read(page, 800, 760)).not.toEqual(white);
  await choose(page, 'Borracha');
  const sheet = await page.getByRole('group', { name: 'Folha de desenho' }).boundingBox();
  if (!sheet) throw new Error('Missing sheet');
  const picture = await read(page, 800, 760);
  await page.mouse.click(sheet.x + sheet.width / 2, sheet.y + sheet.height * 760 / 1200);
  expect(await read(page, 800, 760)).toEqual(picture);

  await page.evaluate(() => window.__garatuja?.app.configure({ allowImport: false }));
  await choose(page, 'Abrir');
  await expect(page.getByRole('button', { name: 'Importar imagem' })).toHaveCount(0);
});

test('Guardar confirms calmly and invites title, author and audience', async ({ page }) => {
  await ready(page);
  await choose(page, 'Guardar');
  await expect(page.locator('#pingo-hint')).toHaveText('O teu trabalho está guardado no dispositivo.');
  const invite = page.getByRole('dialog', { name: 'Guardado no dispositivo' });
  await expect(invite).toBeVisible();
  await invite.getByRole('textbox', { name: 'Título' }).fill('O vulcão');
  await invite.getByRole('button', { name: 'O jornal' }).click();
  await expect(invite.getByRole('textbox', { name: 'Para quem é?' })).toHaveValue('O jornal');
  await expect(invite.getByRole('button', { name: 'O jornal' })).toHaveAttribute('aria-pressed', 'true');
  await invite.getByRole('button', { name: 'Agora não' }).click();
  await expect(page.getByRole('textbox', { name: 'Título' })).toHaveValue('O vulcão');
  expect(await page.evaluate(() => window.__garatuja?.app.store.get().project.audience)).toBe('O jornal');
  await choose(page, 'Guardar');
  await expect(invite).toHaveCount(0);
});

test('the teacher area only opens through the adult gate', async ({ page }) => {
  await ready(page);
  await choose(page, 'Definições');
  const settings = page.getByRole('dialog', { name: 'Definições' });
  await expect(settings.getByRole('checkbox')).toHaveCount(0);
  await settings.getByRole('button', { name: 'Adulto' }).click();
  await expect(page.locator('#pingo-hint')).toContainText('Mantém premido');
  await expect(page.getByRole('dialog', { name: 'Área do adulto' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  // A wrong answer keeps the door closed.
  await choose(page, 'Definições');
  const adult = page.getByRole('button', { name: 'Adulto' });
  await adult.focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(3300);
  await page.keyboard.up('Space');
  const gate = page.getByRole('dialog', { name: 'Área do adulto' });
  await expect(gate.locator('strong')).toHaveText(/^\p{L}+ mais \p{L}+$/u);
  await gate.getByRole('textbox').fill('99');
  await gate.getByRole('button', { name: 'Entrar' }).click();
  await expect(gate.getByRole('alert')).toContainText('Experimenta outra vez');
  await page.keyboard.press('Escape');

  const teacher = await enterTeacherArea(page);
  await expect(teacher).toContainText('Tudo fica neste dispositivo');
  await expect(teacher).toContainText('Espaço usado');
  await teacher.getByRole('textbox', { name: 'Nome da turma' }).fill('3.º B');
  await expect(page.locator('.class-name')).toHaveText('3.º B');
  await teacher.getByRole('checkbox', { name: 'Clique fixo' }).check();
  await teacher.getByRole('checkbox', { name: 'Permitir imprimir' }).uncheck();
  await expect(page.getByRole('button', { name: 'Imprimir' })).toHaveCount(0);
  const download = page.waitForEvent('download');
  await teacher.getByRole('button', { name: 'Exportar todos os trabalhos' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^garatuja-todos-os-trabalhos-\d{4}-\d{2}-\d{2}\.json$/);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__garatuja));
  const settingsAfter = await page.evaluate(() => window.__garatuja?.app.store.get().settings);
  expect(settingsAfter).toMatchObject({ fixedClick: true, allowPrint: false, className: '3.º B' });
});

test('high contrast and left hand apply from the teacher area; child settings persist', async ({ page }) => {
  await ready(page);
  const teacher = await enterTeacherArea(page);
  await teacher.getByRole('checkbox', { name: 'Alto contraste' }).check();
  await teacher.getByRole('checkbox', { name: 'Mão esquerda' }).check();
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveClass(/high-contrast/);
  const panel = await page.locator('.panel.options').evaluate(element => getComputedStyle(element).backgroundColor);
  expect(panel).toBe('rgb(255, 255, 255)');
  const sheet = await page.getByRole('group', { name: 'Folha de desenho' }).boundingBox();
  const tools = await page.getByRole('complementary', { name: 'Ferramentas' }).boundingBox();
  if (!sheet || !tools) throw new Error('Missing layout');
  expect(tools.x).toBeGreaterThan(sheet.x + sheet.width - 1);

  await choose(page, 'Definições');
  const settings = page.getByRole('dialog', { name: 'Definições' });
  await settings.getByRole('button', { name: 'Cursor grande' }).click();
  await settings.getByRole('button', { name: 'Som', exact: true }).click();
  await expect(settings.getByRole('button', { name: 'Som', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await settings.getByRole('button', { name: 'Interface simples' }).click();
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__garatuja));
  await expect(page.locator('html')).toHaveClass(/large-cursor/);
  await expect(page.getByRole('button', { name: 'Som ligado' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Interface simples' })).toHaveAttribute('aria-pressed', 'true');
});

test('help sheet opens with F1 and the help button', async ({ page }) => {
  await ready(page);
  await page.keyboard.press('F1');
  const help = page.getByRole('dialog', { name: 'Como se usa' });
  await expect(help).toBeVisible();
  await expect(help.getByRole('listitem').filter({ hasText: 'Pintar' })).toBeVisible();
  await expect(help.getByRole('button', { name: 'Ouvir' })).toBeFocused();
  await page.keyboard.press('Escape');
  await choose(page, 'Ajuda');
  await expect(help).toBeVisible();
});

test('reading aloud says the tool and colour names with a Portuguese voice', async ({ page }) => {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { spoken: string[] }).spoken = spoken;
    const voices = [{ lang: 'pt-BR', localService: true, name: 'BR' }, { lang: 'pt-PT', localService: true, name: 'PT' }];
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: () => voices, cancel() {}, addEventListener() {},
        speak(utterance: SpeechSynthesisUtterance) { spoken.push(`${utterance.voice?.lang}|${utterance.text}`); },
      },
    });
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      lang = ''; voice?: unknown; rate = 1; constructor(public text: string) {}
    };
  });
  await ready(page);
  await page.evaluate(() => window.__garatuja?.app.configure({ readAloud: true }));
  await choose(page, 'Borracha');
  await choose(page, 'Vermelho');
  const spoken = await page.evaluate(() => (window as unknown as { spoken: string[] }).spoken);
  expect(spoken[0]).toMatch(/^pt-PT\|Borracha\. /);
  expect(spoken).toContain('pt-PT|Vermelho');
});

test('text meets WCAG AA contrast in the normal and high-contrast looks', async ({ page }) => {
  await ready(page);
  const measure = () => page.evaluate(() => {
    const channel = (value: number) => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const parse = (color: string) => (color.match(/[\d.]+/g) ?? []).map(Number);
    const luminance = ([r, g, b]: number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    const background = (element: Element | null): number[] => {
      for (let node = element; node; node = node.parentElement) {
        const [r, g, b, a = 1] = parse(getComputedStyle(node).backgroundColor);
        if (a > 0.5) return [r, g, b];
      }
      return [246, 237, 223];
    };
    const results: { text: string; ratio: number; large: boolean }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element || !node.textContent?.trim() || !element.getClientRects().length) continue;
      if (element.closest('button:disabled, [hidden], .print-only, script, style')) continue;
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const fg = luminance(parse(style.color));
      const bg = luminance(background(element));
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      const size = parseFloat(style.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      results.push({ text: node.textContent.trim().slice(0, 30), ratio: Math.round(ratio * 100) / 100, large });
    }
    return results;
  });
  const failing = (results: { ratio: number; large: boolean }[]) => results.filter(item => item.ratio < (item.large ? 3 : 4.5));
  const normal = await measure();
  await choose(page, 'Abrir');
  await expect(page.getByRole('dialog', { name: 'Abrir trabalho' })).toBeVisible();
  const gallery = await measure();
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__garatuja?.app.configure({ highContrast: true }));
  const contrast = await measure();
  const lowest = (results: { ratio: number }[]) => Math.min(...results.map(item => item.ratio));
  console.log(`WCAG contrast — normal: min ${lowest(normal)} over ${normal.length} texts; gallery: min ${lowest(gallery)}; high contrast: min ${lowest(contrast)}`);
  expect(failing(normal)).toEqual([]);
  expect(failing(gallery)).toEqual([]);
  expect(failing(contrast)).toEqual([]);
  expect(lowest(contrast)).toBeGreaterThanOrEqual(lowest(normal));
});

test('the build precaches every asset, sets a strict CSP and links nothing external', async ({ page, request }) => {
  const precache = await (await request.get('/precache.json')).json() as { files: string[] };
  const html = await (await request.get('/')).text();
  expect(html).toContain('Content-Security-Policy');
  expect(html).toContain("default-src &#39;self&#39;");
  expect(html.replace(/http:\/\/www\.w3\.org\/[\w/]+/g, '')).not.toMatch(/https?:\/\//);
  for (const file of ['./', './manifest.webmanifest', './icons/pingo-192.png', './icons/pingo-512.png', './icons/pingo-maskable-512.png']) {
    expect(precache.files).toContain(file);
  }
  expect(precache.files.some(file => file.endsWith('.woff2'))).toBe(true);
  const scripts = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map(match => match[1]);
  for (const asset of scripts) expect(precache.files).toContain(asset);
  const manifest = await (await request.get('/manifest.webmanifest')).json() as { icons: { purpose: string; sizes: string }[] };
  expect(manifest.icons.map(icon => `${icon.sizes}:${icon.purpose}`)).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']));

  const violations: string[] = [];
  page.on('console', message => { if (/Content Security Policy/i.test(message.text())) violations.push(message.text()); });
  await ready(page);
  await choose(page, 'Novo');
  await expect(page.getByRole('dialog', { name: 'Novo trabalho' })).toBeVisible();
  await page.keyboard.press('Escape');
  await choose(page, 'Abrir');
  await expect(page.getByRole('dialog', { name: 'Abrir trabalho' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(() => window.__garatuja?.app.configure({ largeCursor: true }));
  await choose(page, 'Carimbo');
  expect(violations).toEqual([]);
});

test('works offline after the first visit, including new dialogs', async ({ page, context }) => {
  await ready(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
  });
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__garatuja));
  await newWork(page, 'scene-space');
  await choose(page, 'Abrir');
  await expect(page.getByRole('dialog', { name: 'Abrir trabalho' }).getByRole('listitem')).toHaveCount(2);
  const fonts = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px Andika'); });
  expect(fonts).toBe(true);
});
