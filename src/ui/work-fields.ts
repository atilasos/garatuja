import { t } from '../core/i18n';
import type { L10n } from '../core/types';
import type { App } from './app';
import { button, h } from './dom';
import { icons } from './icons';

export const titleLabel = { pt: 'Título', en: 'Title' };
export const authorLabel = { pt: 'Autor', en: 'Author' };
const audienceLabel = { pt: 'Para quem é?', en: 'Who is it for?' };
const textLabel = { pt: 'O meu texto', en: 'My text' };
export const untitled = { pt: 'Sem título', en: 'Untitled' };

export class WorkField {
  readonly input = h('input');
  private readonly caption = h('span');
  readonly element = h('label', 'work-field', this.caption, this.input);

  constructor(private label: L10n, private placeholder: L10n, change: (value: string) => void) {
    this.input.addEventListener('input', () => change(this.input.value));
  }

  update(value: string) {
    this.caption.textContent = t(this.label);
    this.input.placeholder = t(this.placeholder);
    if (this.input.value !== value) this.input.value = value;
  }
}

export function editWriting(app: App) {
  const audience = new WorkField(audienceLabel, { pt: 'Escreve para quem é', en: 'Write who it is for' }, value => app.documents.editProject({ audience: value }));
  audience.update(app.store.get().project.audience);
  const text = h('textarea', 'writing');
  text.value = app.documents.page.text;
  text.autofocus = true;
  text.addEventListener('input', () => app.documents.editText(text.value));
  app.modal({
    title: textLabel,
    content: h('div', 'dialog-stack', audience.element, h('label', 'work-field', h('span', '', t(textLabel)), text)),
  });
}

export function showSettings(app: App) {
  const settings = app.store.get().settings;
  const labels = {
    fixedClick: { pt: 'Clique fixo', en: 'Click to start and stop' },
    readAloud: { pt: 'Ler a ajuda em voz alta', en: 'Read help aloud' },
    largeCursor: { pt: 'Cursor grande', en: 'Large cursor' },
    highContrast: { pt: 'Alto contraste', en: 'High contrast' },
    leftHanded: { pt: 'Mão esquerda', en: 'Left-handed layout' },
    uppercase: { pt: 'Letras maiúsculas', en: 'Uppercase letters' },
  } satisfies Partial<Record<keyof typeof settings, L10n>>;
  const rows = (Object.keys(labels) as (keyof typeof labels)[]).map(key => {
    const box = h('input');
    box.type = 'checkbox';
    box.checked = settings[key];
    box.addEventListener('change', () => app.configure({ [key]: box.checked }));
    return h('label', 'setting', box, h('span', '', t(labels[key])));
  });
  const locales = [{ id: 'pt', label: { pt: 'Português', en: 'Portuguese' } },
    { id: 'en', label: { pt: 'Inglês', en: 'English' } }] as const;
  const select = h('select');
  for (const locale of locales) {
    const option = h('option', '', t(locale.label));
    option.value = locale.id;
    select.append(option);
  }
  select.value = settings.locale;
  select.addEventListener('change', () => {
    app.configure({ locale: select.value === 'en' ? 'en' : 'pt' });
    close();
  });
  const close = app.modal({
    title: { pt: 'Definições', en: 'Settings' },
    content: h('div', 'dialog-stack', ...rows,
      h('label', 'setting', h('span', '', t({ pt: 'Língua', en: 'Language' })), select)),
  });
}

export function mixColor(app: App) {
  const input = h('input', 'color-input');
  input.type = 'color';
  input.value = app.store.get().color;
  const title = { pt: 'Misturar cor', en: 'Mix color' };
  const close = app.modal({
    title, content: h('div', 'dialog-stack',
      h('label', 'work-field', h('span', '', t({ pt: 'A tua cor', en: 'Your color' })), input),
      button({ pt: 'Usar esta cor', en: 'Use this color' }, icons.custom, () => { app.setColor(input.value); close(); }, 'primary')),
  });
}
