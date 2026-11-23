import { download } from '../features/exchange/download';
import { serializeWorks } from '../features/exchange/format';
import { button, h } from './dom';
import { icons } from './icons';
import { Documents } from '../core/document';
import { setLocale, speak, t } from '../core/i18n';
import { PointerInput } from '../core/pointer';
import { tools } from '../core/registry';
import { Sounds } from '../core/sound';
import type { Storage } from '../core/storage';
import { readEditor, readSettings, settingsKey, Store, toolAllowed, writeSettings, type Settings } from '../core/store';
import type { Surface } from '../core/surface';
import type { IconSvg, L10n, OptionSpec, ProjectRecord, SoundId, Tool } from '../core/types';
import { openModal, type ModalOptions } from './modal';
import { choices, type CustomOptions } from './options';
import { colorName, palette } from './palette';
import { Toasts, type ToastAction } from './toast';

export interface WorkAction {
  id: string;
  label: L10n;
  hint?: L10n;
  icon: IconSvg;
  order?: number;
  placement?: 'files' | 'work';
  unavailable?(app: App): L10n | undefined;
  run(app: App): void | Promise<void>;
}

export interface Feature {
  id: string;
  mount(app: App): void;
}

type Screen = (app: App) => void | Promise<void>;

const failed: L10n = {
  pt: 'Não consegui concluir esta ação. Podes tentar outra vez.',
  en: 'I couldn’t finish that action. You can try again.',
};
const saveFailed: L10n = {
  pt: 'Não consegui guardar. O teu desenho continua aqui.',
  en: 'I couldn’t save. Your drawing is still here.',
};
const retry = { pt: 'Tentar de novo', en: 'Try again' };

export class App {
  readonly store: Store;
  readonly documents: Documents;
  readonly toasts = new Toasts();
  readonly input: PointerInput;
  private readonly recovery = new Set<HTMLElement>();
  private readonly discardDeviceData = new Set<() => void>();
  isTrashed: (id: string) => boolean = () => false;
  private saveFailed = false;
  private readonly sounds = new Sounds();
  private readonly actions = new Map<string, WorkAction>();
  private readonly optionPanels = new Map<string, (app: App) => CustomOptions>();
  private readonly screens = new Map<string, Screen>();

  constructor(readonly surface: Surface, readonly storage: Storage, project: ProjectRecord, pageId: string, settings: Settings, persisted: boolean) {
    const fallback = tools.get('paint');
    if (!fallback) throw new Error('The paint tool is required');
    const editor = readEditor({ toolId: fallback.id, color: palette[0].color, options: {} });
    const savedTool = tools.get(editor.toolId);
    const tool = savedTool && toolAllowed(settings, savedTool) ? savedTool : fallback;
    this.store = new Store({ ...editor, project, pageId, toolId: tool.id, hint: tool.hint, settings,
      busy: false, pickingColor: false, registryVersion: 0 });
    if (tool.optionHint) this.store.set({ hint: this.toolHint(tool) });
    this.store.subscribe((state, previous) => {
      const { toolId, color, options } = state;
      if (toolId === previous.toolId && color === previous.color && options === previous.options) return;
      try {
        if (toolId !== previous.toolId) localStorage.setItem('garatuja.editor.toolId', JSON.stringify(toolId));
        if (color !== previous.color) localStorage.setItem('garatuja.editor.color', JSON.stringify(color));
        for (const [scope, values] of Object.entries(options)) {
          for (const [key, value] of Object.entries(values)) {
            if (previous.options[scope]?.[key] !== value) {
              localStorage.setItem('garatuja.editor.option.' + JSON.stringify([scope, key]), JSON.stringify(value));
            }
          }
        }
      } catch {
        // Preference writes are optional when localStorage is unavailable.
      }
    });
    this.sounds.enabled = settings.sound;
    setLocale(settings.locale);
    this.input = new PointerInput(surface, this.bind(tool), () => this.store.get().settings.fixedClick, () => this.store.set({}));
    this.documents = new Documents(this.store, surface, storage, this.input, persisted, ok => {
      this.saveFailed = !ok;
      for (const notice of this.recovery) notice.hidden = ok;
    }, message => this.notify(message));
    window.addEventListener('storage', event => {
      if (event.key === null || event.key === settingsKey || event.key.startsWith(settingsKey + '.')) this.applySettings(readSettings());
    });
    this.toasts.element.append(this.saveRecovery());
    storage.changes.addEventListener('message', event => {
      if (event.data !== null) return;
      this.documents.stopSaving();
      this.releaseDeviceData();
      location.reload();
    });
  }

