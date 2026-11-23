import { t } from '../core/i18n';
import type { L10n } from '../core/types';
import { button, h } from './dom';
import { icons } from './icons';

export interface ToastAction { label: L10n; run(): void }

export class Toasts {
  readonly element = h('div', 'toasts');

  confirm(message: L10n, region: HTMLElement) {
    const status = h('span', 'success-message', t(message));
    status.setAttribute('role', 'status');
    region.querySelector('.success-message')?.remove();
    region.append(status);
    window.setTimeout(() => status.remove(), 4000);
  }

  /** Returns a function that removes the message early. */
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
    return remove;
  }
}
