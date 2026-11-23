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
  private readonly fixed = h('div', 'options-fixed');
  private readonly list = h('div', 'options-scroll');
  private readonly controls = h('div', 'scroll-controls');
  private readonly up = button({ pt: 'Subir', en: 'Scroll up' }, icons.up, () => this.scroll(-1));
  private readonly down = button({ pt: 'Descer', en: 'Scroll down' }, icons.down, () => this.scroll(1));
  private readonly refreshScroll = roving(this.controls, { pt: 'Percorrer opções', en: 'Scroll through options' });
  private readonly observer = new ResizeObserver(() => this.updateScroll());
  private tool?: Tool;

  constructor() {
    this.controls.append(this.up, this.down);
    this.element.append(this.fixed, this.list, this.controls);
    this.observer.observe(this.list);
    this.list.addEventListener('scroll', () => this.updateScroll());
  }

  update(tool: Tool, state: State, set: OptionSetter, say: (hint: L10n) => void, value: (spec: OptionSpec) => string | number | boolean, custom?: HTMLElement) {
    const top = tool === this.tool ? this.list.scrollTop : 0;
    const left = tool === this.tool ? this.list.scrollLeft : 0;
    this.tool = tool;
    this.up.setAttribute('aria-label', t({ pt: 'Subir', en: 'Scroll up' }));
    this.down.setAttribute('aria-label', t({ pt: 'Descer', en: 'Scroll down' }));
    this.up.querySelector('.button-label')!.textContent = t({ pt: 'Subir', en: 'Scroll up' });
    this.down.querySelector('.button-label')!.textContent = t({ pt: 'Descer', en: 'Scroll down' });
    this.element.setAttribute('aria-label', t({ pt: 'Opções', en: 'Options' }));
    this.controls.setAttribute('aria-label', t({ pt: 'Percorrer opções', en: 'Scroll through options' }));
    const fixed: HTMLElement[] = [];
    const sections: HTMLElement[] = [];
    if (custom) sections.push(custom);
    for (const spec of custom ? [] : tool.options ?? []) {
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
        fixed.push(h('section', 'option-section', label, row));
        roving(row, spec.label);
      } else if (spec.kind === 'toggle') {
        const option = button(spec.label, spec.icon, () => set(spec.id, !current), 'option-toggle');
        option.dataset.focus = spec.id;
        pressed(option, Boolean(current));
        sections.push(h('section', 'option-section toggle-section', option));
      } else {
        const section = h('section', 'option-section', label);
        const categories = h('div', 'option-categories');
        const categoryLabel = { pt: 'Categorias', en: 'Categories' };
        for (const group of groups(choices(spec, state.settings.level))) {
          const row = h('div', 'choice-grid', ...group.items.map(item => choiceButton(item, spec, state.color, item.value === current, (id, value) => {
            set(id, value);
            if (item.hint) say(item.hint);
          })));
          const block = h('div', 'choice-block', group.label ? h('h4', 'option-title choice-group', t(group.label)) : null, row);
          if (group.label) {
            const tab = button(group.label, undefined, () => {
              if (this.list.scrollWidth > this.list.clientWidth) {
                this.list.scrollLeft += block.getBoundingClientRect().left - this.list.getBoundingClientRect().left - 4;
              } else {
                this.list.scrollTop += block.getBoundingClientRect().top - this.list.getBoundingClientRect().top - 4;
              }
            });
            tab.dataset.focus = spec.id + ':category:' + group.label.pt;
            tab.setAttribute('aria-label', t({ pt: 'Categoria: ' + group.label.pt, en: 'Category: ' + group.label.en }));
            categories.append(tab);
          }
          section.append(block);
          roving(row, group.label ?? spec.label);
        }
        if (categories.childElementCount > 1) {
          fixed.push(categories);
          roving(categories, categoryLabel);
        }
        sections.push(section);
      }
    }
    if (!sections.length && !fixed.length) sections.push(h('p', 'options-empty', t({ pt: 'Escolhe uma cor na paleta.', en: 'Pick a color from the palette.' })));
    const categoryOffsets = [...this.fixed.querySelectorAll('.option-categories')].map(row => row.scrollLeft);
    replaceControls(this.fixed, fixed);
    if (top || left || categoryOffsets.length) {
      this.fixed.querySelectorAll('.option-categories').forEach((row, i) => { row.scrollLeft = categoryOffsets[i] ?? 0; });
    }
    replaceControls(this.list, sections);
    this.list.scrollTop = top;
    this.list.scrollLeft = left;
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
    this.refreshScroll();
  }
}
