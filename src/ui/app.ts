import { Documents } from '../core/document';
import { setLocale, speak } from '../core/i18n';
import { PointerInput } from '../core/pointer';
import { tools } from '../core/registry';
import { Sounds } from '../core/sound';
import type { Storage } from '../core/storage';
import { readEditor, Store, type Settings } from '../core/store';
import type { Surface } from '../core/surface';
import type { IconSvg, L10n, OptionSpec, ProjectRecord, Tool } from '../core/types';
import { openModal, type ModalOptions } from './modal';
import { choices } from './options';
import { palette } from './palette';
import { Toasts, type ToastAction } from './toast';

export interface WorkAction {
  id: string;
  label: L10n;
  icon: IconSvg;
  order?: number;
  placement?: 'files' | 'work';
  disabled?(app: App): boolean;
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
  pt: 'O trabalho ainda está na folha. Tenta guardá-lo de novo.',
  en: 'Your work is still on the paper. Try saving it again.',
};
const retry = { pt: 'Tentar de novo', en: 'Try again' };

export class App {
  readonly store: Store;
  readonly documents: Documents;
  readonly toasts = new Toasts();
  readonly input: PointerInput;
  private readonly sounds = new Sounds();
  private readonly actions = new Map<string, WorkAction>();
  private readonly optionPanels = new Map<string, (app: App) => HTMLElement>();
  private readonly screens = new Map<string, Screen>();

  constructor(readonly surface: Surface, readonly storage: Storage, project: ProjectRecord, pageId: string, settings: Settings) {
    const fallback = tools.get('paint');
    if (!fallback) throw new Error('The paint tool is required');
    const editor = readEditor({ toolId: fallback.id, color: palette[0].color, options: {} });
    const savedTool = tools.get(editor.toolId);
    const tool = savedTool && savedTool.level <= settings.level ? savedTool : fallback;
    this.store = new Store({ ...editor, project, pageId, toolId: tool.id, hint: tool.hint, settings,
      busy: false, pickingColor: false, registryVersion: 0 });
    this.store.subscribe((state, previous) => {
      const { toolId, color, options } = state;
      if (toolId === previous.toolId && color === previous.color && options === previous.options) return;
      try {
        localStorage.setItem('garatuja.editor', JSON.stringify({ toolId, color, options }));
      } catch {
        // Preference writes are optional when localStorage is unavailable.
      }
    });
    this.sounds.enabled = settings.sound;
    setLocale(settings.locale);
    this.input = new PointerInput(surface, this.bind(tool), () => this.store.get().settings.fixedClick);
    this.documents = new Documents(this.store, surface, storage, this.input, error => {
      console.error(error);
      this.notify(saveFailed, { label: retry, run: () => this.run(() => this.documents.save()) });
    });
  }

  get tool() {
    const tool = tools.get(this.store.get().toolId);
    if (!tool) throw new Error('The active tool is unavailable');
    return tool;
  }

  registerOptions(toolId: string, render: (app: App) => HTMLElement) {
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
    this.input.cancel();
    this.store.set({ options: { ...options, [scope]: { ...options[scope], [id]: value } } });
    this.sounds.play('tap');
  }

  selectTool(tool: Tool) {
    this.cancelPicker();
    this.store.set({ toolId: tool.id, hint: tool.hint });
    this.input.select(this.bind(tool));
    this.sounds.play('tap');
    if (this.store.get().settings.readAloud) speak(this.store.get().hint);
  }

  setColor(color: string) {
    this.input.cancel();
    this.cancelPicker();
    this.store.set({ color });
  }

  togglePicker() {
    if (this.store.get().pickingColor) { this.cancelPicker(); return; }
    this.input.cancel();
    this.input.pickColor = point => this.setColor(this.surface.colorAt(point));
    this.store.set({ pickingColor: true, hint: { pt: 'Toca numa cor da folha para a apanhar.', en: 'Tap a color on the paper to pick it up.' } });
  }

  cancelPicker() {
    this.input.pickColor = undefined;
    if (this.store.get().pickingColor) this.store.set({ pickingColor: false, hint: this.tool.hint });
  }

  configure(patch: Partial<Settings>) {
    if (patch.level !== undefined || patch.fixedClick !== undefined) this.input.cancel();
    const settings = { ...this.store.get().settings, ...patch };
    setLocale(settings.locale);
    this.sounds.enabled = settings.sound;
    this.store.set({ settings });
    const visible = tools.all().find(tool => tool.level <= settings.level);
    if (this.tool.level > settings.level && visible) this.selectTool(visible);
    try {
      localStorage.setItem('garatuja.settings', JSON.stringify(settings));
    } catch {
      this.notify({ pt: 'As definições só ficam nesta sessão.', en: 'These settings last for this session.' });
    }
  }

  say(message: L10n) {
    this.store.set({ hint: message });
    if (this.store.get().settings.readAloud) speak(message);
  }

  undo() {
    this.input.cancel();
    if (!this.surface.canUndo) return;
    this.surface.undo();
    this.sounds.play('undo');
  }

  redo() {
    this.input.cancel();
    if (!this.surface.canRedo) return;
    this.surface.redo();
    this.sounds.play('redo');
  }

  run(action: () => void | Promise<void>) {
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
    this.run(() => screen(this));
  }

  refresh() { this.store.set({ registryVersion: this.store.get().registryVersion + 1 }); }

  modal(options: ModalOptions) {
    this.input.cancel();
    return openModal(options);
  }

  notify(message: L10n, action?: ToastAction) { this.toasts.show(message, action); }
}
