import { speak, t } from '../../core/i18n';
import { tools } from '../../core/registry';
import type { IconSvg, L10n } from '../../core/types';
import type { App, Feature } from '../../ui/app';
import { art, button, h } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { extraIcons } from '../settings/icons';
import './help.css';

const words = {
  title: { pt: 'Como se usa', en: 'How to use' },
  hello: {
    pt: 'Olá! Eu sou o Pingo. Escolhe uma ferramenta, escolhe uma cor e desenha na folha.',
    en: 'Hello! I am Pingo. Pick a tool, pick a color and draw on the paper.',
  },
  tools: { pt: 'Ferramentas', en: 'Tools' },
  work: { pt: 'O trabalho', en: 'Your work' },
  keys: { pt: 'Teclado', en: 'Keyboard' },
  listen: { pt: 'Ouvir', en: 'Listen' },
} satisfies Record<string, L10n>;

const workCards: { icon: IconSvg; label: L10n; text: L10n }[] = [
  { icon: icons.undo, label: { pt: 'Desfazer', en: 'Undo' }, text: { pt: 'Enganaste-te? Volta atrás.', en: 'Made a mistake? Go back.' } },
  { icon: icons.redo, label: { pt: 'Refazer', en: 'Redo' }, text: { pt: 'Volta a pôr o que tiraste.', en: 'Put back what you took away.' } },
  { icon: icons.new, label: { pt: 'Novo', en: 'New' }, text: { pt: 'Uma folha nova. A antiga fica guardada.', en: 'A new sheet. The old one stays saved.' } },
  { icon: icons.open, label: { pt: 'Abrir', en: 'Open' }, text: { pt: 'Vê os teus trabalhos.', en: 'See your works.' } },
  { icon: icons.save, label: { pt: 'Guardar', en: 'Save' }, text: { pt: 'Tudo se guarda sozinho. Este botão confirma.', en: 'Everything saves by itself. This button confirms.' } },
  { icon: icons.text, label: { pt: 'O meu texto', en: 'My text' }, text: { pt: 'Escreve o texto que o desenho ilustra.', en: 'Write the text your picture shows.' } },
];

const shortcuts: { keys: (string | L10n)[]; text: L10n }[] = [
  { keys: ['Tab'], text: { pt: 'Ir para o botão seguinte', en: 'Go to the next button' } },
  { keys: ['←', '→', '↑', '↓'], text: { pt: 'Andar dentro de uma barra ou na folha', en: 'Move inside a bar or on the paper' } },
  { keys: [{ pt: 'Espaço', en: 'Space' }], text: { pt: 'Na folha: começar e acabar um traço', en: 'On the paper: start and end a stroke' } },
  { keys: ['Ctrl', 'Z'], text: { pt: 'Desfazer', en: 'Undo' } },
  { keys: ['Ctrl', 'Y'], text: { pt: 'Refazer', en: 'Redo' } },
  { keys: ['Ctrl', 'S'], text: { pt: 'Guardar', en: 'Save' } },
  { keys: ['Ctrl', 'O'], text: { pt: 'Abrir', en: 'Open' } },
  { keys: ['Esc'], text: { pt: 'Parar ou fechar', en: 'Stop or close' } },
  { keys: ['F1'], text: { pt: 'Esta ajuda', en: 'This help' } },
];

function card(icon: IconSvg, label: L10n, text: L10n) {
  return h('li', 'help-card', art(icon), h('strong', '', t(label)), h('span', '', t(text)));
}

function showHelp(app: App) {
  const level = app.store.get().settings.level;
  const toolList = tools.all().filter(tool => tool.level <= level);
  const spoken: L10n = {
    pt: [words.hello.pt, ...toolList.map(tool => `${tool.label.pt}: ${tool.hint.pt}`), ...workCards.map(item => `${item.label.pt}: ${item.text.pt}`)].join(' '),
    en: [words.hello.en, ...toolList.map(tool => `${tool.label.en}: ${tool.hint.en}`), ...workCards.map(item => `${item.label.en}: ${item.text.en}`)].join(' '),
  };
  const listen = button(words.listen, extraIcons.listen, () => {
    if (!speak(spoken)) app.notify({ pt: 'A leitura precisa de uma voz instalada neste dispositivo.', en: 'Reading aloud needs a voice installed on this device.' });
  });
  listen.autofocus = true;
  const keys = h('dl', 'help-keys', ...shortcuts.flatMap(item => [
    h('dt', '', ...item.keys.flatMap((key, i) => [i ? ' + ' : '', h('kbd', '', typeof key === 'string' ? key : t(key))])),
    h('dd', '', t(item.text)),
  ]));
  const content = h('div', 'help-sheet',
      h('div', 'help-hello', art(icons.pingo), h('p', '', t(words.hello)), listen),
      h('h3', '', t(words.tools)), h('ul', 'help-grid', ...toolList.map(tool => card(tool.icon, tool.label, tool.hint))),
      h('h3', '', t(words.work)), h('ul', 'help-grid', ...workCards.map(item => card(item.icon, item.label, item.text))),
      h('details', 'help-more', h('summary', '', art(extraIcons.keyboard), t(words.keys)), keys));
  app.modal({ title: words.title, content });
  content.closest('dialog')?.classList.add('dialog-wide');
}

export default {
  id: 'help',
  mount(app) {
    app.registerScreen('help.show', showHelp);
    window.addEventListener('keydown', event => {
      if (event.key !== 'F1' || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      app.openScreen('help.show');
    });
  },
} satisfies Feature;
