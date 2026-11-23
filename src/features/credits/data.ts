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
    purpose: { pt: 'Tipo de letra da interface', en: 'Interface typeface' },
    license: 'SIL Open Font License 1.1',
    text: andika,
  },
];
