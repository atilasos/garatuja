import { t } from '../../core/i18n';
import type { ProjectRecord } from '../../core/types';
import type { App } from '../../ui/app';
import { art, button, h, pressed } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { pageIcons } from '../pages/icons';
import { presentationIcons } from './icons';
import { writingInput } from '../../ui/writing-input';
import './comments.css';

type Comment = ProjectRecord['comments'][number];

const kinds = [
  { kind: 'gostei', icon: presentationIcons.like, label: { pt: 'Gostei…', en: 'I liked…' } },
  { kind: 'pergunto', icon: presentationIcons.ask, label: { pt: 'Pergunto…', en: 'I wonder…' } },
  { kind: 'sugiro', icon: presentationIcons.suggest, label: { pt: 'Sugiro…', en: 'I suggest…' } },
] as const;

export function commentsPanel(app: App) {
  let kind: Comment['kind'] = 'gostei';
  const list = h('div', 'class-comments-list');
  const notice = h('div', 'class-comment-notice');
  notice.hidden = true;
  notice.setAttribute('role', 'status');
  const name = h('input');
  name.setAttribute('aria-required', 'true');
  const text = h('textarea');
  text.setAttribute('aria-required', 'true');
  writingInput(name, () => app.store.get().settings);
  writingInput(text, () => app.store.get().settings);
  text.setAttribute('autocorrect', 'off');
  const switches = kinds.map(choice => button(choice.label, choice.icon, () => {
    kind = choice.kind;
    switches.forEach((control, i) => pressed(control, kinds[i].kind === kind));
  }));
  pressed(switches[0], true);
  const save = button({ pt: 'Adicionar comentário', en: 'Add comment' }, icons.plus, () => {});
  save.type = 'submit';
  const validation = h('p', 'class-comment-validation');
  validation.hidden = true;
  validation.setAttribute('role', 'alert');
  for (const field of [name, text]) field.addEventListener('input', () => {
    field.removeAttribute('aria-invalid');
    validation.hidden = true;
  });
  const form = h('form', 'class-comment-form',
    h('div', 'class-comment-types', ...switches),
    h('label', 'work-field', h('span', '', t({ pt: 'Quem diz?', en: 'Who’s speaking?' })), name),
    h('label', 'work-field', h('span', '', t({ pt: 'Comentário', en: 'Comment' })), text), validation, save);

  function update(comments: Comment[]) {
    app.documents.editProject({ comments });
    render();
    return app.documents.checkpoint();
  }

  function render() {
    const { comments } = app.store.get().project;
    list.replaceChildren(...comments.map((comment, index) => {
      const variant = kinds.find(choice => choice.kind === comment.kind) ?? kinds[0];
      const erase = button({ pt: 'Apagar comentário', en: 'Delete comment' }, pageIcons.remove, () => app.run(async () => {
        const before = app.store.get().project;
        await update(before.comments.filter(item => item.id !== comment.id));
        const owner = app.store.get().project;
        const restore = (comments: Comment[]) => {
          if (comments.some(item => item.id === comment.id)) return comments;
          const result = [...comments];
          const next = result.findIndex(item => item.id === before.comments[index + 1]?.id);
          result.splice(next < 0 ? Math.min(index, result.length) : next, 0, comment);
          return result;
        };
        notice.hidden = false;
        notice.replaceChildren(h('span', '', t({ pt: 'Comentário apagado.', en: 'Comment deleted.' })),
          button({ pt: 'Anular', en: 'Undo' }, icons.undo, () => app.run(async () => {
            const current = app.store.get().project;
            if (current.id === owner.id) await update(restore(current.comments));
            else await app.documents.reviseInactive(owner.id, work => ({ ...work, comments: restore(work.comments) }));
            notice.hidden = true;
            save.focus();
          })));
        notice.querySelector('button')?.focus();
      }));
      return h('article', 'class-comment', h('header', '', art(variant.icon), h('strong', '', t(variant.label)),
        h('span', 'authored-text', comment.from), erase), h('p', 'authored-text', comment.text));
    }));
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!name.value.trim() || !text.value.trim()) {
      const field = name.value.trim() ? text : name;
      field.setAttribute('aria-invalid', 'true');
      validation.textContent = t(field === name
        ? { pt: 'Escreve quem diz.', en: 'Write who is speaking.' }
        : { pt: 'Escreve o comentário.', en: 'Write the comment.' });
      validation.hidden = false;
      field.focus();
      return;
    }
    app.run(() => update([...app.store.get().project.comments, {
      id: crypto.randomUUID(), kind, text: text.value.trim(), from: name.value.trim(),
    }]));
    text.value = '';
    text.focus();
  });

  render();
  return h('section', 'class-comments', h('h2', '', t({ pt: 'O que dizem os colegas', en: 'What classmates say' })),
    h('div', 'class-comments-grid', form, h('div', '', notice, list)));
}
