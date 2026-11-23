import { t, speak } from '../core/i18n';
import { tools } from '../core/registry';
import { toolAllowed, type State } from '../core/store';
import type { L10n } from '../core/types';
import { printLabel, printWork } from '../features/book/print';
import { showWorkDetails } from '../features/gallery/save';
import { editWriting, writingStrip } from '../features/book/writing';
import { pageStrip } from '../features/pages/strip';
import type { App, WorkAction } from './app';
import { art, button, h, pressed, replaceControls, roving, unavailable } from './dom';
import { icons } from './icons';
import { OptionsPanel } from './options';
import { colorName, palette } from './palette';
import { revealInStrip, scrollCue } from './scroll-cue';
import { untitled } from './work-fields';
import { mixColor } from './color-mixer';

const words = {
  tools: { pt: 'Ferramentas', en: 'Tools' },
  colors: { pt: 'Cores', en: 'Colors' },
  actions: { pt: 'Ações do trabalho', en: 'Work actions' },
  files: { pt: 'Trabalho', en: 'Work' },
  history: { pt: 'Histórico', en: 'History' },
  undo: { pt: 'Desfazer', en: 'Undo' },
  redo: { pt: 'Refazer', en: 'Redo' },
  settings: { pt: 'Definições', en: 'Settings' },
  listen: { pt: 'Ouvir', en: 'Listen' },
  paper: { pt: 'Folha de desenho', en: 'Drawing paper' },
  writing: { pt: 'O meu texto', en: 'My text' },
  picker: { pt: 'Conta-gotas', en: 'Eyedropper' },
  mix: { pt: 'Misturar cor', en: 'Mix color' },
} satisfies Record<string, L10n>;

function showHelpOnFocus(app: App, control: HTMLButtonElement, hint: L10n) {
  const show = () => {
    if (!app.surface.inGesture && control.getAttribute('aria-disabled') !== 'true') app.store.set({ hint });
  };
  control.addEventListener('pointerenter', show);
  control.addEventListener('focusin', show);
}

function actionButton(app: App, action: WorkAction) {
  const label = action.id === 'present' ? { pt: 'Apresentar', en: 'Present' } : action.label;
  const control = button(label, action.icon, () => app.run(() => action.run(app)));
  control.setAttribute('aria-label', t(action.label));
  if (action.hint) showHelpOnFocus(app, control, action.hint);
  control.dataset.focus = action.id;
  return control;
}

