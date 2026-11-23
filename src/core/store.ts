import type { Locale } from './i18n';
import type { L10n, ProjectRecord } from './types';

export const configurableTools = ['stamp', 'magic', 'text', 'label', 'move', 'shapes', 'lines', 'fill'] as const;
export type ConfigurableTool = typeof configurableTools[number];
type ToolPermissions = Partial<Record<ConfigurableTool, boolean>>;

export interface Settings {
  locale: Locale;
  level: 1 | 2;
  sound: boolean;
  fixedClick: boolean;
  readAloud: boolean;
  uppercase: boolean;
  textCollapsed: boolean;
  largeCursor: boolean;
  highContrast: boolean;
  leftHanded: boolean;
  allowPrint: boolean;
  allowImport: boolean;
  /** Class name shown discreetly in the work bar (teacher area). */
  className: string;
  disabledTools: ToolPermissions;
  screenKeyboard: boolean;
  keyboardLayout: 'alphabetical' | 'qwerty';
}

const defaults: Settings = {
  locale: 'pt', level: 2, sound: false, fixedClick: false, readAloud: false, uppercase: false, textCollapsed: false,
  largeCursor: false, highContrast: false, leftHanded: false, allowPrint: true, allowImport: true,
  className: '', disabledTools: {}, screenKeyboard: false, keyboardLayout: 'alphabetical',
};

export const settingsKey = 'garatuja.settings';

function readPreference(key: string): unknown {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? undefined : JSON.parse(stored);
  } catch {
    return undefined;
  }
}

export function writeSettings(patch: Partial<Settings>) {
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'disabledTools') continue;
    localStorage.setItem(settingsKey + '.' + key, JSON.stringify(value));
  }
  for (const [tool, disabled] of Object.entries(patch.disabledTools ?? {})) {
    localStorage.setItem(settingsKey + '.disabledTools.' + tool, JSON.stringify(disabled));
  }
}

export function readSettings(): Settings {
  const settings = { ...defaults, disabledTools: {} as ToolPermissions };
  const old = readPreference(settingsKey);
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = readPreference(settingsKey + '.' + key) ?? (old && typeof old === 'object' ? Reflect.get(old, key) : undefined);
    if (key === 'locale' && (value === 'pt' || value === 'en')) settings.locale = value;
    if (key === 'level' && (value === 1 || value === 2)) settings.level = value;
    if (key === 'className' && typeof value === 'string') settings.className = value.slice(0, 60);
    if (key === 'keyboardLayout' && (value === 'alphabetical' || value === 'qwerty')) settings.keyboardLayout = value;
    if (typeof fallback === 'boolean' && typeof value === 'boolean') Object.assign(settings, { [key]: value });
  }
  for (const tool of configurableTools) {
    if (readPreference(settingsKey + '.disabledTools.' + tool) === true) settings.disabledTools[tool] = true;
  }
  return settings;
}

export function toolAllowed(settings: Settings, tool: { id: string; level: number }) {
  return tool.level <= settings.level && Reflect.get(settings.disabledTools, tool.id) !== true;
}

export interface State {
  project: ProjectRecord;
  pageId: string;
  toolId: string;
  color: string;
  options: Readonly<Record<string, Readonly<Record<string, string | number | boolean>>>>;
  settings: Settings;
  hint: L10n;
  pickingColor: boolean;
  busy: boolean;
  registryVersion: number;
}

export type EditorPreferences = Pick<State, 'toolId' | 'color' | 'options'>;

export function readEditor(fallback: EditorPreferences): EditorPreferences {
  try {
    const saved = readPreference('garatuja.editor');
    const data = Object.assign({}, saved && typeof saved === 'object' ? saved : {}, {
      ...(typeof readPreference('garatuja.editor.toolId') === 'string' ? { toolId: readPreference('garatuja.editor.toolId') } : {}),
      ...(typeof readPreference('garatuja.editor.color') === 'string' ? { color: readPreference('garatuja.editor.color') } : {}),
    });
    const toolId = 'toolId' in data && typeof data.toolId === 'string' ? data.toolId : fallback.toolId;
    const color = 'color' in data && typeof data.color === 'string' && /^#[0-9a-f]{6}$/i.test(data.color) ? data.color : fallback.color;
    const options: Record<string, Record<string, string | number | boolean>> = Object.create(null);
    if ('options' in data && data.options && typeof data.options === 'object') {
      for (const [tool, stored] of Object.entries(data.options)) {
        if (typeof stored !== 'object' || stored === null) continue;
        const entries: Record<string, string | number | boolean> = Object.create(null);
        for (const [key, value] of Object.entries(stored)) {
          if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') entries[key] = value;
        }
        options[tool] = entries;
      }
    }
    const prefix = 'garatuja.editor.option.';
    for (let i = 0; i < localStorage.length; i++) {
      const storedKey = localStorage.key(i);
      if (!storedKey?.startsWith(prefix)) continue;
      const path: unknown = JSON.parse(storedKey.slice(prefix.length));
      const value = readPreference(storedKey);
      if (!Array.isArray(path) || path.length !== 2 || typeof path[0] !== 'string' || typeof path[1] !== 'string') continue;
      if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
        const entries = options[path[0]] ??= Object.create(null) as Record<string, string | number | boolean>;
        entries[path[1]] = value;
      }
    }
    return { toolId, color, options };
  } catch {
    return fallback;
  }
}

export class Store {
  private listeners = new Set<(state: State, previous: State) => void>();

  constructor(private state: State) {}

  get(): State { return this.state; }

  set(patch: Partial<State>) {
    const previous = this.state;
    this.state = { ...previous, ...patch };
    for (const listener of this.listeners) listener(this.state, previous);
  }

  subscribe(listener: (state: State, previous: State) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
