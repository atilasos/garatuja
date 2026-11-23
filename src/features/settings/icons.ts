/** Icons used by the gallery, settings, help and teacher features (original two-tone artwork). */
import { icon } from '../../ui/icons';

export const extraIcons = {
  duplicate: icon('<rect x="15" y="13" width="25" height="29" rx="4" fill="#fff5db"/><path fill="#91c9e4" d="M8 9a3 3 0 013-3h19a3 3 0 013 3v4H18a3 3 0 00-3 3v20h-4a3 3 0 01-3-3Z"/>'),
  trash: icon('<path fill="#f1a4ba" d="M12 15h24l-2 26a3 3 0 01-3 3H17a3 3 0 01-3-3Z"/><path d="M8 15h32M19 15v-5h10v5m-8 7v15m6-15v15"/>'),
  image: icon('<rect x="6" y="9" width="36" height="30" rx="4" fill="#fff5db"/><circle cx="17" cy="19" r="4" fill="#f4ba73"/><path fill="#9cdbc4" d="m8 36 11-12 7 7 5-5 9 10Z"/>'),
  importImage: icon('<rect x="6" y="15" width="30" height="27" rx="4" fill="#fff5db"/><path fill="#9cdbc4" d="m8 39 9-10 6 6 4-4 7 8Z"/><path fill="#91c9e4" d="M33 4v11h-5l8 9 8-9h-5V4Z"/>'),
  pages: icon('<path fill="#fff5db" d="M14 10h22v30H14Z"/><path fill="#91c9e4" d="M9 6h22v4H14v26H9Z"/><path d="M19 19h12m-12 7h12m-12 7h7"/>'),
  help: icon('<circle cx="24" cy="24" r="18" fill="#91c9e4"/><path d="M18 19a6 6 0 1112 0c0 5-6 5-6 10"/><circle cx="24" cy="35" r="1.5" fill="#332b25"/>'),
  listen: icon('<path fill="#f4ba73" d="M7 17h10l11-9v32l-11-9H7Z"/><path d="M34 16a13 13 0 010 16m5-22a20 20 0 010 28"/>'),
  hand: icon('<path fill="#fbd9ac" d="M14 26V12a3 3 0 016 0v10V8a3 3 0 016 0v14V10a3 3 0 016 0v14-8a3 3 0 016 0v14q0 14-13 14-8 0-12-6l-7-10a3 3 0 015-3Z"/>'),
  cursor: icon('<path fill="#fff5db" d="M10 5v34l9-8 6 13 6-3-6-12h12Z" stroke-width="3.2"/>'),
  contrast: icon('<circle cx="24" cy="24" r="17" fill="#fff"/><path fill="#332b25" d="M24 7a17 17 0 010 34Z"/>'),
  adult: icon('<rect x="9" y="21" width="30" height="21" rx="5" fill="#f4ba73"/><path d="M15 21v-6a9 9 0 0118 0v6"/><circle cx="24" cy="31" r="3" fill="#332b25"/>'),
  check: icon('<circle cx="24" cy="24" r="17" fill="#9cdbc4"/><path d="m16 25 6 6 11-13"/>'),
  keyboard: icon('<rect x="4" y="13" width="40" height="23" rx="4" fill="#fff5db"/><path d="M10 20h2m5 0h2m5 0h2m5 0h2m5 0h1M10 26h2m24 0h2M16 30h16"/>'),
  storage: icon('<ellipse cx="24" cy="12" rx="15" ry="6" fill="#b6a3e0"/><path fill="#b6a3e0" d="M9 12v24c0 3 7 6 15 6s15-3 15-6V12c0 3-7 6-15 6S9 15 9 12Z"/><path d="M9 24c0 3 7 6 15 6s15-3 15-6"/>'),
  download: icon('<path fill="#91c9e4" d="M20 6h8v15h7L24 33 13 21h7Z"/><path d="M8 34v7h32v-7"/>'),
  language: icon('<circle cx="24" cy="24" r="17" fill="#91c9e4"/><path d="M7 24h34M24 7c-8 9-8 25 0 34m0-34c8 9 8 25 0 34"/>'),
  uppercase: icon('<path fill="#fff5db" d="M6 9h36v30H6Z"/><path d="m11 33 7-18 7 18m-11-6h8m7 6V15h6a4 4 0 010 9h-6m0 0h7a4.5 4.5 0 010 9h-7"/>'),
} as const;
