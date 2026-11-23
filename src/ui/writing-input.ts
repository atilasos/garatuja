import type { Settings } from '../core/store';
import type { L10n } from '../core/types';
import { t } from '../core/i18n';
import type { App } from './app';
import { button, h, pressed, roving } from './dom';
import { icon, icons } from './icons';
import './writing-input.css';

type Field = HTMLInputElement | HTMLTextAreaElement;

export const keyboardLabel = { pt: 'Teclado no ecrã', en: 'On-screen keyboard' };
export const keyboardIcon = icon('<rect x="4" y="12" width="40" height="26" rx="4" fill="#91c9e4"/><path d="M11 19h2m6 0h2m6 0h2m6 0h2m-26 6h2m6 0h2m6 0h2m6 0h2m-22 6h18"/>');

export function uppercaseValue(value: string, settings: Settings) {
  return settings.uppercase ? value.toLocaleUpperCase(settings.locale === 'pt' ? 'pt-PT' : 'en') : value;
}

export function writingInput(field: Field, settings: () => Settings, edit?: (value: string) => void) {
  field.dataset.writingInput = '';
  const update = (event: Event) => {
    if ((event as InputEvent).isComposing) return;
    const current = field.value;
    const value = uppercaseValue(current, settings());
    if (value !== current) {
      const start = uppercaseValue(current.slice(0, field.selectionStart ?? current.length), settings()).length;
      const end = uppercaseValue(current.slice(0, field.selectionEnd ?? current.length), settings()).length;
      field.value = value;
      field.setSelectionRange(start, end);
    }
    edit?.(field.value);
  };
  field.addEventListener('input', update);
  field.addEventListener('compositionend', update);
}

export function keyboardLayoutField(app: App) {
  const select = h('select');
  for (const [value, label] of [
    ['alphabetical', { pt: 'Alfabético', en: 'Alphabetical' }],
    ['qwerty', { pt: 'QWERTY', en: 'QWERTY' }],
  ] as const) {
    const option = h('option', '', t(label));
    option.value = value;
    select.append(option);
  }
  select.value = app.store.get().settings.keyboardLayout;
  select.addEventListener('change', () => app.configure({ keyboardLayout: select.value === 'qwerty' ? 'qwerty' : 'alphabetical' }));
  return h('label', 'setting', h('span', '', t({ pt: 'Disposição do teclado', en: 'Keyboard layout' })), select);
}

export function mountWritingKeyboard(app: App) {
  const board = h('div', 'writing-keyboard');
  const refresh = roving(board, keyboardLabel);
  let field: Field | undefined;
  let capital = false;
  let builtFor: Settings | undefined;
  const observer = new MutationObserver(() => {
    if (!field?.isConnected || field.hidden || field.closest('dialog:not([open])')) close();
  });

  function close() {
    field = undefined;
    capital = false;
    builtFor = undefined;
    observer.disconnect();
    board.remove();
  }

  function insert(value: string | null) {
    if (!field) return;
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    const previous = [...field.value.slice(0, start)].at(-1)?.length ?? 0;
    if (value !== null && field.maxLength >= 0 && field.value.length - (end - start) + value.length > field.maxLength) return;
    field.setRangeText(value ?? '', value === null && end === start ? start - previous : start, end, 'end');
    field.focus({ preventScroll: true });
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: value === null ? 'deleteContentBackward' : 'insertText' }));
  }

  function render() {
    if (!field) return;
    const settings = app.store.get().settings;
    if (!settings.screenKeyboard) { close(); return; }
    builtFor = settings;
    const upper = settings.uppercase || capital;
    const alphabet = settings.keyboardLayout === 'qwerty' ? ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] : ['abcdefghi', 'jklmnopqr', 'stuvwxyz'];
    const keys = [...alphabet, 'áàâãéêíóôõúç', '.,?!-'].map(row =>
      h('div', 'writing-key-row', ...[...(upper ? row.toUpperCase() : row)].map(letter =>
        button({ pt: letter, en: letter }, undefined, () => insert(letter)))));
    const key = (label: L10n, art: string, run: () => void) => button(label, art, run, 'writing-key');
    const caps = key({ pt: 'Maiúsculas', en: 'Capitals' }, keyboardIcon, () => { capital = !capital; render(); });
    pressed(caps, upper);
    board.replaceChildren(...keys, h('div', 'writing-key-row', caps,
      key({ pt: 'Espaço', en: 'Space' }, keyboardIcon, () => insert(' ')),
      key({ pt: 'Apagar', en: 'Backspace' }, icons.undo, () => insert(null)),
      ...(field instanceof HTMLTextAreaElement
        ? [key({ pt: 'Nova linha', en: 'New line' }, icons.down, () => insert('\n'))] : [])));
    refresh();
  }

  board.addEventListener('pointerdown', event => event.preventDefault());
  document.addEventListener('focusin', event => {
    const target = event.target;
    if (target instanceof Node && board.contains(target)) return;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) ||
      target.dataset.writingInput === undefined || !app.store.get().settings.screenKeyboard) {
      close();
      return;
    }
    if (field === target && builtFor === app.store.get().settings) return;
    field = target;
    const dialog = target.closest('dialog');
    (dialog?.querySelector('.book-reader') ?? dialog ?? app.surface.element.closest('.stage'))?.append(board);
    observer.disconnect();
    observer.observe(target, { attributes: true, attributeFilter: ['hidden'] });
    if (dialog) observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    render();
  });
  app.store.subscribe((state, previous) => {
    if (state.settings !== previous.settings) render();
  });
}
