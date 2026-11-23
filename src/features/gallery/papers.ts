import { CANVAS_H, CANVAS_W, type L10n, type StarterDef } from '../../core/types';

/** Paper colours offered by "Novo": white plus twelve named colours. */
export const paperColors: { color: string; label: L10n }[] = [
  { color: '#ffffff', label: { pt: 'Branco', en: 'White' } },
  { color: '#fbf3df', label: { pt: 'Creme', en: 'Cream' } },
  { color: '#fdf0b0', label: { pt: 'Amarelo', en: 'Yellow' } },
  { color: '#fcdcc4', label: { pt: 'Pêssego', en: 'Peach' } },
  { color: '#f9d3df', label: { pt: 'Rosa', en: 'Pink' } },
  { color: '#e2d6f3', label: { pt: 'Lilás', en: 'Lilac' } },
  { color: '#d4ebf8', label: { pt: 'Céu', en: 'Sky' } },
  { color: '#d3f0e3', label: { pt: 'Menta', en: 'Mint' } },
  { color: '#e1efc4', label: { pt: 'Verde', en: 'Green' } },
  { color: '#e3e1dc', label: { pt: 'Cinzento', en: 'Gray' } },
  { color: '#d9b98f', label: { pt: 'Pardo', en: 'Kraft' } },
  { color: '#26335c', label: { pt: 'Noite', en: 'Night' } },
  { color: '#26262b', label: { pt: 'Preto', en: 'Black' } },
];

/** Display order of the starters inside their category; unknown ids go last. */
const order = [
  'plain', 'notebook', 'squared', 'dotted', 'frame',
  'comic-2', 'comic-3', 'comic-4', 'comic-6', 'diagram', 'cycle', 'timeline', 'before-after', 'poster',
  'book-page', 'book-cover', 'postcard',
  'scene-meadow', 'scene-beach', 'scene-forest', 'scene-night', 'scene-sea', 'scene-space', 'scene-city', 'scene-room',
];

export function sortStarters(list: StarterDef[]) {
  const rank = (starter: StarterDef) => {
    const index = order.indexOf(starter.id);
    return index < 0 ? order.length : index;
  };
  return [...list].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
}

export function groupStarters(list: StarterDef[]) {
  const groups = new Map<string, { label: L10n; starters: StarterDef[] }>();
  for (const starter of sortStarters(list)) {
    const group = groups.get(starter.category.pt) ?? { label: starter.category, starters: [] };
    group.starters.push(starter);
    groups.set(starter.category.pt, group);
  }
  return [...groups.values()];
}

/** Paint a starter (paper colour, paper and foreground) scaled into any canvas. */
export function paintStarter(ctx: CanvasRenderingContext2D, starter: StarterDef, color: string) {
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.setTransform(width / CANVAS_W, 0, 0, height / CANVAS_H, 0, 0);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.save();
  starter.paper(ctx, CANVAS_W, CANVAS_H);
  ctx.restore();
  ctx.save();
  starter.foreground?.(ctx, CANVAS_W, CANVAS_H);
  ctx.restore();
  ctx.restore();
}
