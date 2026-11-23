import { t } from '../core/i18n';
import type { L10n } from '../core/types';
import { button, h } from './dom';
import { icons } from './icons';

export interface ModalOptions {
  title: L10n;
  content: HTMLElement;
  footer?: HTMLElement;
  onClose?: () => void;
}

let count = 0;
export function openModal({ title, content, footer, onClose }: ModalOptions): () => void {
  const previous = document.activeElement;
  const dialog = h('dialog', 'dialog');
  const heading = h('h2', '', t(title));
  heading.id = `dialog-title-${++count}`;
  dialog.setAttribute('aria-labelledby', heading.id);
  const close = () => {
    if (!dialog.open) return;
    dialog.close();
    finish();
  };
  dialog.addEventListener('cancel', event => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    close();
  });
  const dismiss = button({ pt: 'Fechar', en: 'Close' }, icons.close, close);
  // A fade with an arrow at the bottom while the dialog still has content below the fold.
  const more = h('div', 'dialog-more');
  more.setAttribute('aria-hidden', 'true');
  dialog.append(h('header', 'dialog-head', heading, dismiss));
  dialog.append(h('div', 'dialog-notices'));
  if (footer) {
    dialog.classList.add('dialog-with-footer');
    footer.classList.add('dialog-footer');
    dialog.append(h('div', 'dialog-scroll', content, more), footer);
  } else dialog.append(content, more);
  const scroll = content.closest('.dialog-scroll') ?? dialog;
  const checkMore = () => { more.hidden = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 2; };
  scroll.addEventListener('scroll', checkMore, { passive: true });
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
  function finish() {
    if (!dialog.isConnected) return;
    watcher.disconnect();
    dialog.remove();
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    onClose?.();
  }
  dialog.addEventListener('close', finish, { once: true });
  document.body.append(dialog);
  dialog.showModal();
  (dialog.querySelector<HTMLElement>('[autofocus]') ?? dismiss).focus();
  return close;
}
