import { t } from '../core/i18n';
import type { L10n } from '../core/types';
import { button, h } from './dom';
import { icons } from './icons';

export interface ModalOptions {
  title: L10n;
  content: HTMLElement;
  onClose?: () => void;
}

let count = 0;
export function openModal({ title, content, onClose }: ModalOptions): () => void {
  const previous = document.activeElement;
  const dialog = h('dialog', 'dialog');
  const heading = h('h2', '', t(title));
  heading.id = `dialog-title-${++count}`;
  dialog.setAttribute('aria-labelledby', heading.id);
  const close = () => { if (dialog.open) dialog.close(); };
  const dismiss = button({ pt: 'Fechar', en: 'Close' }, icons.close, close);
  // A fade with an arrow at the bottom while the dialog still has content below the fold.
  const more = h('div', 'dialog-more');
  more.setAttribute('aria-hidden', 'true');
  dialog.append(h('header', 'dialog-head', heading, dismiss), content, more);
  const checkMore = () => { more.hidden = dialog.scrollHeight - dialog.scrollTop - dialog.clientHeight < 2; };
  dialog.addEventListener('scroll', checkMore, { passive: true });
  const watcher = new ResizeObserver(checkMore);
  watcher.observe(dialog);
  watcher.observe(content);
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]')]
      .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  dialog.addEventListener('close', () => {
    watcher.disconnect();
    dialog.remove();
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    onClose?.();
  }, { once: true });
  document.body.append(dialog);
  dialog.showModal();
  (dialog.querySelector<HTMLElement>('[autofocus]') ?? dismiss).focus();
  return close;
}
