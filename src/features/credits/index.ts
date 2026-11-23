import { t } from '../../core/i18n';
import type { Feature } from '../../ui/app';
import { h } from '../../ui/dom';
import './style.css';

const title = { pt: 'Créditos', en: 'Credits' };

export default {
  id: 'credits',
  mount(app) {
    app.registerScreen('credits.show', async app => {
      const { credits } = await import('./data');
      const content = h('div', 'credits-list');
      for (const entry of credits) {
        const details = h('details', '', h('summary', '', entry.license), h('pre', '', entry.text));
        content.append(h('section', '', h('h3', '', entry.name), h('p', '', t(entry.purpose)), details));
      }
      app.modal({ title, content });
    });
  },
} satisfies Feature;
