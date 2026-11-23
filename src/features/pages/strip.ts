import { png, viewport } from '../../core/canvas';
import { t } from '../../core/i18n';
import type { State } from '../../core/store';
import type { PageRecord } from '../../core/types';
import type { App } from '../../ui/app';
import { art, button, h, pressed, replaceControls, roving, unavailable } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { scrollCue } from '../../ui/scroll-cue';
import { pageIcons } from './icons';
import { duplicatePage, maxPages, movePage, removePage, restorePage } from './operations';
import './strip.css';

const pagesLabel = { pt: 'Páginas', en: 'Pages' };
const controlsLabel = { pt: 'Organizar páginas', en: 'Arrange pages' };
const addLabel = { pt: 'Adicionar página', en: 'Add page' };
const full = { pt: 'Este trabalho já tem 60 páginas.', en: 'This work already has 60 pages.' };
const previousGhost = { pt: 'Página anterior', en: 'Previous page' };
const nextGhost = { pt: 'Página seguinte · · ·', en: 'Next page · · ·' };

export function pageStrip(app: App) {
  const strip = h('div', 'page-strip');
  scrollCue(strip);
  const controls = h('div', 'page-strip-controls');
  const arrangement = h('div', 'page-arrangement');
  arrangement.id = 'page-arrangement';
  arrangement.popover = 'auto';
  const actions = h('div', 'page-arrangement-actions');
  arrangement.append(actions);
  const scroller = h('div', 'page-strip-scroller');
  const component = h('div', 'page-strip-component', scroller, controls, arrangement);
  const ghostTags = h('div', 'page-ghost-tags');
  const previousTag = h('span', 'page-ghost-previous');
  const nextTag = h('span', 'page-ghost-next');
  ghostTags.append(previousTag, nextTag);
  app.surface.element.append(ghostTags);

  const focusPages = roving(strip, pagesLabel);
  const actionLabel = { pt: 'Opções de páginas', en: 'Page options' };
  const focusControls = roving(controls, actionLabel);
  const focusActions = roving(actions, controlsLabel);
  const thumbs = new Map<string, { blob: Blob; url: string }>();
  app.onClearData(() => {
    for (const thumb of thumbs.values()) URL.revokeObjectURL(thumb.url);
    thumbs.clear();
  });
  let dragged = '';
  let onion = false;
  let showNext = false;
  let left: HTMLButtonElement;
  let right: HTMLButtonElement;
  let add: HTMLButtonElement;
  let organize: HTMLButtonElement;
  let duplicate: HTMLButtonElement;
  let earlier: HTMLButtonElement;
  let later: HTMLButtonElement;
  let remove: HTMLButtonElement;
  let onionToggle: HTMLButtonElement;
  let nextToggle: HTMLButtonElement;

  function scrollState() {
    const overflow = strip.scrollWidth > scroller.clientWidth + 1;
    left.hidden = right.hidden = !overflow;
    const say = (message: typeof full) => app.say(message);
    unavailable(left, strip.scrollLeft <= 1
      ? { pt: 'Já estás no início das páginas.', en: 'You are at the start of the pages.' } : undefined, say);
    unavailable(right, strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1
      ? { pt: 'Já estás no fim das páginas.', en: 'You are at the end of the pages.' } : undefined, say);
  }

  function scroll(direction: number) {
    strip.scrollBy({ left: direction * Math.max(80, strip.clientWidth - 68) });
  }

  strip.addEventListener('scroll', scrollState);
  new ResizeObserver(scrollState).observe(scroller);
  arrangement.addEventListener('toggle', () =>
    organize.setAttribute('aria-expanded', String(arrangement.matches(':popover-open'))));

  function move(id: string, offset: number) {
    app.run(() => app.documents.editPages(pages => movePage(pages, id, pages.findIndex(page => page.id === id) + offset)));
  }

  function addPage(copy: boolean) {
    const { project, busy } = app.store.get();
    if (busy) return;
    if (project.pages.length >= maxPages) { app.notify(full); return; }
    const id = crypto.randomUUID();
    if (copy) {
      app.run(() => app.documents.editPages(pages => {
        const index = pages.findIndex(page => page.id === app.store.get().pageId);
        const result = [...pages];
        result.splice(index + 1, 0, duplicatePage(pages[index], id));
        return result;
      }, id));
      return;
    }
    app.run(() => app.documents.add((async () => {
      const { paper, foreground } = app.documents.page;
      const page: PageRecord = { id, bitmap: paper, paper, foreground, labels: [], text: '', thumb: new Blob() };
      const preview = viewport(240, 180, true);
      await app.surface.compositePage(page, preview);
      return { ...page, thumb: png(preview.canvas) };
    })()));
  }

  function deletePage() {
    const { project, pageId, busy } = app.store.get();
    if (busy || project.pages.length < 2) return;
    const index = project.pages.findIndex(page => page.id === pageId);
    const before = project.pages[index - 1]?.id;
    const after = project.pages[index + 1]?.id;
    app.run(async () => {
      let removed: PageRecord | undefined;
      await app.documents.editPages(pages => {
        removed = pages.find(page => page.id === pageId);
        return removePage(pages, pageId);
      }, after ?? before);
      const page = removed;
      if (!page) return;
      const undo = {
        label: { pt: 'Anular', en: 'Undo' },
        run: () => app.run(async () => {
          if (app.store.get().busy) {
            await new Promise<void>(resolve => {
              const unsubscribe = app.store.subscribe(state => {
                if (state.busy) return;
                unsubscribe();
                resolve();
              });
            });
          }
          const owner = app.store.get().project;
          const saved = owner.id === project.id ? owner : await app.storage.get(project.id);
          if (!saved) return;
          if (saved.pages.length >= maxPages) { app.notify(full, undo); return; }
          if (app.store.get().project.id === saved.id) {
            if (app.store.get().busy) { undo.run(); return; }
            await app.documents.editPages(pages => restorePage(pages, page, before, after), page.id);
          } else {
            const title = saved.title.trim() || t({ pt: 'Sem título', en: 'Untitled' });
            const restored = await app.storage.write({
              id: crypto.randomUUID(), project: { ...saved, pages: restorePage(saved.pages, page, before, after) },
              expectedAt: saved.updatedAt, time: Date.now(), copyTitle: t({ pt: `${title} (cópia)`, en: `${title} (copy)` }),
            });
            if (restored.id !== saved.id) app.notify({
              pt: 'Outro separador guardou alterações. Recuperei a página numa cópia do trabalho.',
              en: 'Another tab saved changes. I restored the page in a copy of the work.',
            });
          }
        }),
      };
      app.notify({ pt: 'Página apagada.', en: 'Page deleted.' }, undo);
    });
  }

  function updateGhost(state: State) {
    const index = state.project.pages.findIndex(page => page.id === state.pageId);
    const previous = onion ? state.project.pages[index - 1] : undefined;
    const next = onion && showNext ? state.project.pages[index + 1] : undefined;
    previousTag.hidden = !previous;
    nextTag.hidden = !next;
    pressed(onionToggle, onion);
    pressed(nextToggle, onion && showNext);
    nextToggle.hidden = !onion;
    nextToggle.disabled = state.busy;
    focusControls();
    focusActions();
    scrollState();
    app.run(() => app.surface.showOnion(previous, next));
  }

  function render(state: State, previous?: State) {
    const language = state.settings.locale !== previous?.settings.locale;
    const pages = state.project.pages;
    const prior = previous?.project.pages ?? [];
    const order = pages.length !== prior.length || pages.some((page, i) => page.id !== prior[i]?.id);
    const index = pages.findIndex(page => page.id === state.pageId);
    const selection = state.pageId !== previous?.pageId;
    if (language) {
      left = button({ pt: 'Para trás', en: 'Scroll back' }, pageIcons.left, () => scroll(-1));
      right = button({ pt: 'Para a frente', en: 'Scroll forward' }, pageIcons.right, () => scroll(1));
      add = button({ pt: 'Adicionar', en: 'Add' }, icons.plus, () => addPage(false));
      add.setAttribute('aria-label', t(addLabel));
      organize = button({ pt: 'Organizar', en: 'Arrange' }, icons.level, () => {
        if (app.store.get().busy) return;
        if (arrangement.matches(':popover-open')) {
          arrangement.hidePopover();
          return;
        }
        const bounds = organize.getBoundingClientRect();
        arrangement.showPopover();
        arrangement.style.top = Math.max(8, Math.min(bounds.bottom + 8, window.innerHeight - arrangement.offsetHeight - 8)) + 'px';
        arrangement.style.left = Math.max(8, Math.min(bounds.left, window.innerWidth - arrangement.offsetWidth - 8)) + 'px';
        actions.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
      });
      organize.setAttribute('aria-controls', arrangement.id);
      organize.setAttribute('aria-expanded', 'false');
      duplicate = button({ pt: 'Duplicar', en: 'Duplicate' }, pageIcons.duplicate, () => addPage(true));
      earlier = button({ pt: 'Mover à esquerda', en: 'Move left' }, pageIcons.left, () => move(app.store.get().pageId, -1));
      later = button({ pt: 'Mover à direita', en: 'Move right' }, pageIcons.right, () => move(app.store.get().pageId, 1));
      remove = button({ pt: 'Apagar', en: 'Delete' }, pageIcons.remove, deletePage);
      onionToggle = button({ pt: 'Papel vegetal', en: 'Onion skin' }, pageIcons.onion, () => {
        onion = !onion;
        updateGhost(app.store.get());
      });
      nextToggle = button({ pt: 'Ver seguinte', en: 'Show next' }, pageIcons.following, () => {
        showNext = !showNext;
        updateGhost(app.store.get());
      });
      scroller.replaceChildren(left, strip, right);
      replaceControls(controls, [add, organize, onionToggle]);
      replaceControls(actions, [duplicate, earlier, later, remove, nextToggle]);
      controls.setAttribute('aria-label', t(actionLabel));
      actions.setAttribute('aria-label', t(controlsLabel));
      strip.setAttribute('aria-label', t(pagesLabel));
      previousTag.textContent = t(previousGhost);
      nextTag.textContent = t(nextGhost);
    }
    if (order || language) {
      replaceControls(strip, pages.map((page, i) => {
        const label = { pt: `Página ${i + 1}`, en: `Page ${i + 1}` };
        const item = button({ pt: String(i + 1), en: String(i + 1) }, undefined,
          () => app.run(() => app.documents.select(page.id)), 'page');
        item.setAttribute('aria-label', t(label));
        item.dataset.focus = page.id;
        const image = h('img');
        image.alt = '';
        image.draggable = false;
        const hasText = h('span', 'page-text-mark', art(icons.text));
        hasText.title = t({ pt: 'Tem texto', en: 'Has text' });
        hasText.setAttribute('aria-hidden', 'true');
        item.prepend(image, hasText);
        item.draggable = true;
        item.addEventListener('dragstart', event => {
          if (app.store.get().busy || !event.dataTransfer) { event.preventDefault(); return; }
          dragged = page.id;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', page.id);
        });
        item.addEventListener('dragend', () => {
          dragged = '';
          strip.querySelector('[data-drop]')?.removeAttribute('data-drop');
        });
        item.addEventListener('dragover', event => {
          if (!dragged || dragged === page.id) return;
          event.preventDefault();
          item.dataset.drop = 'true';
        });
        item.addEventListener('dragleave', () => { delete item.dataset.drop; });
        item.addEventListener('drop', event => {
          event.preventDefault();
          delete item.dataset.drop;
          const id = dragged;
          dragged = '';
          if (id && id !== page.id) app.run(() => app.documents.editPages(list => movePage(list, id, i)));
        });
        return item;
      }));
    }
    if (order || language || selection || state.busy !== previous?.busy || pages !== prior) {
      for (const [id, thumb] of thumbs) {
        if (!pages.some(page => page.id === id)) {
          URL.revokeObjectURL(thumb.url);
          thumbs.delete(id);
        }
      }
      const items = [...strip.querySelectorAll('button')];
      for (const [i, page] of pages.entries()) {
        let thumb = thumbs.get(page.id);
        if (thumb?.blob !== page.thumb) {
          if (thumb) URL.revokeObjectURL(thumb.url);
          thumb = { blob: page.thumb, url: URL.createObjectURL(page.thumb) };
          thumbs.set(page.id, thumb);
        }
        const image = items[i].querySelector('img');
        if (image && image.src !== thumb.url) image.src = thumb.url;
        const mark = items[i].querySelector<HTMLElement>('.page-text-mark');
        if (mark) mark.hidden = !page.text.trim();
        items[i].setAttribute('aria-description', page.text.trim() ? t({ pt: 'Tem texto', en: 'Has text' }) : '');
        pressed(items[i], page.id === state.pageId);
        items[i].setAttribute('aria-disabled', String(state.busy));
      }
      scrollState();
      if (order || selection) {
        const current = items[index];
        if (current) strip.scrollLeft = current.offsetLeft - Math.max(0, (strip.clientWidth - current.offsetWidth) / 2);
      }
      focusPages();
      const say = (message: typeof full) => app.say(message);
      unavailable(add, pages.length >= maxPages ? full : undefined, say);
      unavailable(duplicate, pages.length >= maxPages ? full : undefined, say);
      unavailable(earlier, index < 1 ? { pt: 'Esta já é a primeira página.', en: 'This is already the first page.' } : undefined, say);
      unavailable(later, index >= pages.length - 1 ? { pt: 'Esta já é a última página.', en: 'This is already the last page.' } : undefined, say);
      unavailable(remove, pages.length < 2 ? { pt: 'O trabalho precisa de uma página.', en: 'The work needs one page.' } : undefined, say);
      focusActions();
      focusControls();
      scrollState();
    }
    if (order || language || selection ||
      (onion && (pages[index - 1] !== prior[index - 1] || (showNext && pages[index + 1] !== prior[index + 1])))) updateGhost(state);
    // Busy can end without any other change: re-enable «Ver seguinte» then too.
    else if (state.busy !== previous?.busy) nextToggle.disabled = state.busy;
  }

  render(app.store.get());
  app.store.subscribe(render);
  return component;
}
