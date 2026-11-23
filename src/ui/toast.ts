import { t } from '../core/i18n';
import type { L10n } from '../core/types';
import { button, h } from './dom';
import { icons } from './icons';

export interface ToastAction { label: L10n; run(): void }

export class Toasts {
  readonly element = h('div', 'toasts');

  show(message: L10n, action?: ToastAction) {
    const status = h('span', 'toast-message');
    status.setAttribute('role', 'status');
    const item = h('div', 'toast', status);
    const remove = () => item.remove();
    if (action) item.append(button(action.label, icons.undo, () => { action.run(); remove(); }));
    item.append(button({ pt: 'Fechar', en: 'Close' }, icons.close, remove));
    this.element.append(item);
    status.textContent = t(message);
    if (!action) window.setTimeout(remove, 5200);
  }
}