  saveRecovery() {
    const fileLabel = { pt: 'Guardar num ficheiro', en: 'Save to a file' };
    const notice = h('div', 'toast save-recovery',
      this.toasts.localize(h('span', 'toast-message', t(saveFailed)), saveFailed),
      this.toasts.localize(button(retry, icons.undo, () => this.run(() => this.documents.save())), retry),
      this.toasts.localize(button(fileLabel, icons.save, () => this.run(async () => {
        const project = this.documents.snapshot();
        download(await serializeWorks([project, ...this.documents.recoveryProjects]), project.title, 'garatuja');
      })), fileLabel));
    notice.setAttribute('role', 'status');
    notice.hidden = !this.saveFailed;
    this.recovery.add(notice);
    return notice;
  }

  removeSaveRecovery(notice: HTMLElement) {
    this.recovery.delete(notice);
  }

  onClearData(discard: () => void) {
    this.discardDeviceData.add(discard);
  }

  async clearData() {
    this.documents.stopSaving();
    try {
      await this.storage.clear();
    } catch (error) {
      this.documents.resumeSaving();
      throw error;
    }
    this.releaseDeviceData();
  }

  private releaseDeviceData() {
    for (const discard of this.discardDeviceData) discard();
  }

  get tool() {
    const tool = tools.get(this.store.get().toolId);
    if (!tool) throw new Error('The active tool is unavailable');
    return tool;
  }

  registerOptions(toolId: string, render: (app: App) => CustomOptions) {
    this.optionPanels.set(toolId, render);
  }

  renderOptions() {
    return this.optionPanels.get(this.tool.id)?.(this);
  }

