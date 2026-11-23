import type { StampDef } from '../core/types';
import { catalog } from './noto/catalog';

const urls = import.meta.glob<string>('./noto/*.svg', { eager: true, import: 'default', query: '?url&no-inline' });

export default catalog.flatMap(([category, entries]) => entries.map(([code, pt, en]): StampDef => ({
  id: 'noto-' + code,
  label: { pt, en },
  category,
  src: urls[`./noto/emoji_u${code}.svg`],
  credit: 'Noto Emoji',
})));
