import { createPage, createProject } from '../../core/document';
import { t } from '../../core/i18n';
import type { L10n, ProjectRecord } from '../../core/types';
import type { App } from '../../ui/app';
import { art, button, h, roving } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { untitled } from '../../ui/work-fields';
import { extraIcons } from '../settings/icons';
import { galleryActions, type GalleryContext } from './actions';
import type { Trash } from './trash';
import { duplicateProject, projectFromImage } from './works';

const words = {
  title: { pt: 'Abrir trabalho', en: 'Open work' },
  works: { pt: 'Os meus trabalhos', en: 'My works' },
  tools: { pt: 'Ações da galeria', en: 'Gallery actions' },
  duplicate: { pt: 'Duplicar', en: 'Duplicate' },
  remove: { pt: 'Apagar', en: 'Delete' },
  confirm: { pt: 'Apagar este trabalho?', en: 'Delete this work?' },
  yes: { pt: 'Sim, apagar', en: 'Yes, delete' },
  no: { pt: 'Não', en: 'No' },
  undo: { pt: 'Anular', en: 'Undo' },
  importImage: { pt: 'Importar imagem', en: 'Import picture' },
  empty: {
    pt: 'Ainda não há trabalhos guardados. Quando quiseres, começa um novo!',
    en: 'There are no saved works yet. Whenever you like, start a new one!',
  },
  newWork: { pt: 'Novo', en: 'New' },
  copied: { pt: 'Fiz uma cópia do trabalho.', en: 'I made a copy of the work.' },
  opened: { pt: 'Aqui está o teu trabalho.', en: 'Here is your work.' },
  badImage: {
    pt: 'Não consegui abrir essa imagem. Experimenta outra.',
    en: 'I couldn’t open that picture. Try another one.',
  },
  imported: {
    pt: 'A imagem é o papel deste trabalho novo. Podes desenhar por cima.',
    en: 'The picture is the paper of this new work. You can draw on top.',
  },
} satisfies Record<string, L10n>;

const pagesLabel = (count: number): L10n => count === 1
  ? { pt: '1 página', en: '1 page' } : { pt: `${count} páginas`, en: `${count} pages` };

export function deletedMessage(project: ProjectRecord): L10n {
  const name = project.title.trim();
  return name
    ? { pt: `Apagaste «${name}».`, en: `You deleted “${name}”.` }
    : { pt: 'Apagaste um trabalho.', en: 'You deleted a work.' };
}

export function chooseImage(app: App, done: () => void) {
  if (!app.store.get().settings.allowImport) return;
  const input = h('input', 'visually-hidden');
  input.type = 'file';
  input.accept = 'image/*';
  input.dataset.import = 'image';
  input.addEventListener('change', () => app.run(async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file || !app.store.get().settings.allowImport) return;
    let image: ImageBitmap;
    try {
      image = await createImageBitmap(file);
    } catch {
      app.notify(words.badImage);
      return;
    }
    try {
      if (!await app.documents.open(projectFromImage(image))) return;
    } finally {
      image.close();
    }
    done();
    app.say(words.imported);
  }));
  input.addEventListener('cancel', () => input.remove());
  document.body.append(input);
  input.click();
}

