import { fillDetails } from './work-details';
import { expect, test, type Page } from '@playwright/test';

/**
 * Captures the review screenshots in docs/screens. Skipped in the normal run:
 *   SCREENS=1 E2E_PORT=4205 npx playwright test tests/e2e/labels-screens.spec.ts
 */
test.skip(!process.env.SCREENS, 'only when SCREENS=1');
test.use({ deviceScaleFactor: 2 });

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Pintar', exact: true })).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__garatuja));
}

async function where(page: Page, x: number, y: number) {
  const box = await page.getByRole('group', { name: 'Folha de desenho' }).boundingBox();
  if (!box) throw new Error('Missing sheet');
  return { x: box.x + box.width * x / 1600, y: box.y + box.height * y / 1200 };
}

async function drag(page: Page, from: [number, number], to: [number, number]) {
  const a = await where(page, ...from);
  const b = await where(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

const choose = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();

async function label(page: Page, type: string, text: string, at: [number, number], from?: [number, number]) {
  await choose(page, type);
  if (from) await drag(page, from, at);
  else {
    const p = await where(page, ...at);
    await page.mouse.click(p.x, p.y);
  }
  await page.keyboard.type(text);
  await choose(page, 'Pronto');
  await page.keyboard.press('Escape');
}

/** A child-like picture painted straight into the bitmap, so the labels are the only thing under test. */
function paintScene(page: Page, scene: 'plant' | 'story') {
  return page.evaluate(scene => {
    const ctx = window.__garatuja?.app.surface.ctx;
    if (!ctx) return;
    const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, rotate = 0) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rotate, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    };
    const line = (points: [number, number][], color: string, width: number) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.stroke();
    };
    const rect = (x: number, y: number, w: number, h: number, fill: string, radius = 0) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fillStyle = fill;
      ctx.fill();
    };
    if (scene === 'plant') {
      rect(0, 0, 1600, 820, '#e4f3fb');
      rect(0, 820, 1600, 380, '#dcc09a');
      rect(0, 800, 1600, 40, '#86c46a');
      ellipse(1380, 170, 80, 80, '#ffd84d');
      line([[800, 820], [800, 430]], '#3f9a52', 26);
      ellipse(690, 650, 110, 44, '#5cb85c', -.5);
      ellipse(915, 590, 110, 44, '#5cb85c', .5);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ellipse(800 + Math.cos(a) * 92, 360 + Math.sin(a) * 92, 50, 50, '#ef7f9b');
      }
      ellipse(800, 360, 56, 56, '#f7c948');
      line([[800, 840], [800, 1040]], '#7a5230', 12);
      line([[800, 900], [690, 1030]], '#7a5230', 10);
      line([[800, 920], [920, 1050]], '#7a5230', 10);
      line([[800, 980], [740, 1090]], '#7a5230', 8);
    } else {
      rect(0, 0, 1600, 780, '#c4e6f6');
      rect(0, 780, 1600, 420, '#92d07c');
      ellipse(1420, 150, 85, 85, '#ffd84d');
      ellipse(250, 170, 110, 46, '#ffffff');
      ellipse(330, 150, 80, 50, '#ffffff');
      const kid = (x: number, shirt: string, hair: string) => {
        line([[x - 30, 930], [x - 34, 1060]], '#5b4636', 18);
        line([[x + 30, 930], [x + 34, 1060]], '#5b4636', 18);
        rect(x - 62, 740, 124, 200, shirt, 30);
        line([[x - 62, 780], [x - 120, 850]], '#f1c9a5', 18);
        line([[x + 62, 780], [x + 120, 850]], '#f1c9a5', 18);
        ellipse(x, 660, 66, 66, '#f1c9a5');
        ellipse(x, 628, 70, 40, hair);
        ellipse(x - 22, 660, 6, 8, '#352b23');
        ellipse(x + 22, 660, 6, 8, '#352b23');
        line([[x - 18, 690], [x, 702], [x + 18, 690]], '#352b23', 5);
      };
      kid(380, '#ef7f6f', '#5b3a29');
      kid(880, '#6aa7d8', '#d6a43a');
      ellipse(1280, 930, 100, 56, '#b98250');
      ellipse(1385, 870, 52, 46, '#b98250');
      ellipse(1425, 826, 18, 34, '#8c5c32', .4);
      ellipse(1400, 872, 6, 7, '#352b23');
      line([[1200, 910], [1160, 850]], '#b98250', 18);
      line([[1230, 975], [1228, 1050]], '#b98250', 18);
      line([[1330, 975], [1332, 1050]], '#b98250', 18);
      ellipse(630, 1020, 40, 40, '#ffffff');
      ellipse(630, 1020, 14, 14, '#352b23');
    }
  }, scene);
}

test('plant diagram with four numbered arrow labels', async ({ page }) => {
  await ready(page);
  await paintScene(page, 'plant');
  await fillDetails(page, { title: 'As partes da planta', author: 'Inês' });

  await choose(page, 'Texto');
  await choose(page, 'Título');
  await choose(page, 'Grande');
  await choose(page, 'Verde');
  const title = await where(page, 440, 100);
  await page.mouse.click(title.x, title.y);
  await page.keyboard.type('As partes da planta');
  await choose(page, 'Pousar');

  await choose(page, 'Legenda');
  await choose(page, 'Preto');
  await choose(page, 'Grande');
  await label(page, 'Número', 'Flor', [1190, 250], [860, 330]);
  await label(page, 'Número', 'Folha', [1270, 560], [965, 590]);
  await label(page, 'Número', 'Caule', [340, 520], [785, 540]);
  await label(page, 'Número', 'Raiz', [1230, 1010], [860, 1020]);
  const sheet = page.getByRole('group', { name: 'Folha de desenho' });
  await page.getByRole('button', { name: /Número 2: Folha/ }).focus();
  await page.mouse.move(5, 5);
  await sheet.screenshot({ path: 'docs/screens/batch-e-planta-edicao.png' });
  await page.keyboard.press('Escape');
  await page.mouse.move(5, 5);
  await page.screenshot({ path: 'docs/screens/batch-e-planta.png', scale: 'css' });
  await sheet.screenshot({ path: 'docs/screens/batch-e-planta-folha.png' });
});

test('story scene with two speech balloons and a thought balloon', async ({ page }) => {
  await ready(page);
  await paintScene(page, 'story');
  await choose(page, 'Legenda');
  await choose(page, 'Preto');
  await choose(page, 'Letra manuscrita');
  await label(page, 'Balão de fala', 'Olá! Queres brincar comigo?', [340, 260], [380, 570]);
  await label(page, 'Balão de fala', 'Quero! Vamos jogar à bola!', [820, 250], [885, 565]);
  await label(page, 'Pensamento', 'Eu também quero a bola!', [1340, 480], [1385, 800]);
  const sheet = page.getByRole('group', { name: 'Folha de desenho' });
  await page.mouse.move(5, 5);
  await page.screenshot({ path: 'docs/screens/batch-e-narrativa.png', scale: 'css' });
  await sheet.screenshot({ path: 'docs/screens/batch-e-narrativa-folha.png' });
});