export function mountShell(app: App, root: HTMLElement) {
  const title = h('strong', 'work-title authored-text');
  const author = h('span', 'work-author authored-text');
  const card = h('button', 'work-card', art(icons.open), title, author);
  card.type = 'button';
  showHelpOnFocus(app, card, { pt: 'Dá um nome ao trabalho e diz quem o fez e para quem é.',
    en: 'Name the work and say who made it and who it is for.' });
  card.addEventListener('click', () => showWorkDetails(app));
  const className = h('small', 'class-name authored-text');
  const brand = h('div', 'brand', art(icons.pingo), h('div', '', 'Garatuja', className));
  const pages = pageStrip(app);
  const preferences = h('div', 'preferences');
  const files = h('div', 'file-actions');
  const featureActions = h('div', 'feature-actions');
  const printFiles = h('div', 'print-file');
  const writing = writingStrip(app);
  const header = h('header', 'workbar', brand, card, pages, featureActions);
  const history = h('div', 'history-actions');
  const toolbox = h('div', 'tool-grid');
  const toolDeck = h('div', 'tool-deck', toolbox);
  scrollCue(toolDeck);
  scrollCue(featureActions);
  const toolsPanel = h('aside', 'tools panel', toolDeck, history, files);
  const options = new OptionsPanel();
  const sheetArea = h('div', 'sheet-area', app.surface.element, writing);
  const stage = h('main', 'stage', sheetArea);
  new ResizeObserver(() => {
    stage.style.setProperty('--sheet-width', app.surface.element.getBoundingClientRect().width + 'px');
  }).observe(app.surface.element);
  const keyboardCursor = h('span', 'keyboard-cursor');
  keyboardCursor.hidden = true;
  app.surface.element.append(keyboardCursor);
  const workspace = h('div', 'workspace', toolsPanel, stage, options.element);
  const stacked = matchMedia('(orientation: portrait), (max-width: 800px)');
  const arrangeFocus = () => {
    workspace.prepend(stacked.matches ? stage : toolsPanel);
    if (stacked.matches) {
      toolsPanel.append(files);
      toolDeck.append(printFiles);
    } else {
      toolsPanel.append(files);
      files.append(printFiles);
    }
  };
  arrangeFocus();
  stacked.addEventListener('change', arrangeFocus);
  const colors = h('div', 'palette');
  const paletteControls = h('div', 'palette-controls');
  const colorRow = h('div', 'color-row', colors, paletteControls);
  scrollCue(colors);
  colors.addEventListener('wheel', event => {
    if (event.ctrlKey || event.deltaX || colors.scrollWidth <= colors.clientWidth) return;
    const left = colors.scrollLeft;
    colors.scrollLeft += event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1);
    if (colors.scrollLeft !== left) event.preventDefault();
  }, { passive: false });
  const hint = h('p', 'hint');
  hint.id = 'pingo-hint';
  hint.setAttribute('role', 'status');
  const help = h('div', 'help');
  const helpCopy = h('div', 'help-copy', hint);
  const footer = h('footer', 'footer', colorRow, help);
  const narrowDesk = matchMedia('(max-width: 540px)');
  const arrangePalette = () => {
    if (narrowDesk.matches) options.element.before(colorRow);
    else footer.prepend(colorRow);
  };
  arrangePalette();
  narrowDesk.addEventListener('change', arrangePalette);
  const removeTabstop = roving(history, words.history);
  let actions: WorkAction[] = [];
  let actionButtons: [WorkAction, HTMLButtonElement][] = [];
  let undo: HTMLButtonElement;
  let redo: HTMLButtonElement;

  root.append(header, workspace, footer, app.toasts.element);
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

  const busyHint = { pt: 'Espera que a folha esteja pronta.', en: 'Wait until the paper is ready.' };

  function render(state: State, previous?: State) {
    const { locale, level } = state.settings;
    const language = !previous || locale !== previous.settings.locale;
    const settings = language || state.settings !== previous?.settings;
    root.classList.toggle('simple-desk', level === 1);
    root.classList.toggle('writing-visible', !state.settings.textCollapsed);
    app.surface.element.classList.toggle('large-cursor', state.settings.largeCursor);
    app.surface.element.classList.toggle('picking', state.pickingColor);
    app.surface.element.inert = state.busy;
    className.textContent = state.settings.className;
    title.textContent = state.project.title.trim() || t(untitled);
    title.classList.toggle('authored-text', Boolean(state.project.title.trim()));
    author.textContent = state.project.author.trim();
    author.hidden = !author.textContent;
    card.disabled = state.busy;
    card.setAttribute('aria-label', [t({ pt: 'Dados do trabalho', en: 'Work details' }),
      title.textContent, author.textContent].filter(Boolean).join(', '));

    if (settings) {
      const sound = state.settings.sound;
      const soundLabel = sound ? { pt: 'Som ligado', en: 'Sound on' } : { pt: 'Som desligado', en: 'Sound off' };
      const soundToggle = button({ pt: 'Som', en: 'Sound' }, sound ? icons.sound : icons.mute, () => app.configure({ sound: !sound }));
      soundToggle.setAttribute('aria-label', t(soundLabel));
      soundToggle.dataset.focus = 'sound';
      showHelpOnFocus(app, soundToggle, sound
        ? { pt: 'Toca para desligar os sons do ateliê.', en: 'Tap to turn the studio sounds off.' }
        : { pt: 'Toca para ligar os sons do ateliê.', en: 'Tap to turn the studio sounds on.' });
      pressed(soundToggle, sound);
      const settingsButton = button(words.settings, icons.settings, () => app.openScreen('settings.child'));
      settingsButton.dataset.focus = 'settings';
      showHelpOnFocus(app, settingsButton, { pt: 'Escolhe como queres usar a Garatuja.', en: 'Choose how you want to use Garatuja.' });
      replaceControls(preferences, [soundToggle, settingsButton]);
      refreshPreferences();
    }

    const nextActions = app.workActions;
    if (language || settings || nextActions.length !== actions.length || nextActions.some((action, i) => action !== actions[i])) {
      actions = nextActions;
      actionButtons = actions.map(action => [action, actionButton(app, action)]);
      const print = button(printLabel, icons.print, () => app.run(() => printWork(app)));
      print.dataset.focus = 'print';
      showHelpOnFocus(app, print, { pt: 'Prepara uma página ou o livro inteiro para imprimir.',
        en: 'Prepare a page or the whole book for printing.' });
      const basic = actionButtons.filter(([action]) => action.placement === 'files').map(([, control]) => control);
      replaceControls(printFiles, state.settings.allowPrint ? [print] : []);
      replaceControls(files, stacked.matches ? basic : [...basic, printFiles]);
      const text = button(words.writing, icons.text, () => editWriting(app));
      text.dataset.focus = 'writing';
      showHelpOnFocus(app, text, { pt: 'Escreve o texto que esta página ilustra.', en: 'Write the text this page illustrates.' });
      replaceControls(featureActions, [text, ...actionButtons.filter(([action]) => action.placement !== 'files').map(([, control]) => control),
        ...(state.settings.textCollapsed ? [writing] : [])]);
      if (!state.settings.textCollapsed && writing.parentElement !== sheetArea) sheetArea.append(writing);
      refreshFiles();
      refreshActions();
    }
    const wait = state.busy ? busyHint : undefined;
    const say = (message: L10n) => app.say(message);
    for (const [action, control] of actionButtons) {
      unavailable(control, wait ?? (action.unavailable?.(app)), say);
    }
    for (const control of [printFiles.querySelector<HTMLButtonElement>('[data-focus="print"]'), featureActions.querySelector<HTMLButtonElement>('[data-focus="writing"]')]) {
      if (control) unavailable(control, wait, say);
    }
    refreshFiles();
    refreshActions();

    if (language) {
      undo = button(words.undo, icons.undo, () => app.undo());
      redo = button(words.redo, icons.redo, () => app.redo());
      undo.dataset.focus = 'undo';
      showHelpOnFocus(app, undo, { pt: 'Volta atrás um passo.', en: 'Go back one step.' });
      showHelpOnFocus(app, redo, { pt: 'Volta a pôr o que tiraste.', en: 'Put back what you took away.' });
      redo.dataset.focus = 'redo';
      replaceControls(history, [undo, redo]);
      toolsPanel.setAttribute('aria-label', t(words.tools));
      app.surface.element.setAttribute('aria-label', t(words.paper));
      const listen = button(words.listen, icons.sound, () => {
        speak(app.store.get().hint, () => app.notify({
          pt: 'A leitura precisa de uma voz instalada neste dispositivo.',
          en: 'Reading aloud needs a voice installed on this device.',
        }));
      });
      help.replaceChildren(art(icons.pingo), helpCopy, listen, preferences);
      refreshPreferences();

    }
    undo.setAttribute('aria-busy', String(state.busy));
    redo.setAttribute('aria-busy', String(state.busy));
    unavailable(undo, wait ?? (!app.canUndo ? { pt: 'Ainda não há nada para desfazer.', en: 'There’s nothing to undo yet.' } : undefined), say);
    unavailable(redo, wait ?? (!app.surface.canRedo ? { pt: 'Desfaz um passo para o poderes refazer.', en: 'Undo a step before redoing it.' } : undefined), say);
    removeTabstop();

    if (language || level !== previous?.settings.level || JSON.stringify(state.settings.disabledTools) !== JSON.stringify(previous?.settings.disabledTools) || state.toolId !== previous?.toolId || state.registryVersion !== previous?.registryVersion) {
      const controls = tools.all().filter(tool => toolAllowed(state.settings, tool)).map(tool => {
        const element = button(tool.label, tool.icon, () => app.selectTool(tool), 'tool');
        element.dataset.focus = tool.id;
        element.dataset.tool = tool.id;
        pressed(element, state.toolId === tool.id);
        return element;
      });
      replaceControls(toolbox, controls);
      refreshTools();
      if (state.toolId !== previous?.toolId) requestAnimationFrame(() => revealInStrip(toolDeck, toolbox.querySelector('[aria-pressed="true"]')));
    }
    const activeToolButton = toolbox.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (activeToolButton) activeToolButton.title = t(app.toolHint());

    if (language || state.toolId !== previous?.toolId || state.color !== previous.color ||
      level !== previous.settings.level || state.settings.disabledTools !== previous.settings.disabledTools || state.options !== previous.options || state.registryVersion !== previous.registryVersion) {
      options.update(app.tool, state, (id, value) => app.setOption(id, value), hint => { if (!app.surface.inGesture) app.say(hint); }, spec => app.option(app.tool, spec), app.renderOptions());
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
      showHelpOnFocus(app, mix, paletteColor ? { pt: 'Escolhe uma cor para juntar à paleta.', en: 'Choose a color to add to the palette.' } : colorName(state.color));
      if (!paletteColor) mix.style.setProperty('--custom-color', state.color);
      replaceControls(colors, swatches);
      replaceControls(paletteControls, [picker, mix]);
      refreshColors();
      if (state.color !== previous?.color) requestAnimationFrame(() => revealInStrip(colors, colors.querySelector('[aria-pressed="true"]')));
    }
    hint.textContent = t(state.hint);
  }

  const refreshPreferences = roving(preferences, words.settings);
  const refreshFiles = roving(files, words.files);
  const refreshActions = roving(featureActions, words.actions);
  const refreshTools = roving(toolbox, words.tools);
  const refreshColors = roving(colorRow, words.colors);
  app.store.subscribe(render);
  render(app.store.get());

  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || document.querySelector('dialog[open]')) return;
    const key = event.key.toLowerCase();
    const shortcut = (event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y');
    if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (app.store.get().busy) {
      if (shortcut) { event.preventDefault(); app.say(busyHint); }
      return;
    }
    if (key === 'escape') {
      app.cancelGesture();
      app.cancelPicker();
    } else if (shortcut) {
      event.preventDefault();
      if (key === 'y' || event.shiftKey) app.redo();
      else app.undo();
    } else if (app.input.key(event)) event.preventDefault();
  });
}
