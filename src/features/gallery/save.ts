import { t } from '../../core/i18n';
import type { L10n } from '../../core/types';
import type { App } from '../../ui/app';
import { art, button, h, pressed, roving } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { authorLabel, titleLabel } from '../../ui/work-fields';
import { extraIcons } from '../settings/icons';

const words = {
  saved: { pt: 'O teu trabalho está guardado no dispositivo.', en: 'Your work is saved on this device.' },
  heading: { pt: 'Guardado no dispositivo', en: 'Saved on this device' },
  invite: {
    pt: 'Queres dizer como se chama, quem o fez e para quem é? Podes fazê-lo agora ou mais tarde.',
    en: 'Would you like to say what it is called, who made it and who it is for? Now or later.',
  },
  audience: { pt: 'Para quem é?', en: 'Who is it for?' },
  audiencePlaceholder: { pt: 'Escreve para quem é', en: 'Write who it is for' },
  titlePlaceholder: { pt: 'O nome do trabalho', en: 'The name of the work' },
  authorPlaceholder: { pt: 'O teu nome', en: 'Your name' },
  ready: { pt: 'Pronto', en: 'Done' },
  later: { pt: 'Agora não', en: 'Not now' },
} satisfies Record<string, L10n>;

/** Tappable suggestions for "Para quem é?" (free text stays possible). */
export const audienceSuggestions: L10n[] = [
  { pt: 'A turma', en: 'The class' },
  { pt: 'O jornal', en: 'The newspaper' },
  { pt: 'Os correspondentes', en: 'Our pen pals' },
  { pt: 'A família', en: 'My family' },
  { pt: 'O livro da turma', en: 'The class book' },
];

function field(label: L10n, placeholder: L10n, value: string, change: (value: string) => void) {
  const input = h('input');
  input.value = value;
  input.placeholder = t(placeholder);
  input.addEventListener('input', () => change(input.value));
  return { input, element: h('label', 'work-field', h('span', '', t(label)), input) };
}

/** "Para quem é?" with suggestion chips and free text. */
export function audienceField(app: App) {
  const audience = field(words.audience, words.audiencePlaceholder, app.store.get().project.audience,
    value => { app.documents.editProject({ audience: value }); sync(); });
  const chips = audienceSuggestions.map(suggestion => {
    const chip = button(suggestion, undefined, () => {
      audience.input.value = t(suggestion);
      app.documents.editProject({ audience: audience.input.value });
      sync();
    }, 'chip');
    chip.dataset.focus = suggestion.pt;
    return [chip, suggestion] as const;
  });
  const row = h('div', 'chips', ...chips.map(([chip]) => chip));
  function sync() {
    for (const [chip, suggestion] of chips) pressed(chip, audience.input.value.trim() === t(suggestion));
  }
  sync();
  roving(row, words.audience);
  return { input: audience.input, element: h('div', 'audience-field', audience.element, row) };
}

const invited = new Set<string>();

export async function saveWork(app: App) {
  await app.documents.save();
  app.sound('save');
  app.say(words.saved);
  const { project } = app.store.get();
  const missing = !project.title.trim() || !project.author.trim() || !project.audience.trim();
  if (!missing || invited.has(project.id)) return;
  invited.add(project.id);
  showWorkDetails(app, true);
}

export function showWorkDetails(app: App, saved = false) {
  const { project } = app.store.get();
  const title = field(titleLabel, words.titlePlaceholder, project.title, value => app.documents.editProject({ title: value }));
  const author = field(authorLabel, words.authorPlaceholder, project.author, value => app.documents.editProject({ author: value }));
  const audience = audienceField(app);
  const first = [title.input, author.input, audience.input].find(input => !input.value.trim()) ?? title.input;
  first.autofocus = true;
  const done = button(words.ready, extraIcons.check, () => close(), 'primary');
  const later = button(words.later, icons.close, () => close());
  const close = app.modal({
    title: saved ? words.heading : { pt: 'Dados do trabalho', en: 'Work details' },
    content: h('div', 'dialog-stack',
      saved ? h('p', 'pingo-note', art(icons.pingo), h('span', '', t(words.invite))) : null,
      title.element, author.element, audience.element,
      h('div', 'dialog-actions', saved ? later : null, done)),
  });
}
