import { t } from '../../core/i18n';
import { stamps, tools } from '../../core/registry';
import { toolAllowed } from '../../core/store';
import { drawStamp, stampImage } from '../../core/tooling/stamp-art';
import type { L10n, StampDef } from '../../core/types';
import { stampIcons } from '../../stamps/ui/icons';
import stampTool, { stampSizes } from '../../tools/stamp';
import type { App } from '../../ui/app';
import { button, h, pressed, roving } from '../../ui/dom';
import { icon, icons } from '../../ui/icons';
import { shadePreview } from '../../ui/options';
import './panel.css';

export const personal = { pt: 'Os meus carimbos', en: 'My stamps' };
const categoriesLabel = { pt: 'Categorias', en: 'Categories' };
const sizeLabel = { pt: 'Tamanho', en: 'Size' };
const angleLabel = { pt: 'Rotação', en: 'Rotation' };
const stampsLabel = { pt: 'Carimbos', en: 'Stamps' };
const sizeNames: L10n[] = [
  { pt: 'Mínimo', en: 'Smallest' }, { pt: 'Pequeno', en: 'Small' }, { pt: 'Médio', en: 'Medium' },
  { pt: 'Grande', en: 'Large' }, { pt: 'Máximo', en: 'Largest' },
];

function stampButton(stamp: StampDef, color: string, select: () => void, selected: boolean, highContrast: boolean) {
  const tile = button(stamp.label, undefined, select, 'choice stamp-tile');
  tile.dataset.focus = 'stamp:' + stamp.id;
  pressed(tile, selected);
  const preview = h('canvas', 'stamp-thumbnail');
  if (stamp.tintable) shadePreview(preview, color, selected, highContrast);
  preview.width = 100;
  preview.height = 80;
  preview.setAttribute('aria-hidden', 'true');
  tile.prepend(preview);
  const ctx = preview.getContext('2d');
  if (ctx) {
    const image = stampImage(stamp);
    const paint = () => {
      drawStamp(ctx, stamp, 50, 40, 76, color);
      tile.removeAttribute('aria-busy');
    };
    if (image.complete) paint();
    else {
      tile.setAttribute('aria-busy', 'true');
      image.addEventListener('load', paint, { once: true });
    }
  }
  return tile;
}

function categoryButton(category: L10n, sample: StampDef | undefined, select: () => void, selected: boolean) {
  const tile = button(category, sample ? undefined : icons.stamp, select, 'choice stamp-category');
  tile.dataset.focus = 'category:' + category.pt;
  pressed(tile, selected);
  if (sample) {
    const img = h('img', 'stamp-category-image');
    img.alt = '';
    img.loading = 'lazy';
    img.src = sample.src;
    tile.prepend(img);
  }
  return tile;
}

function transforms(app: App) {
  const sizeRow = h('div', 'stamp-sizes');
  for (const [index, size] of stampSizes.entries()) {
    const item = button(sizeNames[index], icon(`<circle cx="24" cy="24" r="${4 + index * 3}" fill="#514236"/>`),
      () => app.setOption('size', size), 'stamp-size');
    item.dataset.focus = 'size:' + size;
    pressed(item, app.option(stampTool, stampTool.options[1]) === size);
    sizeRow.append(item);
  }
  roving(sizeRow, sizeLabel);
  if (app.store.get().settings.level === 1) return h('div', 'stamp-transforms',
    h('h3', 'option-title', t(sizeLabel)), sizeRow);
  const toggles = h('div', 'stamp-toggle-row');
  for (const spec of stampTool.options) {
    if (spec.kind !== 'toggle') continue;
    const active = Boolean(app.option(stampTool, spec));
    const control = button(spec.label, spec.icon, () => app.setOption(spec.id, !active), 'stamp-transform');
    control.dataset.focus = spec.id;
    pressed(control, active);
    toggles.append(control);
  }

  const rotation = Number(app.option(stampTool, stampTool.options[4]));
  const change = (angle: number) => app.setOption('angle', (angle + 360) % 360);
  const left = button({ pt: 'Rodar à esquerda', en: 'Rotate left' }, stampIcons.left,
    event => change(rotation - (event.shiftKey ? 1 : 15)), 'stamp-transform');
  const right = button({ pt: 'Rodar à direita', en: 'Rotate right' }, stampIcons.right,
    event => change(rotation + (event.shiftKey ? 1 : 15)), 'stamp-transform');
  left.dataset.focus = 'angle:left';
  right.dataset.focus = 'angle:right';

  const output = h('span', 'stamp-angle-value', rotation + '°');
  const slider = h('input', 'stamp-angle-slider');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '359';
  slider.value = String(rotation);
  slider.dataset.focus = 'angle:free';
  slider.setAttribute('aria-label', t({ pt: 'Rotação livre', en: 'Free rotation' }));
  slider.addEventListener('input', () => { output.textContent = slider.value + '°'; });
  slider.addEventListener('change', () => change(slider.valueAsNumber));
  return h('div', 'stamp-transforms',
    h('h3', 'option-title', t(sizeLabel)), sizeRow,
    h('div', 'stamp-actions', ...toggles.children, left, right),
    h('div', 'stamp-angle', h('h3', 'option-title stamp-angle-title', t(angleLabel), output), slider));
}

