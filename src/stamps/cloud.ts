import { stampSvg } from '../core/tooling/stamp-art';
import { icon } from '../ui/icons';
import type { StampDef } from '../core/types';

export default {
  id: 'cloud', label: { pt: 'Nuvem', en: 'Cloud' }, category: { pt: 'Natureza', en: 'Nature' }, tintable: true,
  src: stampSvg(icon('<path fill="#333" stroke="none" d="M12 36a10 10 0 01-2-20 13 13 0 0125 1 10 10 0 012 19Z"/>')),
} satisfies StampDef;
