import { icon } from '../../ui/icons';

/** Icons of the writing tools, in the same two-colour style as `ui/icons.ts`. */
export const labelIcons = {
  textTool: icon('<rect x="6" y="7" width="36" height="34" rx="7" fill="#fff5db"/><path d="m13 33 8-19 8 19m-13-6h10"/><path stroke="#ef846f" d="M36 15v18"/>'),
  labelTool: icon('<rect x="4" y="8" width="29" height="18" rx="6" fill="#fff5db"/><path d="M10 17h16"/><path d="m28 27 10 10"/><path fill="#ef846f" d="m43 43-13-3 9-9Z"/>'),
  text: icon('<path d="m6 36 9-24 9 24m-14-8h10"/><path d="m27 36 7-18 7 18m-11-6h8"/>'),
  callout: icon('<rect x="5" y="6" width="26" height="16" rx="6" fill="#fff5db"/><path d="M11 14h14"/><path d="m27 24 11 13"/><path fill="#ef846f" d="m43 43-14-2 7-10Z"/>'),
  number: icon('<rect x="14" y="10" width="29" height="15" rx="7" fill="#fff5db"/><circle cx="14" cy="17" r="9" fill="#ef846f"/><path d="m11 14 3-2v11"/><path d="m24 26-9 12"/><path fill="#91c9e4" d="m11 43 3-12 8 8Z"/>'),
  speech: icon('<path fill="#fff5db" d="M24 7c11 0 19 5 19 12s-8 12-19 12q-3 0-6-.6L8 40l3-10C7 27 5 23 5 19 5 12 13 7 24 7Z"/><path d="M15 17h18m-18 6h11"/>'),
  thought: icon('<path fill="#fff5db" d="M14 10q4-5 10-2 6-4 10 1 7 0 8 7 2 7-4 10-3 5-9 3-5 3-10 0-7 2-10-3-5-4-2-10 1-4 7-6Z"/><circle cx="12" cy="37" r="4" fill="#fff5db"/><circle cx="6" cy="43" r="2" fill="#fff5db"/>'),
  shout: icon('<path fill="#f4ba73" d="m24 4 4 8 8-5 1 9 9 1-5 8 7 6-9 3 2 9-9-2-3 8-6-7-8 6-1-9-9-1 5-8-6-6 9-3-2-9 9 3Z"/><path d="M18 24h12m-12 6h8"/>'),
  box: icon('<rect x="5" y="10" width="38" height="28" rx="3" fill="#fff3c4"/><path d="M12 19h24m-24 6h24m-24 6h14"/>'),
  write: icon('<path fill="#f4ba73" d="m30 8 10 10L19 39l-12 3 3-12Z"/><path d="m27 11 10 10"/>'),
  copy: icon('<rect x="14" y="14" width="26" height="26" rx="5" fill="#fff5db"/><path d="M34 14V9a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3v22a3 3 0 0 0 3 3h5"/>'),
  trash: icon('<path fill="#f1a4ba" d="M11 14h26l-2 27H13Z"/><path d="M7 14h34M19 14V8h10v6M20 22v13m8-13v13"/>'),
  paste: icon('<path fill="#9cdbc4" d="M9 10h30v31H9Z"/><rect x="17" y="5" width="14" height="9" rx="3" fill="#fff5db"/><path d="m16 29 6 6 11-12"/>'),
  done: icon('<circle cx="24" cy="24" r="17" fill="#9cdbc4"/><path d="m15 25 7 7 12-14"/>'),
  cancel: icon('<circle cx="24" cy="24" r="17" fill="#f4ba73"/><path d="m17 17 14 14m0-14L17 31"/>'),
};
