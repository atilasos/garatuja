import { fillDetails } from './work-details';
import { expect, test, type Page } from '@playwright/test';

/** Documentation screenshots: run with GARATUJA_CAPTURE_SCREENS=1. */
test.setTimeout(120_000);
test.skip(process.env.GARATUJA_CAPTURE_SCREENS !== '1', 'Screenshots are only captured on request');

const sizes = [[1366, 768], [1024, 768]] as const;
const numbers: Record<string, number> = { três: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9 };

async function ready(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja && window.__garatujaStarters));
  await page.evaluate(() => document.fonts.ready);
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(150);
  await page.screenshot({ path: `docs/screens/batch-g-${name}.png` });
}

async function seed(page: Page) {
  const works: [string, string, string, string][] = [
    ['scene-sea', 'O polvo Octávio', 'Marta', '#ffffff'],
    ['cycle', 'O ciclo da água', 'Tomás', '#d4ebf8'],
    ['comic-4', 'A grande corrida', 'Inês e Rui', '#ffffff'],
    ['scene-night', 'A coruja acordada', 'Leonor', '#ffffff'],
    ['book-cover', 'O livro da turma', 'Turma B', '#fdf0b0'],
    ['diagram', 'As partes da flor', 'Afonso', '#ffffff'],
  ];
  for (const [model, title, author, color] of works) {
    await page.evaluate(async ([model, title, author, color, index]) => {
      const app = window.__garatuja?.app;
      if (!app) return;
      app.openScreen('gallery.new');
      await new Promise(resolve => setTimeout(resolve, 50));
      const dialog = document.querySelector('dialog[open]');
      dialog?.querySelector<HTMLButtonElement>(`[aria-label="${color === '#ffffff' ? 'Branco' : color === '#d4ebf8' ? 'Céu' : 'Amarelo'}"]`)?.click();
      dialog?.querySelector<HTMLButtonElement>(`[data-starter="${model}"]`)?.click();
      [...dialog?.querySelectorAll('button') ?? []].find(button => button.textContent?.includes('Começar'))?.click();
      await new Promise(resolve => setTimeout(resolve, 400));
      app.documents.editProject({ title, author, audience: 'A turma' });
      if (Number(index) % 2) await app.documents.add();
      await app.documents.save();
    }, [model, title, author, color, String(works.findIndex(work => work[1] === title))]);
  }
}

for (const [width, height] of sizes) {
  test(`batch G screens at ${width}×${height}`, async ({ page }) => {
    await ready(page, width, height);
    await page.getByRole('button', { name: 'Novo', exact: true }).click();
    await page.getByRole('dialog', { name: 'Novo trabalho' }).getByRole('button', { name: 'Céu', exact: true }).click();
    await shot(page, `new-${width}x${height}`);
    await page.getByRole('dialog', { name: 'Novo trabalho' }).locator('[data-starter="cycle"]').scrollIntoViewIfNeeded();
    await shot(page, `new-scrolled-${width}x${height}`);
    await page.keyboard.press('Escape');

    await seed(page);
    await page.getByRole('button', { name: 'Abrir', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Abrir trabalho' }).getByRole('listitem')).toHaveCount(7, { timeout: 15_000 });
    await shot(page, `gallery-${width}x${height}`);
    await page.getByRole('dialog', { name: 'Abrir trabalho' }).getByRole('button', { name: 'Apagar' }).nth(1).click();
    await shot(page, `gallery-confirm-${width}x${height}`);
    await page.getByRole('button', { name: 'Sim, apagar' }).click();
    await shot(page, `gallery-undo-${width}x${height}`);
    await page.getByRole('button', { name: 'Anular' }).click();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Novo', exact: true }).click();
    await page.getByRole('dialog', { name: 'Novo trabalho' }).locator('[data-starter="scene-meadow"]').click();
    await page.getByRole('button', { name: 'Começar' }).click();
    await fillDetails(page, { title: 'A minha horta' });
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    const invite = page.getByRole('dialog', { name: 'Guardado no dispositivo' });
    await invite.getByRole('button', { name: 'A turma', exact: true }).click();
    await shot(page, `save-${width}x${height}`);
    await invite.getByRole('button', { name: 'Agora não' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: 'Definições' }).click();
    await shot(page, `settings-${width}x${height}`);
    const adult = page.getByRole('button', { name: 'Adulto' });
    const box = await adult.boundingBox();
    if (!box) throw new Error('Missing adult button');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(3300);
    await page.mouse.up();
    const gate = page.getByRole('dialog', { name: 'Área do adulto' });
    await shot(page, `gate-${width}x${height}`);
    const [a, b] = (await gate.locator('strong').innerText()).split(' mais ');
    await gate.getByRole('textbox').fill(String(numbers[a] + numbers[b]));
    await gate.getByRole('button', { name: 'Entrar' }).click();
    const teacher = page.getByRole('dialog', { name: 'Área do professor' });
    await teacher.getByRole('textbox', { name: 'Nome da turma' }).fill('3.º B');
    await shot(page, `teacher-${width}x${height}`);
    await teacher.getByRole('checkbox', { name: 'Alto contraste' }).check();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Pintar', exact: true }).focus();
    await shot(page, `contrast-${width}x${height}`);
    await page.keyboard.press('F1');
    await shot(page, `help-contrast-${width}x${height}`);
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.__garatuja?.app.configure({ highContrast: false }));
    await page.keyboard.press('F1');
    await shot(page, `help-${width}x${height}`);
  });
}

test('batch G starters contact sheet', async ({ page }) => {
  await ready(page, 1366, 768);
  const sheet = await page.evaluate(() => {
    const hooks = window.__garatujaStarters;
    if (!hooks) throw new Error('Missing hooks');
    return hooks.ids().map(id => ({ id, src: hooks.render(id, '#ffffff', 400, 300) }));
  });
  await page.setViewportSize({ width: 1600, height: 1400 });
  await page.evaluate(items => {
    const grid = document.createElement('div');
    grid.className = 'contact-sheet';
    for (const item of items) {
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = '';
      const caption = document.createElement('figcaption');
      caption.textContent = item.id;
      figure.append(img, caption);
      grid.append(figure);
    }
    document.body.replaceChildren(grid);
    for (const [selector, value] of [['display', 'grid'], ['grid-template-columns', 'repeat(5, 1fr)'], ['gap', '14px'], ['padding', '16px'], ['background', '#f6eddf']] as const) {
      grid.style.setProperty(selector, value);
    }
    for (const img of grid.querySelectorAll('img')) {
      img.style.setProperty('width', '100%');
      img.style.setProperty('box-shadow', '0 0 0 1px #b9a998');
    }
    for (const figure of grid.querySelectorAll('figure')) figure.style.setProperty('margin', '0');
  }, sheet);
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'docs/screens/batch-g-starters.png', fullPage: true });
});
