import { viewport } from '../../core/canvas';
import { t } from '../../core/i18n';
import type { ProjectRecord } from '../../core/types';
import type { App } from '../../ui/app';
import { art, button, h, pressed } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { untitled } from '../../ui/work-fields';
import { animationFps } from '../animation/frames';
import { Player } from '../animation/player';
import { pageIcons } from '../pages/icons';
import { audienceLabel, writingText } from './writing';
import './reader.css';

export const readLabel = { pt: 'Ler', en: 'Read' };
export const presentLabel = { pt: 'Apresentar à turma', en: 'Present to the class' };

export function coverDetails(project: ProjectRecord) {
  return h('div', 'book-cover-details',
    h('h1', '', project.title || t(untitled)),
    project.author ? h('p', 'book-author', project.author) : null,
    project.audience ? h('div', 'book-audience', h('strong', '', t(audienceLabel)), h('p', '', project.audience)) : null);
}

export async function showReader(app: App, presentation?: () => HTMLElement) {
  const presenting = Boolean(presentation);
  const title = presenting ? presentLabel : readLabel;
  const display = h('div', 'book-display');
  const position = h('span', 'book-position');
  position.setAttribute('role', 'status');
  position.tabIndex = -1;
  const feedback = presentation?.();
  let pageIndex = -1;
  let project: ProjectRecord | undefined = undefined;
  let player: Player | undefined;
  let closed = false;
  let wasFull = false;
  const animatePlay = { pt: 'Reproduzir animação', en: 'Play animation' };
  const animateBack = { pt: 'Voltar à página', en: 'Back to the page' };
  const animation = button(animatePlay, pageIcons.play, () => {
    if (player) {
      closeAnimation();
      render();
      return;
    }
    if (!project) return;
    const current = new Player(app.surface, project.pages, animationFps(project.fps), () => {}, error =>
      app.run(() => { throw error; }));
    player = current;
    render();
    app.run(async () => {
      await current.show(0);
      if (player === current) current.play();
    });
  });
  animation.hidden = true;
  const previous = button({ pt: 'Anterior', en: 'Previous' }, pageIcons.left, () => move(-1));
  const next = button({ pt: 'Seguinte', en: 'Next' }, pageIcons.right, () => move(1));
  const closeButton = button({ pt: 'Sair', en: 'Exit' }, icons.close, () => close());
  const content = h('div', presenting ? 'book-reader class-presentation' : 'book-reader',
    presenting ? h('header', 'book-presentation-bar', h('h2', '', t(title)), animation, closeButton) : null,
    display, h('nav', 'book-navigation', previous, position, next));

  function fullscreenChanged() {
    if (document.fullscreenElement === content) wasFull = true;
    else if (wasFull) close();
  }

  const close = app.modal({ title, content, onClose: () => {
    closed = true;
    closeAnimation();
    document.removeEventListener('fullscreenchange', fullscreenChanged);
    if (document.fullscreenElement === content) void document.exitFullscreen().catch(() => {});
  } });
  const dialog = content.closest('dialog');
  dialog?.classList.add(presenting ? 'presentation-dialog' : 'book-dialog');
  if (presenting) {
    document.addEventListener('fullscreenchange', fullscreenChanged);
    void content.requestFullscreen?.().catch(() => {});
    position.focus();
  }

  function closeAnimation() {
    player?.pause();
    player = undefined;
  }

  function move(delta: number) {
    if (!project) return;
    const index = Math.min(project.pages.length - (feedback ? 0 : 1), Math.max(-1, pageIndex + delta));
    if (index === pageIndex && !player) return;
    pageIndex = index;
    closeAnimation();
    render();
  }

  function render() {
    if (!project || closed) return;
    const last = project.pages.length - (feedback ? 0 : 1);
    previous.setAttribute('aria-disabled', String(pageIndex === -1 && !player));
    next.setAttribute('aria-disabled', String(pageIndex === last && !player));
    animation.hidden = !presenting || project.pages.length < 2 || pageIndex === project.pages.length;
    const playLabel = player ? animateBack : animatePlay;
    animation.setAttribute('aria-label', t(playLabel));
    animation.replaceChildren(art(player ? pageIcons.left : pageIcons.play), h('span', 'button-label', t(playLabel)));
    pressed(animation, Boolean(player));
    if (player) {
      display.replaceChildren(h('div', 'book-presentation-animation', player.view.canvas));
      position.textContent = t({ pt: 'Animação', en: 'Animation' });
      return;
    }
    if (pageIndex === project.pages.length && feedback) {
      display.replaceChildren(feedback);
      position.textContent = t({ pt: 'Comentários', en: 'Comments' });
      return;
    }
    const page = project.pages[Math.max(0, pageIndex)];
    const canvas = viewport(960, 720);
    const illustration = h('div', 'book-illustration', canvas.canvas);
    const writing = writingText(page.text, app.store.get().settings);
    if (pageIndex === -1) {
      display.replaceChildren(h('article', 'book-spread book-cover', illustration, coverDetails(project)));
      position.textContent = t({ pt: 'Capa', en: 'Cover' });
    } else {
      display.replaceChildren(h('article', 'book-spread', illustration, h('div', 'book-copy', h('p', '', writing))));
      position.textContent = t({
        pt: `Página ${pageIndex + 1} de ${project.pages.length}`,
        en: `Page ${pageIndex + 1} of ${project.pages.length}`,
      });
    }
    app.run(() => app.surface.compositePage(page, canvas));
  }

  dialog?.addEventListener('keydown', event => {
    if (event.key === 'Escape' && presenting) {
      event.preventDefault();
      close();
      return;
    }
    if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'ArrowRight' || event.key === 'PageDown' ||
      (event.code === 'Space' && !(event.target instanceof HTMLButtonElement))) {
      event.preventDefault();
      move(1);
    }
  });
  let swipeStart: { x: number; y: number } | undefined;
  display.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { swipeStart = undefined; return; }
    const touch = event.touches[0];
    swipeStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  display.addEventListener('touchend', event => {
    const start = swipeStart;
    swipeStart = undefined;
    if (!start || !event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    if (Math.abs(dx) >= 52 && Math.abs(dx) > Math.abs(touch.clientY - start.y) * 1.4) move(dx > 0 ? -1 : 1);
  });
  display.addEventListener('touchcancel', () => { swipeStart = undefined; });
  await app.documents.save();
  project = app.store.get().project;
  render();
}
