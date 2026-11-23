import type { IconSvg } from '../core/types';

export function icon(paths: string): IconSvg {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="#332b25" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">${paths}</svg>`;
}

export const icons = {
  pingo: icon('<path fill="#9cdbc4" d="M24 4C20 12 8 20 8 31a16 16 0 0032 0C40 20 28 12 24 4Z"/><circle cx="18" cy="29" r="1" fill="#332b25"/><circle cx="30" cy="29" r="1" fill="#332b25"/><path d="M20 34q4 5 8 0"/>'),
  paint: icon('<path fill="#f4ba73" d="m18 29 15-23q5-6 9 0L26 33Z"/><path fill="#ef846f" d="M19 26q10 0 10 9t-21 6q5-3 5-10 1-5 6-5Z"/>'),
  eraser: icon('<path fill="#f1a4ba" d="m6 28 18-20q3-3 6 0l12 12q3 3 0 6L29 39H17Z"/><path fill="#fff8e5" d="m6 28 9-10 17 17-3 4H17Z"/><path d="M29 39h14"/>'),
  fill: icon('<path fill="#83cbb1" d="m7 26 18-17 14 15-17 16q-2 2-4 0L7 29q-1-2 0-3Z"/><path d="m9 26 29-2M23 7l6 6"/><path fill="#f4ba73" d="M40 29q-6 7-6 10a6 6 0 0012 0q0-3-6-10Z"/>'),
  lines: icon('<path d="m9 39 30-30" stroke-width="5"/><circle cx="9" cy="39" r="4" fill="#f4ba73"/><circle cx="39" cy="9" r="4" fill="#f4ba73"/>'),
  shapes: icon('<rect x="5" y="6" width="23" height="23" rx="3" fill="#f4ba73"/><circle cx="31" cy="31" r="12" fill="#91c9e4"/>'),
  magic: icon('<path fill="#b6a3e0" d="M27 5q2 14 13 16-11 3-13 16-3-13-15-16Q24 19 27 5Z"/><path fill="#f4ba73" d="M11 27q1 6 7 8-6 1-7 8-1-7-7-8 6-2 7-8Z"/><path d="M41 7v8m-4-4h8"/>'),
  stamp: icon('<path fill="#ef846f" d="M13 28h22l6 6v7H7v-7Z"/><path fill="#91c9e4" d="M18 28v-5q-3-3-3-8a9 9 0 1118 0q0 5-3 8v5Z"/><path d="M8 35h32"/>'),
  undo: icon('<path fill="#91c9e4" d="M7 20 19 8v8h9a13 13 0 010 26H15v-7h13a6 6 0 000-12h-9v9Z"/>'),
  redo: icon('<path fill="#91c9e4" d="M41 20 29 8v8h-9a13 13 0 000 26h13v-7H20a6 6 0 010-12h9v9Z"/>'),
  new: icon('<path fill="#fff5db" d="M10 5h19l9 9v29H10Z"/><path d="M29 5v10h9m-14 6v14m-7-7h14"/>'),
  open: icon('<path fill="#f4ba73" d="M5 36V11h15l5 5h17v20Z"/><path fill="#fff5db" d="M5 38l7-16h32l-7 16Z"/>'),
  save: icon('<path fill="#9cdbc4" d="M8 6h28l5 5v31H8Z"/><path fill="#fff5db" d="M16 6v12h16V6m-16 36V27h16v15"/><path d="M27 9v5"/>'),
  print: icon('<path fill="#fff5db" d="M13 5h22v17H13Z"/><rect x="6" y="17" width="36" height="19" rx="4" fill="#91c9e4"/><path fill="#fff5db" d="M13 29h22v14H13Z"/><path d="M33 23h3m-18 12h12"/>'),
  sound: icon('<path fill="#f4ba73" d="M7 17h10l11-9v32l-11-9H7Z"/><path d="M34 16a13 13 0 010 16m5-22a20 20 0 010 28"/>'),
  mute: icon('<path fill="#f4ba73" d="M7 17h10l11-9v32l-11-9H7Z"/><path d="m34 19 10 10m0-10L34 29"/>'),
  settings: icon('<rect x="6" y="8" width="36" height="32" rx="7" fill="#b6a3e0"/><path d="M12 17h24m-24 14h24"/><circle cx="20" cy="17" r="4" fill="#fff5db"/><circle cx="29" cy="31" r="4" fill="#fff5db"/>'),
  level: icon('<rect x="6" y="8" width="36" height="32" rx="7" fill="#9cdbc4"/><path d="M14 17h20M14 25h20M14 33h11"/>'),
  eyedropper: icon('<path fill="#91c9e4" d="m14 25 15-15q6-6 11-1t-1 11L24 35l-10 1-5 5-2-2 5-5Z"/><path d="m22 17 11 11"/>'),
  custom: icon('<circle cx="24" cy="24" r="17" fill="#f4ba73"/><path fill="#ef846f" d="M24 7a17 17 0 0115 25L24 24Z"/><path fill="#91c9e4" d="M39 32A17 17 0 019 32l15-8Z"/><circle cx="24" cy="24" r="5" fill="#fff5db"/>'),
  text: icon('<path fill="#fff5db" d="M9 7h30v34H9Z"/><path d="M16 17h16m-8 0v16m-4 0h8"/>'),
  plus: icon('<circle cx="24" cy="24" r="17" fill="#9cdbc4"/><path d="M15 24h18m-9-9v18"/>'),
  close: icon('<circle cx="24" cy="24" r="17" fill="#f4ba73"/><path d="m18 18 12 12m0-12L18 30"/>'),
  up: icon('<path fill="#91c9e4" d="M9 27 24 12l15 15H28v10h-8V27Z"/>'),
  down: icon('<path fill="#91c9e4" d="M9 21l15 15 15-15H28V11h-8v10Z"/>'),
  mirror: icon('<path fill="#91c9e4" d="m18 12-12 12 12 12Zm12 0 12 12-12 12Z"/><path d="M24 7v34"/>'),
  flip: icon('<path fill="#91c9e4" d="m12 18 12-12 12 12Zm0 12 12 12 12-12Z"/><path d="M7 24h34"/>'),
  solid: icon('<circle cx="24" cy="24" r="14" fill="#ef846f"/>'),
  outline: icon('<circle cx="24" cy="24" r="14" fill="#fff5db"/>'),
} satisfies Record<string, IconSvg>;
