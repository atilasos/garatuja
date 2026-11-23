import type { L10n, MagicCategory, MagicEffect } from '../../core/types';
import { filterPage, filterStroke, type PaintFn } from './b-bitmap';

/** A colour effect with a soft round stroke, a whole-page pass, or both. */
export function dual(spec: {
  id: string;
  label: L10n;
  hint: L10n;
  category: MagicCategory;
  order: number;
  level: 1 | 2;
  usesColor: boolean;
  modes?: 'both' | 'stroke' | 'whole';
  begin?: MagicEffect['begin'];
  end?: MagicEffect['end'];
  map: PaintFn;
}): MagicEffect {
  const modes = spec.modes ?? 'both';
  const effect: MagicEffect = {
    id: spec.id,
    label: spec.label,
    hint: spec.hint,
    category: spec.category,
    order: spec.order,
    level: spec.level,
    usesColor: spec.usesColor,
  };
  if (spec.begin) effect.begin = spec.begin;
  if (spec.end) effect.end = spec.end;
  if (modes !== 'whole') effect.stroke = (from, to, c, size) => filterStroke(c, from, to, size, spec.map);
  if (modes !== 'stroke') effect.whole = c => filterPage(c, spec.map);
  return effect;
}