export async function openWork(app: App, trash: Trash) {
  await app.documents.save();
  const urls: string[] = [];
  const toolbar = h('div', 'gallery-toolbar');
  const notices = h('div', 'gallery-notices');
  const grid = h('div', 'gallery');
  const status = h('p', 'gallery-notice');
  status.hidden = true;
  status.setAttribute('role', 'status');
  const recovery = app.saveRecovery();
  const content = h('div', 'gallery-dialog', toolbar, recovery, status, notices, grid);
  let closed = false;
  const stopListening = trash.onChange(() => { if (!closed) void refresh(); });
  const close = app.modal({
    title: words.title, content,
    onClose() {
      closed = true;
      stopListening();
      app.removeSaveRecovery(recovery);
      urls.forEach(url => URL.revokeObjectURL(url));
      for (const project of trash.list()) announce(app, trash, project);
    },
  });
  content.closest('dialog')?.classList.add('dialog-wide');
  const context = (project?: ProjectRecord): GalleryContext => ({
    project, refresh, close,
    attach: input => { content.append(input); },
    isOpen: () => !closed,
    notice(message, warning) {
      status.hidden = false;
      status.classList.toggle('pingo-note', !warning);
      status.classList.toggle('gallery-notice', Boolean(warning));
      status.textContent = t(message);
    },
  });

  function renderToolbar() {
    const controls: HTMLButtonElement[] = [];
    if (app.store.get().settings.allowImport) {
      const importButton = button(words.importImage, extraIcons.importImage, () => chooseImage(app, close));
      importButton.dataset.focus = 'import';
      controls.push(importButton);
    }
    for (const action of galleryActions.all().filter(action => action.scope === 'gallery' && (action.available?.(app) ?? true))) {
      const control = button(action.label, action.icon, () => app.run(() => action.run(app, context())));
      control.dataset.focus = action.id;
      controls.push(control);
    }
    toolbar.replaceChildren(...controls);
    toolbar.hidden = !controls.length;
    roving(toolbar, words.tools);
  }

  function renderNotices() {
    notices.replaceChildren(...trash.list().map(project => {
      const restore = button(words.undo, icons.undo, () => trash.restore(project.id));
      return h('div', 'gallery-notice', h('span', '', t(deletedMessage(project))), restore);
    }));
  }

  function card(project: ProjectRecord) {
    const page = project.pages[0];
    const thumb = h('img', 'gallery-thumb');
    thumb.alt = '';
    if (page) {
      thumb.src = URL.createObjectURL(page.thumb);
      urls.push(thumb.src);
    }
    const name = project.title.trim() || t(untitled);
    const count = h('span', 'gallery-pages', art(extraIcons.pages), String(project.pages.length));
    count.setAttribute('aria-label', t(pagesLabel(project.pages.length)));
    const open = h('button', 'gallery-open', thumb, h('strong', 'gallery-name', name),
      h('span', 'gallery-meta', h('span', 'gallery-author', project.author.trim()), count));
    open.type = 'button';
    open.dataset.focus = 'open';
    open.setAttribute('aria-label', [name, project.author.trim(), t(pagesLabel(project.pages.length))].filter(Boolean).join(', '));
    open.addEventListener('click', () => app.run(async () => {
      if (open.disabled) return;
      open.disabled = true;
      try {
        const fresh = await app.storage.get(project.id) ?? project;
        if (!await app.documents.open(fresh, undefined, true)) return;
        close();
        app.say(words.opened);
      } finally {
        open.disabled = false;
      }
    }));
    const actions = h('div', 'gallery-actions');
    const article = h('article', 'gallery-card', open, actions);
    article.dataset.project = project.id;
    article.setAttribute('role', 'listitem');

    function normal() {
      const duplicate = button(words.duplicate, extraIcons.duplicate, () => app.run(async () => {
        const copy = duplicateProject(await app.storage.get(project.id) ?? project);
        await app.storage.save(copy);
        await refresh();
        grid.querySelector<HTMLElement>(`[data-project="${copy.id}"] .gallery-open`)?.focus();
        app.say(words.copied);
      }));
      const remove = button(words.remove, extraIcons.trash, () => confirm());
      remove.dataset.focus = 'remove';
      const extra = galleryActions.all().filter(action => action.scope === 'project' && (action.available?.(app) ?? true))
        .map(action => button(action.label, action.icon, () => app.run(() => action.run(app, context(project)))));
      actions.replaceChildren(duplicate, remove, ...extra);
      article.classList.remove('confirming');
    }

    function confirm() {
      const yes = button(words.yes, extraIcons.trash, () => app.run(() => removeWork(project)), 'warning');
      const no = button(words.no, icons.close, () => { normal(); actions.querySelector<HTMLElement>('[data-focus="remove"]')?.focus(); });
      no.dataset.focus = 'no';
      actions.replaceChildren(h('span', 'confirm-text', t(words.confirm)), yes, no);
      article.classList.add('confirming');
      no.focus();
    }

    normal();
    return article;
  }

  async function removeWork(project: ProjectRecord) {
    if (app.store.get().project.id === project.id) {
      // Leave the work being deleted: start on a fresh sheet instead.
      if (await app.documents.save()) await app.documents.open(createProject(createPage()));
    }
    trash.put(project);
  }

  async function refresh() {
    if (closed) return;
    const projects = (await app.storage.list())
      .filter(project => !trash.has(project.id) && project.pages.length)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const focusedProject = document.activeElement?.closest<HTMLElement>('[data-project]')?.dataset.project;
    urls.splice(0).forEach(url => URL.revokeObjectURL(url));
    renderToolbar();
    renderNotices();
    if (!projects.length) {
      const start = button(words.newWork, icons.new, () => { close(); app.openScreen('gallery.new'); }, 'primary big-action');
      grid.replaceChildren(h('div', 'gallery-empty', art(icons.pingo), h('p', '', t(words.empty)), start));
      return;
    }
    grid.replaceChildren(...projects.map(card));
    const again = focusedProject && grid.querySelector<HTMLElement>(`[data-project="${focusedProject}"] .gallery-open`);
    if (focusedProject && !again) (grid.querySelector<HTMLElement>('.gallery-open') ?? notices.querySelector('button'))?.focus();
  }

  grid.setAttribute('aria-label', t(words.works));
  grid.setAttribute('role', 'list');
  await refresh();
  grid.querySelector<HTMLElement>('.gallery-open')?.focus();
}

/** After the gallery closes, keep offering "Anular" until the work is gone. */
export function announce(app: App, trash: Trash, project: ProjectRecord) {
  const dismiss = app.notify(deletedMessage(project), { label: words.undo, run: () => { trash.restore(project.id); } });
  trash.attach(project.id, dismiss);
}
