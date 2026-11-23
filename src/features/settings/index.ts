import { onMissingVoice, speak, t } from '../../core/i18n';
import type { Settings } from '../../core/store';
import type { L10n } from '../../core/types';
import type { App, Feature } from '../../ui/app';
import { button, h, pressed, roving } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { palette } from '../../ui/palette';
import { holdButton } from '../teacher/hold';
import { keyboardIcon, keyboardLabel, keyboardLayoutField } from '../../ui/writing-input';
import './a11y.css';
import { extraIcons } from './icons';

const words = {
  title: { pt: 'Definições', en: 'Settings' },
  mine: { pt: 'As minhas definições', en: 'My settings' },
  sound: { pt: 'Som', en: 'Sound' },
  listen: { pt: 'Ouvir', en: 'Listen' },
  simple: { pt: 'Simples', en: 'Simple' },
  full: { pt: 'Completa', en: 'Full' },
  left: { pt: 'Mão esquerda', en: 'Left hand' },
  cursor: { pt: 'Cursor grande', en: 'Big cursor' },
  help: { pt: 'Como se usa', en: 'How to use' },
  adult: { pt: 'Adulto', en: 'Adult' },
  noVoice: {
    pt: 'Não encontrei uma voz em português neste dispositivo, por isso a leitura fica em silêncio.',
    en: 'No voice for this language is installed on this device, so reading stays silent.',
  },
  mixed: { pt: 'Cor misturada', en: 'Mixed color' },
} satisfies Record<string, L10n>;

type Toggle = { key: 'sound' | 'readAloud' | 'leftHanded' | 'largeCursor' | 'uppercase' | 'highContrast' | 'fixedClick' | 'screenKeyboard'; label: L10n; on: string; off?: string };

const toggles: Toggle[] = [
  { key: 'sound', label: words.sound, on: icons.sound, off: icons.mute },
  { key: 'readAloud', label: words.listen, on: extraIcons.listen },
  { key: 'leftHanded', label: words.left, on: extraIcons.hand },
  { key: 'largeCursor', label: words.cursor, on: extraIcons.cursor },
  { key: 'uppercase', label: { pt: 'Só maiúsculas', en: 'Capital letters only' }, on: extraIcons.uppercase },
  { key: 'highContrast', label: { pt: 'Alto contraste', en: 'High contrast' }, on: extraIcons.contrast },
  { key: 'screenKeyboard', label: keyboardLabel, on: keyboardIcon },
  { key: 'fixedClick', label: { pt: 'Clique fixo', en: 'Click to start and stop' }, on: extraIcons.fixedClick },

];

/** Settings that belong to the child: big icon + word buttons, no gate. */
function childSettings(app: App) {
  const grid = h('div', 'child-settings');
  const render = () => {
    const settings = app.store.get().settings;
    const controls = toggles.map(toggle => {
      const on = settings[toggle.key];
      const control = button(toggle.label, on ? toggle.on : toggle.off ?? toggle.on, () => {
        app.configure({ [toggle.key]: !on });
        render();
      }, 'big-toggle');
      control.dataset.focus = toggle.key;
      pressed(control, on);
      return control;
    });
    for (const [value, label] of [[1, words.simple], [2, words.full]] as const) {
      const control = button(label, value === 1 ? icons.level : extraIcons.full, () => { app.configure({ level: value }); render(); }, 'big-toggle');
      control.dataset.focus = 'level-' + value;
      control.setAttribute('aria-label', t(value === 1
        ? { pt: 'Interface simples', en: 'Simple interface' } : { pt: 'Interface completa', en: 'Full interface' }));
      pressed(control, settings.level === value);
      controls.push(control);
    }
    const focus = document.activeElement instanceof HTMLElement && grid.contains(document.activeElement) ? document.activeElement.dataset.focus : undefined;
    grid.replaceChildren(...controls);
    if (focus) grid.querySelector<HTMLElement>(`[data-focus="${focus}"]`)?.focus();
  };
  render();
  roving(grid, words.mine);
  const help = button(words.help, extraIcons.help, () => { close(); app.openScreen('help.show'); });
  const credits = button({ pt: 'Créditos', en: 'Credits' }, extraIcons.credits, () => { close(); app.openScreen('credits.show'); });
  const instruction = h('p', 'hold-instruction');
  instruction.setAttribute('role', 'status');
  const adult = holdButton(instruction, words.adult, extraIcons.adult, () => { close(); app.openScreen('teacher.gate'); });
  const close = app.modal({
    title: words.title,
    content: h('div', 'dialog-stack', grid, keyboardLayoutField(app), h('div', 'dialog-actions spread', help, credits, adult), instruction),
  });
}

/** Mirror the accessibility options on <html> so dialogs and toasts follow them too. */
function applyClasses(settings: Settings) {
  const root = document.documentElement.classList;
  root.toggle('high-contrast', settings.highContrast);
  root.toggle('large-cursor', settings.largeCursor);
  root.toggle('uppercase', settings.uppercase);
  root.toggle('left-handed', settings.leftHanded);
}

export default {
  id: 'settings',
  mount(app) {
    app.registerScreen('settings.child', childSettings);
    applyClasses(app.store.get().settings);
    let warned = false;
    onMissingVoice(() => {
      if (warned || !app.store.get().settings.readAloud) return;
      warned = true;
      app.notify(words.noVoice);
    });
    app.store.subscribe((state, previous) => {
      if (state.settings !== previous.settings) {
        applyClasses(state.settings);
        if (state.settings.locale !== previous.settings.locale) warned = false;
      }
      if (state.color !== previous.color && state.settings.readAloud) {
        speak(palette.find(item => item.color === state.color)?.label ?? words.mixed);
      }
    });
  },
} satisfies Feature;
