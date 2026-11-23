import { stampSvg } from '../core/tooling/stamp-art';
import type { StampDef } from '../core/types';

const symbols = { pt: 'Setas e símbolos', en: 'Arrows and symbols' };
const shapes = [
  ['arrow-right', 'Seta para a direita', 'Right arrow', '<path d="M5 19h23V8l16 16-16 16V29H5Z"/>'],
  ['arrow-left', 'Seta para a esquerda', 'Left arrow', '<path transform="translate(48) scale(-1 1)" d="M5 19h23V8l16 16-16 16V29H5Z"/>'],
  ['arrow-up', 'Seta para cima', 'Up arrow', '<path transform="rotate(-90 24 24)" d="M5 19h23V8l16 16-16 16V29H5Z"/>'],
  ['arrow-down', 'Seta para baixo', 'Down arrow', '<path transform="rotate(90 24 24)" d="M5 19h23V8l16 16-16 16V29H5Z"/>'],
  ['arrow-diagonal', 'Seta na diagonal', 'Diagonal arrow', '<path transform="rotate(-45 24 24)" d="M5 19h23V8l16 16-16 16V29H5Z"/>'],
  ['arrow-both', 'Seta dupla', 'Two-way arrow', '<path d="m3 24 13-13v9h16v-9l13 13-13 13v-9H16v9Z"/>'],
  ['check', 'Visto', 'Check mark', '<path d="m5 25 6-6 9 9L37 9l6 6-23 25Z"/>'],
  ['question', 'Ponto de interrogação', 'Question mark', '<path d="M12 17a12 12 0 1 1 20 9c-3 2-5 3-5 7h-7c0-7 3-10 7-13a5 5 0 1 0-8-3Z"/><circle cx="24" cy="40" r="4"/>'],
  ['star', 'Estrela', 'Star', '<path d="m24 3 6 14 15 1-12 10 4 15-13-8-13 8 4-15L3 18l15-1Z"/>'],
  ['heart', 'Coração', 'Heart', '<path d="M24 43C15 36 3 27 3 17 3 5 17 2 24 12 31 2 45 5 45 17c0 10-12 19-21 26Z"/>'],
  ['paw', 'Pegada', 'Paw print', '<path d="M24 21c7 0 15 11 15 16 0 7-8 7-15 4-7 3-15 3-15-4 0-5 8-16 15-16Z"/><ellipse cx="7" cy="19" rx="5" ry="7"/><ellipse cx="18" cy="11" rx="5" ry="7"/><ellipse cx="30" cy="11" rx="5" ry="7"/><ellipse cx="41" cy="19" rx="5" ry="7"/>'],
  ['leaf-print', 'Silhueta de folha', 'Leaf silhouette', '<path d="M5 42 31 17 11 31Q5 9 43 5q-1 36-24 31L9 46Z"/>'],
];
const digits = [
  'M14 13q0-7 10-7t10 7v22q0 7-10 7t-10-7Z',
  'M16 14l9-8v36m-10 0h20',
  'M13 14q0-8 11-8t11 9q0 5-8 11L13 42h22',
  'M13 10q6-7 16-3 9 6 0 16 10 4 5 13-6 11-21 3m7-16h8',
  'M31 42V6L11 29h26',
  'M34 6H15l-2 16q19-7 22 8 2 13-12 12-6 0-10-4',
  'M33 9q-16-9-20 14-4 19 11 19 12 0 11-12-1-12-21-5',
  'M13 6h23L19 42',
  'M24 23C9 22 11 6 24 6s15 16 0 17c-16 2-15 19 0 19s16-17 0-19Z',
  'M15 39q16 9 20-14 4-19-11-19-12 0-11 12 1 12 21 5',
];

export default [
  ...shapes,
  ...digits.map((path, digit) => [`digit-${digit}`, String(digit), String(digit),
    `<path d="${path}" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`]),
].map(([id, pt, en, art]): StampDef => ({
  id, label: { pt, en }, category: symbols, tintable: true,
  src: stampSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">${art}</svg>`),
}));
