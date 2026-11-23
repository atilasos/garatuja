import { viewport } from '../core/canvas';
import { t, speak } from '../core/i18n';
import { tools } from '../core/registry';
import type { State } from '../core/store';
import type { L10n } from '../core/types';
import type { App, WorkAction } from './app';
import { art, button, h, pressed, replaceControls, roving } from './dom';
import { icons } from './icons';
import { OptionsPanel } from './options';
import { palette } from './palette';
import { authorLabel, editWriting, mixColor, titleLabel, untitled, WorkField } from './work-fields';

const words = {
  tools: { pt: 'Ferramentas', en: 'Tools' },
  colors: { pt: 'Cores', en: 'Colors' },
  pages: { pt: 'Páginas', en: 'Pages' },
  actions: { pt: 'Ações do trabalho', en: 'Work actions' },
  files: { pt: 'Trabalho', en: 'Work' },
  history: { pt: 'Histórico', en: 'History' },
  undo: { pt: 'Desfazer', en: 'Undo' },
  redo: { pt: 'Refazer', en: 'Redo' },
  settings: { pt: 'Definições', en: 'Settings' },
  print: { pt: 'Imprimir', en: 'Print' },
  listen: { pt: 'Ouvir', en: 'Listen' },
  paper: { pt: 'Folha de desenho', en: 'Drawing paper' },
  writing: { pt: 'O meu texto', en: 'My text' },
  add: { pt: 'Adicionar página', en: 'Add page' },
  picker: { pt: 'Conta-gotas', en: 'Eyedropper' },
  mix: { pt: 'Misturar cor', en: 'Mix color' },
} satisfies Record<string, L10n>;

function printPage(app: App) {
  const { title, author, audience } = app.store.get().project;
  const canvas = viewport();
  app.surface.composite(canvas);
  const output = h('article', 'print-only', h('h1', '', title || t(untitled)), h('p', '', author),
    h('p', '', audience), canvas.canvas, h('p', 'printed-text', app.documents.page.text));
  document.body.append(output);
  window.addEventListener('afterprint', () => output.remove(), { once: true });
  window.print();
}

function actionButton(app: App, action: WorkAction) {
  const control = button(action.label, action.icon, () => app.run(() => action.run(app)));
  control.dataset.focus = action.id;
  return control;
}

