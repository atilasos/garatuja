import { stampSvg } from '../core/tooling/stamp-art';
import { icon } from '../ui/icons';
import type { StampDef } from '../core/types';

export default {
  id: 'leaf', label: { pt: 'Folha', en: 'Leaf' }, category: { pt: 'Natureza', en: 'Nature' },
  src: stampSvg(icon('<path fill="#90c9a3" d="M10 33Q-1 13 41 6q1 41-25 32Z"/><path d="M7 43 30 19m-8 8h9m-13 4-1-7"/>')),
} satisfies StampDef;
