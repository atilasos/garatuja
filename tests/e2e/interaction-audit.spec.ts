import { expect, test, type Page } from '@playwright/test';
import { answerAdultChallenge, openAdultGate } from './teacher-access';

const control = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__garatuja));
}

test('Done leaves a finished label untouched when changing the kind for the next label', async ({ page }) => {
  await ready(page);
  await control(page, 'Legenda').click();
  const paper = page.locator('.sheet');
  await paper.click({ position: { x: 180, y: 130 } });
  const field = page.locator('.label-field');
  await field.fill('Primeira legenda');
  await control(page, 'Pronto').click();
  await expect(control(page, 'Escrever')).toHaveCount(0);
  await control(page, 'Balão de fala').click();
  await paper.click({ position: { x: 550, y: 350 } });
  await expect(field).toBeFocused();
  await field.fill('Segunda legenda');
  await control(page, 'Pronto').click();
  expect(await page.evaluate(() => window.__garatuja!.app.documents.snapshot().pages[0].labels.map(label => [label.kind, label.text])))
    .toEqual([['callout', 'Primeira legenda'], ['balloon', 'Segunda legenda']]);
});

test('Page Down and the right arrow show every screen of writing before advancing the presentation', async ({ page }) => {
  await ready(page);
  await page.evaluate(async () => {
    const docs = window.__garatuja!.app.documents;
    docs.editText('Um parágrafo para ler antes de mudar de página.\n'.repeat(44) + 'Última frase.');
    await docs.add();
  });
  await control(page, 'Apresentar à turma').click();
  await expect(page.locator('.book-position')).toHaveText('Capa');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.book-position')).toHaveText('Página 1 de 2');
  const copy = page.locator('.book-copy');
  let frames = 0;
  for (; frames < 30; frames++) {
    const atBottom = await copy.evaluate(node => node.scrollTop + node.clientHeight >= node.scrollHeight - 1);
    if (atBottom) break;
    await page.keyboard.press(frames % 2 ? 'ArrowRight' : 'PageDown');
    await expect(page.locator('.book-position')).toHaveText('Página 1 de 2');
  }
  expect(frames).toBeGreaterThan(1);
  expect(frames).toBeLessThan(30);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.book-position')).toHaveText('Página 2 de 2');
});

test('uppercase is stored in child-authored fields and the writing preview has the text in its name', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__garatuja!.app.configure({ uppercase: true }));
  await page.locator('.work-card').click();
  await page.getByLabel('Título', { exact: true }).fill('ação');
  await page.getByLabel('Autor', { exact: true }).fill('Inês');
  await control(page, 'Pronto').click();
  await control(page, 'O meu texto').click();
  await page.getByRole('textbox', { name: 'O meu texto' }).fill('água na ribeira');
  await page.keyboard.press('Escape');
  await expect(page.locator('#page-writing-preview')).toHaveAccessibleName(/ÁGUA NA RIBEIRA/);
  expect(await page.evaluate(() => {
    const docs = window.__garatuja!.app.documents;
    const { title, author } = docs.snapshot();
    return [title, author, docs.page.text];
  })).toEqual(['AÇÃO', 'INÊS', 'ÁGUA NA RIBEIRA']);
});

test('teacher removes the PIN, restricts tools and accepts lowercase APAGAR in uppercase mode', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__garatuja!.app.configure({ uppercase: true }));
  await openAdultGate(page);
  await answerAdultChallenge(page);
  const teacher = page.getByRole('dialog', { name: 'Área do professor' });
  await teacher.getByLabel('PIN do adulto').fill('0123');
  await control(page, 'Definir PIN').click();
  await control(page, 'Remover PIN').click();
  expect(await page.evaluate(() => localStorage.getItem('garatuja.adultPin'))).toBeNull();
  const restricted = ['Carimbo', 'Magia', 'Texto', 'Legenda', 'Mover', 'Formas', 'Linhas', 'Encher'];
  for (const label of restricted) await teacher.getByRole('checkbox', { name: label, exact: true }).uncheck();
  await page.keyboard.press('Escape');
  await control(page, 'Definições').click();
  await control(page, 'Interface simples').click();
  await control(page, 'Interface completa').click();
  await page.keyboard.press('Escape');
  for (const label of restricted) await expect(control(page, label)).toHaveCount(0);
  await openAdultGate(page);
  await answerAdultChallenge(page);
  await control(page, 'Apagar todos os dados do dispositivo').click();
  await control(page, 'Continuar').click();
  await teacher.getByLabel('Escreve APAGAR').fill('apagar');
  await expect(control(page, 'Sim, apagar tudo')).toBeEnabled();
});