export function mountShell(app: App, root: HTMLElement) {
  const title = new WorkField(titleLabel, untitled, value => app.documents.editProject({ title: value }));
  const author = new WorkField(authorLabel, { pt: 'O teu nome', en: 'Your name' }, value => app.documents.editProject({ author: value }));
  const className = h('small', 'class-name');
  const brand = h('div', 'brand', art(icons.pingo), h('span', '', t({ pt: 'Garatuja', en: 'Garatuja' })), className);
  const pages = h('div', 'page-strip');
  const preferences = h('div', 'preferences');
  const header = h('header', 'workbar', brand, h('div', 'work-fields', title.element, author.element), pages, preferences);
  const files = h('div', 'file-actions');
  const featureActions = h('div', 'feature-actions');
  const history = h('div', 'history-actions');
  const ribbon = h('div', 'ribbon', files, featureActions, history);
  const toolbox = h('div', 'tool-grid');
  const toolboxHeading = h('h2', 'panel-title');
  const toolsPanel = h('aside', 'tools panel', toolboxHeading, toolbox);
  const options = new OptionsPanel();
  const stage = h('main', 'stage', app.surface.element);
  const keyboardCursor = h('span', 'keyboard-cursor');
  keyboardCursor.hidden = true;
  app.surface.element.append(keyboardCursor);
  const workspace = h('div', 'workspace', toolsPanel, stage, options.element);
  const colors = h('div', 'palette');
  const hint = h('p', 'hint');
  hint.id = 'pingo-hint';
  hint.setAttribute('role', 'status');
  const help = h('div', 'help');
  const footer = h('footer', 'footer', colors, help);
  const removeTabstop = roving(history, words.history);
  let actions: WorkAction[] = [];
  let actionButtons: [WorkAction, HTMLButtonElement][] = [];
  let undo: HTMLButtonElement;
  let redo: HTMLButtonElement;

  root.append(header, ribbon, workspace, footer, app.toasts.element);
  app.surface.element.tabIndex = 0;
  app.surface.element.setAttribute('role', 'group');
  app.surface.element.setAttribute('aria-describedby', 'pingo-hint');
  app.surface.element.addEventListener('pointerdown', () => { keyboardCursor.hidden = true; });
  app.surface.element.addEventListener('focusout', () => { keyboardCursor.hidden = true; });
  app.surface.element.addEventListener('keydown', event => {
    const point = app.input.drawWithKeyboard(event);
    if (!point) return;
    keyboardCursor.hidden = false;
    keyboardCursor.style.left = point.x * 100 / app.surface.ctx.canvas.width + '%';
    keyboardCursor.style.top = point.y * 100 / app.surface.ctx.canvas.height + '%';
  });

  function render(state: State, previous?: State) {
    const { locale, level } = state.settings;
    const language = !previous || locale !== previous.settings.locale;
    const settings = language || state.settings !== previous?.settings;
    const pageChanged = !previous || state.pageId !== previous.pageId ||
      state.project.pages.length !== previous.project.pages.length ||
      state.project.pages.some((page, i) => page.id !== previous.project.pages[i]?.id);
    root.classList.toggle('left-handed', state.settings.leftHanded);
    root.classList.toggle('high-contrast', state.settings.highContrast);
    app.surface.element.classList.toggle('large-cursor', state.settings.largeCursor);
    app.surface.element.classList.toggle('picking', state.pickingColor);
    app.surface.element.inert = state.busy;
    className.textContent = state.settings.className;
    title.update(state.project.title);
    author.update(state.project.author);
    title.input.disabled = author.input.disabled = state.busy;

    if (language || pageChanged) {
      const items = state.project.pages.map((page, index) => {
        const label = { pt: `Página ${index + 1}`, en: `Page ${index + 1}` };
        const item = button(label, icons.new, () => app.run(() => app.documents.select(page.id)), 'page');
        item.dataset.focus = page.id;
        pressed(item, page.id === state.pageId);
        return item;
      });
      const add = button({ pt: 'Adicionar', en: 'Add' }, icons.plus, () => app.run(() => app.documents.add()), 'add-page');
      add.setAttribute('aria-label', t(words.add));
      add.dataset.focus = 'add';
      replaceControls(pages, [...items, add]);
      refreshPages();
      if (pageChanged) {
        const current = items.find(item => item.getAttribute('aria-pressed') === 'true');
        if (current) pages.scrollLeft = Math.max(0, current.offsetLeft - pages.offsetLeft - Math.max(0, (pages.clientWidth - current.offsetWidth) / 2));
      }
    }

    if (state.busy !== previous?.busy || pageChanged) {
      for (const control of pages.querySelectorAll('button')) control.setAttribute('aria-disabled', String(state.busy));
    }

    if (settings) {
      const sound = state.settings.sound;
      const soundLabel = sound ? { pt: 'Som ligado', en: 'Sound on' } : { pt: 'Som desligado', en: 'Sound off' };
      const soundToggle = button({ pt: 'Som', en: 'Sound' }, sound ? icons.sound : icons.mute, () => app.configure({ sound: !sound }));
      soundToggle.setAttribute('aria-label', t(soundLabel));
      soundToggle.dataset.focus = 'sound';
      pressed(soundToggle, sound);
      const levelLabel = level === 1 ? { pt: 'Simples', en: 'Simple' } : { pt: 'Completa', en: 'Full' };
      const levelToggle = button(levelLabel, icons.level, () => app.configure({ level: level === 1 ? 2 : 1 }));
      levelToggle.dataset.focus = 'level';
      levelToggle.setAttribute('aria-label', t(level === 1
        ? { pt: 'Interface simples', en: 'Simple interface' } : { pt: 'Interface completa', en: 'Full interface' }));
      pressed(levelToggle, level === 1);
      const settingsButton = button(words.settings, icons.settings, () => app.openScreen('settings.child'));
      settingsButton.dataset.focus = 'settings';
      replaceControls(preferences, [soundToggle, levelToggle, settingsButton]);
      refreshPreferences();
    }

    const nextActions = app.workActions;
    if (language || settings || nextActions.length !== actions.length || nextActions.some((action, i) => action !== actions[i])) {
      actions = nextActions;
      actionButtons = actions.map(action => [action, actionButton(app, action)]);
      const print = button(words.print, icons.print, () => printPage(app));
      print.dataset.focus = 'print';
      const basic = actionButtons.filter(([action]) => action.placement === 'files').map(([, control]) => control);
      if (state.settings.allowPrint) basic.push(print);
      replaceControls(files, basic);
      const text = button(words.writing, icons.text, () => editWriting(app));
      text.dataset.focus = 'writing';
      replaceControls(featureActions, [text, ...actionButtons.filter(([action]) => action.placement !== 'files').map(([, control]) => control)]);
      refreshFiles();
      refreshActions();
    }
    for (const [action, control] of actionButtons) control.disabled = state.busy || Boolean(action.disabled?.(app));
    for (const control of [files.querySelector<HTMLButtonElement>('[data-focus="print"]'), featureActions.querySelector<HTMLButtonElement>('[data-focus="writing"]')]) {
      if (control) control.disabled = state.busy;
    }
    refreshFiles();
    refreshActions();

    if (language) {
      undo = button(words.undo, icons.undo, () => app.undo());
      redo = button(words.redo, icons.redo, () => app.redo());
      undo.dataset.focus = 'undo';
      redo.dataset.focus = 'redo';
      replaceControls(history, [undo, redo]);
      toolboxHeading.textContent = t(words.tools);
      toolsPanel.setAttribute('aria-label', t(words.tools));
      app.surface.element.setAttribute('aria-label', t(words.paper));
      const listen = button(words.listen, icons.sound, () => {
        if (!speak(app.store.get().hint)) app.notify({
          pt: 'A leitura precisa de uma voz instalada neste dispositivo.',
          en: 'Reading aloud needs a voice installed on this device.',
        });
      });
      help.replaceChildren(art(icons.pingo), hint, listen);
      for (const [bar, label] of [[pages, words.pages], [preferences, words.settings], [files, words.files],
        [featureActions, words.actions], [history, words.history], [toolbox, words.tools], [colors, words.colors]] as const) {
        bar.setAttribute('aria-label', t(label));
      }
    }
    undo.disabled = state.busy || !app.surface.canUndo;
    redo.disabled = state.busy || !app.surface.canRedo;
    removeTabstop();

    if (language || level !== previous?.settings.level || state.toolId !== previous?.toolId || state.registryVersion !== previous?.registryVersion) {
      const controls = tools.all().filter(tool => tool.level <= level).map(tool => {
        const element = button(tool.label, tool.icon, () => app.selectTool(tool), 'tool');
        element.dataset.focus = tool.id;
        element.dataset.tool = tool.id;
        pressed(element, state.toolId === tool.id);
        return element;
      });
      replaceControls(toolbox, controls);
      refreshTools();
    }

    if (language || state.toolId !== previous?.toolId || state.color !== previous.color ||
      level !== previous.settings.level || state.options !== previous.options || state.registryVersion !== previous.registryVersion) {
      options.update(app.tool, state, (id, value) => app.setOption(id, value), spec => app.option(app.tool, spec));
    }

    if (language || state.color !== previous?.color || state.pickingColor !== previous?.pickingColor) {
      const swatches = palette.map(({ label, color }) => {
        const element = button(label, undefined, () => app.setColor(color), 'swatch');
        element.style.setProperty('--swatch', color);
        element.dataset.focus = color;
        element.prepend(h('span', 'paint-chip'));
        pressed(element, color === state.color);
        return element;
      });
      const picker = button(words.picker, icons.eyedropper, () => app.togglePicker(), 'palette-action');
      const mix = button(words.mix, icons.custom, () => mixColor(app), 'palette-action');
      const paletteColor = palette.some(item => item.color === state.color);
      pressed(picker, state.pickingColor);
      pressed(mix, !paletteColor);
      picker.dataset.focus = 'picker';
      mix.dataset.focus = 'mix';
      if (!paletteColor) mix.style.setProperty('--custom-color', state.color);
      replaceControls(colors, [...swatches, picker, mix]);
      refreshColors();
    }
    hint.textContent = t(state.hint);
  }

  const refreshPages = roving(pages, words.pages);
  const refreshPreferences = roving(preferences, words.settings);
  const refreshFiles = roving(files, words.files);
  const refreshActions = roving(featureActions, words.actions);
  const refreshTools = roving(toolbox, words.tools);
  const refreshColors = roving(colors, words.colors);
  app.store.subscribe(render);
  render(app.store.get());

  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || app.store.get().busy || document.querySelector('dialog[open]')) return;
    if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      app.input.cancel();
      app.cancelPicker();
    } else if ((event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y')) {
      event.preventDefault();
      if (key === 'y' || event.shiftKey) app.redo();
      else app.undo();
    } else if (app.input.key(event)) event.preventDefault();
  });
}
