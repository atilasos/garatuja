import type { Locale } from './i18n';
import type { L10n, ProjectRecord } from './types';

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
}

const defaults: Settings = {
  locale: 'pt', level: 2, sound: false, fixedClick: false, readAloud: false, uppercase: false, textCollapsed: false,
  largeCursor: false, highContrast: false, leftHanded: false, allowPrint: true, allowImport: true,
  className: '',
};

export function readSettings(): Settings {
  const settings = { ...defaults };
  try {
    const stored = localStorage.getItem('garatuja.settings');
    if (!stored) return settings;
    const saved: unknown = JSON.parse(stored);
    if (typeof saved !== 'object' || saved === null) return settings;
    for (const [key, value] of Object.entries(saved)) {
      if (key === 'locale' && (value === 'pt' || value === 'en')) settings.locale = value;
      if (key === 'level' && (value === 1 || value === 2)) settings.level = value;
      if (key === 'className' && typeof value === 'string') settings.className = value.slice(0, 60);
      if (Object.hasOwn(defaults, key) && key !== 'locale' && key !== 'level' && typeof value === 'boolean') {
        Object.assign(settings, { [key]: value });
      }
    }
  } catch {
    return settings;
  }
  return settings;
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
    const stored = localStorage.getItem('garatuja.editor');
    if (!stored) return fallback;
    const data: unknown = JSON.parse(stored);
    if (typeof data !== 'object' || data === null) return fallback;
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