  get workActions() {
    return [...this.actions.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  private bind(tool: Tool) {
    const context = this.surface.context({
      color: () => this.store.get().color,
      opt: id => {
        const spec = tool.options?.find(option => option.id === id);
        if (!spec) throw new Error(`Unknown option ${tool.id}.${id}`);
        return this.option(tool, spec);
      },
      sound: id => this.sounds.play(id),
      say: message => this.say(message),
    });
    return { tool, context };
  }

  option(tool: Tool, spec: OptionSpec) {
    const { options, settings } = this.store.get();
    const scope = spec.kind === 'choice' && spec.shared ? '@' + spec.shared : tool.id;
    const current = options[scope]?.[spec.id] ?? spec.default;
    if (spec.kind === 'size') return typeof current === 'number' && spec.steps.includes(current) ? current : spec.default;
    if (spec.kind === 'toggle') return typeof current === 'boolean' ? current : spec.default;
    if (spec.kind === 'choice') {
      const available = choices(spec, settings.level);
      if (!available.some(item => item.value === current)) {
        return available.find(item => item.value === spec.default)?.value ?? available[0]?.value ?? spec.default;
      }
    }
    return current;
  }

  setOption(id: string, value: string | number | boolean) {
    const { options, toolId } = this.store.get();
    const spec = this.tool.options?.find(candidate => candidate.id === id);
    const scope = spec?.kind === 'choice' && spec.shared ? '@' + spec.shared : toolId;
    this.input.changeAppearance(() => this.store.set({ options: { ...options, [scope]: { ...options[scope], [id]: value } } }));
    if (this.tool.optionHint) this.say(this.toolHint());
    this.sounds.play('tap');
  }

  toolHint(tool = this.tool) {
    return tool.optionHint?.(id => {
      const spec = tool.options?.find(option => option.id === id);
      return spec ? this.option(tool, spec) : '';
    }) ?? tool.hint;
  }

  chooseTool(id: string) {
    const tool = tools.get(id);
    if (tool && tool.id !== this.tool.id) this.selectTool(tool);
  }

  selectTool(tool: Tool) {
    if (!toolAllowed(this.store.get().settings, tool)) return;
    if (tool.id === this.tool.id) { this.say(this.toolHint(tool)); return; }
    this.input.flushPending();
    this.cancelPicker();
    const hint = this.toolHint(tool);
    this.store.set({ toolId: tool.id, hint });
    this.input.select(this.bind(tool));
    this.sounds.play('tap');
    if (this.store.get().settings.readAloud) speak({ pt: `${tool.label.pt}. ${hint.pt}`, en: `${tool.label.en}. ${hint.en}` });
  }

  setColor(color: string) {
    this.cancelPicker();
    this.input.changeAppearance(() => this.store.set({ color, hint: colorName(color) }));
  }

  togglePicker() {
    if (this.store.get().pickingColor) { this.cancelPicker(); return; }
    this.input.changeAppearance(() => { this.input.pickColor = point => this.setColor(this.surface.colorAt(point)); });
    this.store.set({ pickingColor: true, hint: { pt: 'Toca numa cor da folha para a apanhar.', en: 'Tap a color on the paper to pick it up.' } });
  }

  cancelPicker() {
    this.input.pickColor = undefined;
    if (this.store.get().pickingColor) this.store.set({ pickingColor: false, hint: this.toolHint() });
  }

  configure(patch: Partial<Settings>) {
    try {
      writeSettings(patch);
      this.applySettings(readSettings());
    } catch {
      const current = this.store.get().settings;
      this.applySettings({ ...current, ...patch, disabledTools: { ...current.disabledTools, ...patch.disabledTools } });
      this.notify({ pt: 'As definições só ficam nesta sessão.', en: 'These settings last for this session.' });
    }
  }

  private applySettings(settings: Settings) {
    const previous = this.store.get().settings;
    if (JSON.stringify(settings) === JSON.stringify(previous)) return;
    if (previous.level !== settings.level || previous.fixedClick !== settings.fixedClick || !toolAllowed(settings, this.tool)) {
      this.input.flushPending();
    }
    setLocale(settings.locale);
    this.sounds.enabled = settings.sound;
    this.store.set({ settings });
    if (previous.locale !== settings.locale) this.toasts.refreshLocale();
    if (!toolAllowed(settings, this.tool)) this.chooseTool('paint');
  }

  say(message: L10n) {
    this.store.set({ hint: message });
    if (this.store.get().settings.readAloud) speak(message);
  }

  get canUndo() { return this.input.inGesture || this.tool.hasPendingEdit?.() || this.surface.canUndo; }

  undo() {
    if (this.cancelGesture()) return;
    const tool = this.tool;
    if (tool.hasPendingEdit?.()) {
      const restore = tool.undoPendingEdit?.();
      if (restore) this.surface.rememberUndoneWriting(restore);
    } else if (this.surface.canUndo) {
      this.surface.undo();
    } else return;
    this.say({ pt: 'Voltaste atrás um passo.', en: 'You went back one step.' });
    this.sounds.play('undo');
  }

  cancelGesture() {
    const canceled = this.input.cancel();
    if (canceled) this.store.set({ hint: this.toolHint() });
    return canceled;
  }

  redo() {
    this.cancelGesture();
    if (!this.surface.canRedo) return;
    this.surface.redo();
    this.sounds.play('redo');
    this.say({ pt: 'Voltaste a pôr o que tinhas tirado.', en: 'You put back what you had undone.' });
  }

  run(action: () => unknown) {
    const report = (error: unknown) => {
      console.error(error);
      this.notify(failed, { label: retry, run: () => this.run(action) });
    };
    try {
      void Promise.resolve(action()).catch(report);
    } catch (error) {
      report(error);
    }
  }

  registerAction(action: WorkAction) {
    if (this.actions.has(action.id)) throw new Error(`Duplicate action ID: ${action.id}`);
    this.actions.set(action.id, action);
    this.refresh();
    return () => { this.actions.delete(action.id); this.refresh(); };
  }

  registerScreen(id: string, screen: Screen) {
    if (this.screens.has(id)) throw new Error(`Duplicate screen ID: ${id}`);
    this.screens.set(id, screen);
    return () => { this.screens.delete(id); };
  }

  openScreen(id: string) {
    const screen = this.screens.get(id);
    if (!screen) throw new Error(`Unknown screen: ${id}`);
    this.input.flushPending();
    this.run(() => screen(this));
  }

  refresh() { this.store.set({ registryVersion: this.store.get().registryVersion + 1 }); }

  modal(options: ModalOptions) {
    this.input.flushPending();
    this.cancelPicker();
    return openModal({ ...options, onClose: () => {
      this.store.set({ hint: this.toolHint() });
      options.onClose?.();
    } });
  }

  /** Play one of the interface sounds (silent when sound is off). */
  sound(id: SoundId) { this.sounds.play(id); }

  confirm(message: L10n) {
    const region = document.querySelector<HTMLElement>('dialog[open] .dialog-head') ?? document.querySelector<HTMLElement>('#app .help-copy');
    if (region) this.toasts.confirm(message, region);
  }

  notify(message: L10n, action?: ToastAction) { return this.toasts.show(message, action); }
}
