import { t } from '../core/i18n';
import type { L10n } from '../core/types';
import { button, h } from './dom';
import { icons } from './icons';

export interface ToastAction { label: L10n; run(): void }

export class Toasts {
  readonly element = h('div', 'toasts');
  private readonly labels = new WeakMap<HTMLElement, L10n>();

  refreshLocale() {
    for (const element of document.querySelectorAll<HTMLElement>('.success-message, .toast-message, .toast button')) {
      const label = this.labels.get(element);
      if (!label) continue;
      if (element instanceof HTMLButtonElement) {
        element.setAttribute('aria-label', t(label));
        const text = element.querySelector('.button-label');
        if (text) text.textContent = t(label);
      } else element.textContent = t(label);
    }
  }

  confirm(message: L10n, region: HTMLElement) {
    const status = h('span', 'success-message', t(message));
    status.setAttribute('role', 'status');
    this.labels.set(status, message);
    region.querySelector('.success-message')?.remove();
    region.append(status);
    window.setTimeout(() => status.remove(), 4000);
  }

  /** Returns a function that removes the message early. */
  show(message: L10n, action?: ToastAction) {
    const status = h('span', 'toast-message');
    status.setAttribute('role', 'status');
    this.labels.set(status, message);
    const item = h('div', 'toast', status);
    const remove = () => item.remove();
    if (action) {
      const control = button(action.label, icons.undo, () => { action.run(); remove(); });
      this.labels.set(control, action.label);
      item.append(control);
    }
    const closeLabel = { pt: 'Fechar', en: 'Close' };
    const close = button(closeLabel, icons.close, remove);
    this.labels.set(close, closeLabel);
    item.append(close);
    this.element.append(item);
    status.textContent = t(message);
    if (!action) window.setTimeout(remove, 5200);
    return remove;
  }
}
