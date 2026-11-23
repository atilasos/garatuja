import type { IconSvg } from '../core/types';
import { icon } from './icons';

/** Icons for the drawing tools' options (shape styles, fill modes, shape toggles). */
export const drawingIcons = {
  styleFilled: icon('<rect x="8" y="10" width="32" height="28" rx="6" fill="#ef846f" stroke="#ef846f"/>'),
  styleOutline: icon('<rect x="9" y="11" width="30" height="26" rx="5" fill="#fff5db" stroke-width="4.4"/>'),
  styleBoth: icon('<rect x="9" y="11" width="30" height="26" rx="5" fill="#f4ba73" stroke-width="4.4"/>'),
  fromCenter: icon('<circle cx="24" cy="24" r="14" fill="#fff5db"/><circle cx="24" cy="24" r="3" fill="#332b25"/><path d="M24 10v6m0 16v6M10 24h6m16 0h6"/>'),
  rotate: icon('<path fill="#91c9e4" d="M24 9a15 15 0 1013.5 8.5l-5 2.3A9.5 9.5 0 1124 14.5v5.2l9-7.2-9-7.2Z"/>'),
} satisfies Record<string, IconSvg>;
