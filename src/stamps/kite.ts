import { stampSvg } from '../core/tooling/stamp-art';
import { icon } from '../ui/icons';
import type { StampDef } from '../core/types';

export default {
  id: 'kite', label: { pt: 'Papagaio', en: 'Kite' }, category: { pt: 'Passeio', en: 'Out and about' },
  src: stampSvg(icon('<path fill="#ed826e" d="M27 5 42 18 22 33 11 16Z"/><path fill="#f6bf77" d="m27 5-5 28 20-15Z"/><path d="M11 16l31 2M22 33q-18-3-14 10"/>')),
} satisfies StampDef;
