import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from '../core/draw';
import { t } from '../core/i18n';
import type { L10n } from '../core/types';
import type { App } from './app';
import { button, h, pressed, roving } from './dom';
import { icons } from './icons';
import { colorName } from './palette';
import './color-mixer.css';

const shelfKey = 'garatuja.colors';
const hues = [0, 30, 51, 116, 174, 214, 258, 306];
const shades = [.15, .28, .4, .52, .65, .77, .9];
const pigments = ['#e94642', '#ffdb36', '#367acf', '#ffffff', '#292a33'];
const combinations = ['#ffffff', pigments[0], pigments[1], '#f48838', pigments[2], '#8755a4', '#5c9d4a', '#69513a'].map(hexToRgb);
const names = {
  hue: { pt: 'Arco-íris', en: 'Rainbow' },
  shade: { pt: 'Do escuro ao claro', en: 'Dark to light' },
  mix: { pt: 'Junta tintas', en: 'Mix paints' },
  clear: { pt: 'Esvaziar poça', en: 'Empty puddle' },
  shelf: { pt: 'As minhas cores', en: 'My colors' },
  use: { pt: 'Usar esta cor', en: 'Use this color' },
};

function recentColors(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(shelfKey) ?? '[]');
    if (Array.isArray(value)) return value.filter((color): color is string =>
      typeof color === 'string' && /^#[\da-f]{6}$/i.test(color)).slice(0, 6);
  } catch { /* A fresh palette still works without stored preferences. */ }
  return [];
}

function mixedColor(counts: number[]) {
  const [red, yellow, blue, white, black] = counts;
  const strongest = Math.max(red, yellow, blue, 1);
  const channels = [red, yellow, blue].map(count => count / strongest);
  const mixed = { r: 0, g: 0, b: 0 };
  // Interpolate between the primary and secondary colors of a paint palette.
  for (const [index, color] of combinations.entries()) {
    const weight = channels.reduce((product, amount, bit) => product * (index & (1 << bit) ? amount : 1 - amount), 1);
    mixed.r += color.r * weight;
    mixed.g += color.g * weight;
    mixed.b += color.b * weight;
  }
  const paint = red + yellow + blue;
  const total = paint + white + black;
  const blend = (channel: number) => (channel * paint + 255 * white + 41 * black) / total;
  return rgbToHex({ r: blend(mixed.r), g: blend(mixed.g), b: blend(mixed.b) });
}

export function mixColor(app: App) {
  let selected = app.store.get().color;
  let hue = rgbToHsl(hexToRgb(selected)).h;
  const counts = pigments.map(() => 0);
  const puddle = h('div', 'mix-puddle', h('span', 'mix-puddle-sample'), h('span', 'mix-color-name'));
  puddle.setAttribute('role', 'status');
  const sample = (color: string, run: () => void) => {
    const control = button(colorName(color), undefined, run, 'mix-swatch');
    control.title = t(colorName(color));
    control.style.setProperty('--mix-color', color);
    control.prepend(h('span', 'mix-chip'));
    return control;
  };
  const hueRow = h('div', 'mix-row');
  const shadeRow = h('div', 'mix-row');
  const pigmentRow = h('div', 'mix-row mix-pigments');
  const hueFocus = roving(hueRow, names.hue);
  const shadeFocus = roving(shadeRow, names.shade);
  const pigmentFocus = roving(pigmentRow, names.mix);
  const swatch = (hue: number, l: number) => rgbToHex(hslToRgb({ h: hue, s: .78, l }));
  function display(color: string) {
    selected = color;
    const name = colorName(color);
    puddle.style.setProperty('--mix-color', color);
    const caption = puddle.querySelector('.mix-color-name');
    if (caption) caption.textContent = t(name);
    app.say(name);
  }
  function reselect(color: string) {
    counts.fill(0);
    refreshPigments();
    display(color);
  }
  function refreshShades() {
    shadeRow.replaceChildren(...shades.map(lightness => {
      const color = swatch(hue, lightness);
      return sample(color, () => reselect(color));
    }));
    shadeFocus();
  }
  hueRow.append(...hues.map(value => {
    const color = swatch(value, .52);
    const control = sample(color, () => {
      hue = value;
      for (const item of hueRow.querySelectorAll('button')) pressed(item, item === control);
      reselect(color);
      refreshShades();
    });
    pressed(control, false);
    return control;
  }));
  hueFocus();
  refreshShades();

  const drops = pigments.map((color, index) => {
    const control = sample(color, () => {
      counts[index]++;
      refreshPigments();
      display(mixedColor(counts));
    });
    const amount = h('span', 'mix-amount');
    control.append(amount);
    return { control, amount, name: colorName(color) };
  });
  function refreshPigments() {
    for (const [index, { control, amount, name }] of drops.entries()) {
      const count = counts[index];
      amount.textContent = count ? String(count) : '';
      control.setAttribute('aria-label', t({ pt: `${name.pt}, gotas: ${count}`, en: `${name.en}, drops: ${count}` }));
      pressed(control, count > 0);
    }
  }
  const clear = button(names.clear, icons.undo, () => reselect(app.store.get().color));
  pigmentRow.append(...drops.map(({ control }) => control), clear);
  refreshPigments();
  pigmentFocus();
  display(selected);

  const shelf = recentColors();
  const shelfRow = h('div', 'mix-row', ...shelf.map(color => sample(color, () => {
    hue = rgbToHsl(hexToRgb(color)).h;
    refreshShades();
    reselect(color);
  })));
  if (shelf.length) roving(shelfRow, names.shelf);
  const use = button(names.use, icons.custom, () => {
    try {
      localStorage.setItem(shelfKey, JSON.stringify([selected, ...recentColors().filter(color => color !== selected)].slice(0, 6)));
    } catch { /* The selected color is still usable in this session. */ }
    app.setColor(selected);
    close();
  }, 'primary');
  const group = (label: L10n, row: HTMLElement) => h('section', 'mix-group', h('h3', '', t(label)), row);
  const close = app.modal({
    title: { pt: 'Misturar cor', en: 'Mix color' },
    content: h('div', 'color-mixer', group(names.hue, hueRow), group(names.shade, shadeRow),
      group(names.mix, pigmentRow), puddle, shelf.length ? group(names.shelf, shelfRow) : null),
    footer: h('div', 'dialog-actions', use),
  });
}