export function stampPanel(remove: (id: string) => void) {
  let categoryKey: string | undefined;
  let categoriesOpen = false;
  let lastSelected: string | undefined;
  let needsFocus = false;
  return (app: App) => {
    const selected = String(app.option(stampTool, stampTool.options[0]));
    if (selected !== lastSelected) {
      const stored = app.store.get().options.stamp?.stamp;
      if (selected.startsWith('personal-')) categoriesOpen = false;
      const restoringPersonal = lastSelected === undefined && typeof stored === 'string' && stored.startsWith('personal-');
      categoryKey = restoringPersonal ? personal.pt : stamps.get(selected)?.category.pt ?? categoryKey;
      lastSelected = selected;
    }
    const library = stamps.all();
    const categories = new Map<string, { label: L10n; items: StampDef[] }>([[personal.pt, { label: personal, items: [] }]]);
    for (const stamp of library) {
      const key = stamp.category.pt;
      const category = categories.get(key) ?? { label: stamp.category, items: [] };
      category.items.push(stamp);
      categories.set(key, category);
    }
    const category = categories.get(categoryKey ?? '') ?? categories.get(personal.pt);
    if (!category) throw new Error('Missing stamp category');
    const key = category.label.pt;
    const open = button(categoriesLabel, stampIcons.categories, () => {
      categoriesOpen = !categoriesOpen;
      app.refresh();
    }, 'stamp-categories-button');
    open.dataset.focus = 'stamp-categories';
    open.setAttribute('aria-expanded', String(categoriesOpen));
    if (categoriesOpen) open.setAttribute('aria-controls', 'stamp-category-picker');
    const header = h('div', 'stamp-library-header', open);
    if (categoriesOpen) {
      const list = h('div', 'choice-grid stamp-categories');
      list.id = 'stamp-category-picker';
      for (const { label, items } of categories.values()) {
        list.append(categoryButton(label, items[0], () => {
          categoryKey = label.pt;
          categoriesOpen = false;
          needsFocus = true;
          app.setOption('stamp', items.find(stamp => stamp.id === selected)?.id ?? items[0]?.id ?? 'none');
        }, label.pt === key));
      }
      roving(list, categoriesLabel);
      return { fixed: [transforms(app), header], scroll: h('div', 'stamp-panel', list) };
    }
    const list = h('div', 'choice-grid stamp-gallery');
    const pick = (stamp: StampDef) => app.setOption('stamp', stamp.id);
    for (const stamp of category.items) {
      const { color, settings } = app.store.get();
      list.append(stampButton(stamp, color, () => pick(stamp), selected === stamp.id, settings.highContrast));
    }
    if (needsFocus) {
      needsFocus = false;
      queueMicrotask(() => {
        open.focus({ preventScroll: true });
        open.scrollIntoView({ block: 'nearest' });
      });
    }
    roving(list, stampsLabel);

    const panel = h('div', 'stamp-panel', h('h3', 'stamp-category-name', t(category.label)));
    const move = tools.get('move');
    if (category.items.length) panel.append(list);
    else panel.append(h('p', 'stamp-empty', t(!move || !toolAllowed(app.store.get().settings, move) ? {
      pt: 'Ainda não tens carimbos teus. Nas Categorias podes escolher outros carimbos.',
      en: 'You don’t have any stamps of your own yet. Pick other stamps in Categories.',
    } : {
      pt: 'Usa Mover para recortar um desenho e fazer um carimbo.',
      en: 'Use Move to cut out part of your drawing and make a stamp.',
    })));
    if (key === personal.pt && category.items.some(stamp => stamp.id === selected)) {
      const erase = button({ pt: 'Apagar carimbo', en: 'Delete stamp' }, stampIcons.delete, () => remove(selected));
      erase.dataset.focus = 'stamp-delete';
      panel.append(erase);
    }
    return { fixed: [transforms(app), header], scroll: panel };
  };
}
