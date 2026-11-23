import { stampSvg } from '../core/tooling/stamp-art';
import { icon } from '../ui/icons';
import type { StampDef } from '../core/types';

export default {
  id: 'boat', label: { pt: 'Barco', en: 'Boat' }, category: { pt: 'Transportes', en: 'Transport' },
  src: stampSvg(icon('<path fill="#f6bf77" d="M6 31h37l-9 11H15Z"/><path fill="#9fd8ed" d="M25 5 10 28h15Z"/><path fill="#ed826e" d="m29 12 10 16H29Z"/>')),
} satisfies StampDef;
