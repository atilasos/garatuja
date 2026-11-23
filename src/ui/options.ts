import { t } from '../core/i18n';
import type { State } from '../core/store';
import type { ChoiceItem, L10n, OptionSpec, Tool } from '../core/types';
import { button, h, pressed, replaceControls, roving } from './dom';
import { icon, icons } from './icons';

export function choices(spec: Extract<OptionSpec, { kind: 'choice' }>, level: 1 | 2) {
  return (typeof spec.items === 'function' ? spec.items() : spec.items).filter(choice => (choice.level ?? 1) <= level);
}

const sizeNames: L10n[] = [
  { pt: 'Mínimo', en: 'Smallest' }, { pt: 'Pequeno', en: 'Small' }, { pt: 'Médio', en: 'Medium' },
  { pt: 'Grande', en: 'Large' }, { pt: 'Máximo', en: 'Largest' },
];

export type OptionSetter = (id: string, value: string | boolean | number) => void;

function choiceButton(item: ChoiceItem, spec: OptionSpec, color: string, selected: boolean, set: OptionSetter) {
  const element = button(item.label, item.icon, () => set(spec.id, item.value), 'choice');
  if (item.preview) {
    const preview = h('canvas', 'choice-preview');
    preview.width = 120;
    preview.height = 64;
    preview.setAttribute('aria-hidden', 'true');
    const context = preview.getContext('2d');
    if (context) item.preview(context, preview.width, preview.height, color);
    element.prepend(preview);
  }
  element.dataset.focus = spec.id + ':' + item.value;
  pressed(element, selected);
  return element;
}

function groups(items: ChoiceItem[]) {
  const grouped = new Map<string, { label?: L10n; items: ChoiceItem[] }>();
  for (const item of items) {
    const key = item.group?.pt ?? '';
    const group = grouped.get(key) ?? { label: item.group, items: [] };
    group.items.push(item);
    grouped.set(key, group);
  }
  return grouped.values();
}

export class OptionsPanel {
  readonly element = h('aside', 'options panel');
  private readonly title = h('h2', 'panel-title');
  private readonly list = h('div', 'options-scroll');
  private readonly controls = h('div', 'scroll-controls');
  private readonly up = button({ pt: 'Subir', en: 'Scroll up' }, icons.up, () => this.scroll(-1));
  private readonly down = button({ pt: 'Descer', en: 'Scroll down' }, icons.down, () => this.scroll(1));
  private readonly observer = new ResizeObserver(() => this.updateScroll());
  private tool?: Tool;

  constructor() {
    this.controls.append(this.up, this.down);
    this.element.append(this.title, this.list, this.controls);
    this.observer.observe(this.list);
    this.list.addEventListener('scroll', () => this.updateScroll());
  }

  update(tool: Tool, state: State, set: OptionSetter, value: (spec: OptionSpec) => string | number | boolean) {
    const top = tool === this.tool ? this.list.scrollTop : 0;
    this.tool = tool;
    this.title.textContent = t({ pt: 'Opções', en: 'Options' });
    this.element.setAttribute('aria-label', this.title.textContent);
    const sections: HTMLElement[] = [];
    for (const spec of tool.options ?? []) {
      const current = value(spec);
      const label = h('h3', 'option-title', t(spec.label));
      if (spec.kind === 'size') {
        const row = h('div', 'size-choices');
        const format = (level: number): L10n => ({ pt: `Tamanho ${level}`, en: `Size ${level}` });
        spec.steps.forEach((step, index) => {
          const radius = 3 + 2 * index;
          const label = spec.steps.length === sizeNames.length ? sizeNames[index] : format(index + 1);
          const item = button(label, icon(`<circle cx="24" cy="24" r="${radius}" fill="#514236"/>`),
            () => set(spec.id, step), 'size-choice');
          item.dataset.focus = spec.id + ':' + step;
          pressed(item, current === step);
          row.append(item);
        });
        sections.push(h('section', 'option-section', label, row));
        roving(row, spec.label);
      } else if (spec.kind === 'toggle') {
        const option = button(spec.label, spec.icon, () => set(spec.id, !current), 'option-toggle');
        option.dataset.focus = spec.id;
        pressed(option, Boolean(current));
        sections.push(h('section', 'option-section toggle-section', option));
      } else {
        const section = h('section', 'option-section', label);
        for (const group of groups(choices(spec, state.settings.level))) {
          const row = h('div', 'choice-grid', ...group.items.map(item => choiceButton(item, spec, state.color, item.value === current, set)));
          if (group.label) section.append(h('h4', 'choice-group', t(group.label)));
          section.append(row);
          roving(row, group.label ?? spec.label);
        }
        sections.push(section);
      }
    }
    if (!sections.length) sections.push(h('p', 'options-empty', t({ pt: 'Escolhe uma cor na paleta.', en: 'Pick a color from the palette.' })));
    replaceControls(this.list, sections);
    this.list.scrollTop = top;
    this.updateScroll();
  }

  private scroll(direction: number) {
    this.list.scrollBy({ top: direction * 166, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  private updateScroll() {
    const available = this.list.clientHeight + this.controls.offsetHeight;
    this.controls.hidden = this.list.scrollHeight <= available + 1;
    this.up.disabled = this.list.scrollTop < 1;
    this.down.disabled = this.list.scrollTop + this.list.clientHeight >= this.list.scrollHeight - 1;
  }
}
