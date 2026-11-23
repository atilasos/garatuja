import type { StarterDef } from '../core/types';
import { paperCategory } from './lib/art';

export default {
  id: 'plain', label: { pt: 'Liso', en: 'Plain' }, category: paperCategory, paper() {},
} satisfies StarterDef;
