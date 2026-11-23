import { t } from '../core/i18n';
import type { IconSvg, L10n } from '../core/types';

type Child = Node | string | null | undefined;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, classes = '', ...children: Child[]): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (classes) element.className = classes;
  for (const child of children) if (child !== null && child !== undefined) element.append(child);
  return element;
}

export function art(svg: IconSvg) {
  const element = h('span', 'icon');
  element.innerHTML = svg;
  element.setAttribute('aria-hidden', 'true');
  return element;
}

export function button(label: L10n, icon: IconSvg | undefined, action: (event: MouseEvent) => void, classes = '') {
  const element = h('button', classes, icon && art(icon), h('span', 'button-label', t(label)));
  element.type = 'button';
  element.setAttribute('aria-label', t(label));
  element.addEventListener('click', action);
  return element;
}

export function pressed(element: HTMLElement, selected: boolean) {
  element.setAttribute('aria-pressed', String(selected));
}

const barSelector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled)';

export function roving(bar: HTMLElement, label: L10n) {
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', t(label));
  const items = () => Array.from(bar.querySelectorAll<HTMLElement>(barSelector))
    .filter(item => !item.closest('[hidden]') && item.closest('[role="toolbar"]') === bar);
  let preferred: HTMLElement | undefined;
  function focusable(item?: HTMLElement) {
    if (!item) bar.setAttribute('aria-label', t(label));
    const all = items();
    preferred = item ?? (preferred && all.includes(preferred) ? preferred : all.find(entry => entry.getAttribute('aria-pressed') === 'true') ?? all[0]);
    for (const entry of bar.querySelectorAll<HTMLElement>(barSelector)) {
      if (entry.closest('[role="toolbar"]') === bar) entry.tabIndex = entry === preferred ? 0 : -1;
    }
  }
  bar.addEventListener('focusin', event => {
    if (event.target instanceof HTMLElement && items().includes(event.target)) focusable(event.target);
  });
  bar.addEventListener('keydown', event => {
    const all = items();
    const index = all.findIndex(item => item === event.target);
    if (index < 0 || !all.length || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key] ?? 0;
    if (!delta && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next = event.key === 'Home' ? all[0] : event.key === 'End' ? all[all.length - 1] : all[(index + delta + all.length) % all.length];
    next.focus();
  });
  focusable();
  return focusable;
}

/** Preserve button focus when rebuilding a toolbar after a state change. */
export function replaceControls(parent: HTMLElement, children: Node[]) {
  const focus = document.activeElement;
  const key = focus instanceof HTMLElement && parent.contains(focus) ? focus.dataset.focus : undefined;
  const hadFocus = focus instanceof HTMLElement && parent.contains(focus);
  parent.replaceChildren(...children);
  if (key) {
    const matching = [...parent.querySelectorAll<HTMLElement>('[data-focus]')]
      .find(element => element.dataset.focus === key && !element.matches(':disabled'));
    (matching ?? parent.querySelector<HTMLElement>('button:not(:disabled)'))?.focus({ preventScroll: true });
  } else if (hadFocus && focus !== document.body) {
    parent.querySelector<HTMLElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }
}

const unavailableReasons = new WeakMap<HTMLButtonElement, { reason?: L10n }>();

/** Keep unavailable choices discoverable by mouse, touch and keyboard. */
export function unavailable(control: HTMLButtonElement, reason?: L10n, say?: (reason: L10n) => void) {
  let entry = unavailableReasons.get(control);
  if (!entry) {
    const state: { reason?: L10n } = {};
    unavailableReasons.set(control, state);
    entry = state;
    const explain = () => { if (state.reason) say?.(state.reason); };
    control.addEventListener('pointerenter', explain);
    control.addEventListener('focus', explain);
    control.addEventListener('click', event => {
      if (!state.reason) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      explain();
    }, true);
  }
  entry.reason = reason;
  if (reason) {
    control.setAttribute('aria-disabled', 'true');
    control.setAttribute('aria-description', t(reason));
    control.title = t(reason);
  } else {
    control.removeAttribute('aria-disabled');
    control.removeAttribute('aria-description');
    control.removeAttribute('title');
  }
}
