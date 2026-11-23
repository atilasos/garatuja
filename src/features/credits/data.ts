import playwrite from '@fontsource/playwrite-pt/LICENSE?raw';
import fredoka from '@fontsource/fredoka/LICENSE?raw';
import courier from '@fontsource/courier-prime/LICENSE?raw';
import gifenc from 'gifenc/LICENSE.md?raw';
import andika from '@fontsource/andika/LICENSE?raw';
import apache from '../../stamps/noto/APACHE-2.0?raw';
import noto from '../../stamps/noto/LICENSE?raw';
import type { L10n } from '../../core/types';

interface Credit {
  name: string;
  purpose: L10n;
  license: string;
  text: string;
}

export const credits: readonly Credit[] = [
  {
    name: 'Noto Emoji',
    purpose: { pt: 'Ilustrações da biblioteca de carimbos', en: 'Stamp library illustrations' },
    license: 'Apache License 2.0',
    text: noto + '\n\n' + apache,
  },
  {
    name: 'Andika',
    purpose: { pt: 'Tipo de letra da interface e da folha', en: 'Interface and drawing typeface' },
    license: 'SIL Open Font License 1.1',
    text: andika,
  },
  ...[['Playwrite PT', playwrite], ['Fredoka', fredoka], ['Courier Prime', courier]].map(([name, text]) => ({
    name, text, purpose: { pt: 'Tipo de letra para escrever na folha', en: 'Typeface for writing on the paper' },
    license: 'SIL Open Font License 1.1',
  })),
  { name: 'gifenc', purpose: { pt: 'Guardar animações em GIF', en: 'Save animations as GIF' }, license: 'MIT', text: gifenc },
];