test('the optional keyboard edits sheet text and dialog fields with touch-sized Portuguese keys', async ({ page }) => {
  await ready(page);
  await control(page, 'Definições').click();
  await control(page, 'Teclado no ecrã').click();
  await page.getByLabel('Disposição do teclado').selectOption('qwerty');
  await page.keyboard.press('Escape');
  for (const tool of ['Texto', 'Legenda']) {
    await control(page, tool).click();
    await page.locator('.sheet').click({ position: { x: 240, y: 180 } });
    const board = page.getByRole('toolbar', { name: 'Teclado no ecrã' });
    await expect(board.getByRole('button').first()).toHaveAccessibleName('q');
    await board.getByRole('button', { name: 'Maiúsculas', exact: true }).click();
    const letter = board.getByRole('button', { name: 'Ç', exact: true });
    const size = await letter.boundingBox();
    expect(size?.width).toBeGreaterThanOrEqual(48);
    expect(size?.height).toBeGreaterThanOrEqual(48);
    await letter.click();
    await board.getByRole('button', { name: 'Nova linha' }).click();
    await page.keyboard.type('água');
    await board.getByRole('button', { name: 'Apagar', exact: true }).click();
    await expect(page.locator('.label-field')).toHaveValue('Ç\nágu');
    await page.keyboard.press('Escape');
    await expect(board).toHaveCount(0);
  }
  await control(page, 'O meu texto').click();
  const keyboard = page.getByRole('toolbar', { name: 'Teclado no ecrã' });
  await keyboard.getByRole('button', { name: 'é', exact: true }).first().click();
  await expect(page.getByRole('textbox', { name: 'O meu texto' })).not.toHaveValue('');
  await page.keyboard.press('Escape');
  await page.locator('.work-card').click();
  for (const name of ['Título', 'Autor']) {
    const field = page.getByRole('textbox', { name, exact: true });
    await field.focus();
    await keyboard.getByRole('button', { name: 'ç', exact: true }).click();
    await expect(field).toHaveValue('ç');
  }
});

test('category buttons use icons and selection, and whole-sheet magic has its own icon', async ({ page }) => {
  await ready(page);
  const basic = control(page, 'Categoria: Básicos');
  await expect(basic).toHaveAttribute('aria-pressed', 'true');
  await expect(basic.locator('.icon')).toBeVisible();
  const textures = control(page, 'Categoria: Texturas');
  await textures.click();
  await expect(textures).toHaveAttribute('aria-pressed', 'true');
  await expect(basic).toHaveAttribute('aria-pressed', 'false');
  await control(page, 'Magia').click();
  await expect(control(page, 'Categoria: Pincéis mágicos')).toBeVisible();
  await control(page, 'Negativo').click();
  expect(await control(page, 'Em toda a folha').locator('svg').innerHTML()).not.toBe(await control(page, 'Novo').locator('svg').innerHTML());
});

test('save confirmation is neutral, leaves controls reachable and clears in four seconds', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const docs = window.__garatuja!.app.documents;
    docs.editProject({ title: 'Nome', author: 'Ana', audience: 'Turma' });
  });
  await page.clock.install();
  await control(page, 'Guardar').click();
  const notice = page.locator('.success-message');
  await expect(notice).toHaveText('Guardado no dispositivo');
  expect(await notice.evaluate(node => node.closest('.toast'))).toBe(null);
  await expect(control(page, 'Definições')).toBeInViewport({ ratio: 1 });
  await page.clock.fastForward(4100);
  await expect(notice).toHaveCount(0);
});

test('a comment entered with the on-screen keyboard submits on the first click', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__garatuja!.app.configure({ screenKeyboard: true }));
  await control(page, 'Apresentar à turma').click();
  await expect(page.locator('.book-position')).toHaveText('Página 1 de 1');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.book-position')).toHaveText('Comentários');
  const board = page.getByRole('toolbar', { name: 'Teclado no ecrã' });
  const name = page.getByRole('textbox', { name: 'Quem diz?' });
  const comment = page.getByRole('textbox', { name: 'Comentário', exact: true });
  await name.focus();
  await board.getByRole('button', { name: 'Maiúsculas', exact: true }).click();
  for (const letter of 'ANA') await board.getByRole('button', { name: letter, exact: true }).click();
  await expect(name).toHaveValue('ANA');
  await comment.focus();
  for (const letter of 'AÇÃO!') await board.getByRole('button', { name: letter, exact: true }).click();
  await expect(comment).toHaveValue('AÇÃO!');
  await control(page, 'Adicionar comentário').click();
  await expect(page.locator('.class-comment')).toContainText('AÇÃO!');
  await control(page, 'Sair').click();
  await expect(board).toHaveCount(0);
});
