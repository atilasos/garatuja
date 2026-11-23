import { t } from '../core/i18n';
import type { App } from './app';
import { button, h } from './dom';
import { icons } from './icons';

export const titleLabel = { pt: 'Título', en: 'Title' };
export const authorLabel = { pt: 'Autor', en: 'Author' };
export const untitled = { pt: 'Sem título', en: 'Untitled' };

export function mixColor(app: App) {
  const input = h('input', 'color-input');
  input.type = 'color';
  input.value = app.store.get().color;
  const title = { pt: 'Misturar cor', en: 'Mix color' };
  const close = app.modal({
    title, content: h('div', 'dialog-stack',
      h('label', 'work-field', h('span', '', t({ pt: 'A tua cor', en: 'Your color' })), input),
      button({ pt: 'Usar esta cor', en: 'Use this color' }, icons.custom, () => { app.setColor(input.value); close(); }, 'primary')),
  });
}
