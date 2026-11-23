import { expect, test } from '@playwright/test';
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
