import { viewport } from '../../core/canvas';
import { t } from '../../core/i18n';
import type { L10n, ProjectRecord } from '../../core/types';
import type { App } from '../../ui/app';
import { art, button, h, pressed, unavailable } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { untitled } from '../../ui/work-fields';
import { animationIcons } from '../animation/icons';
import { animationFps } from '../animation/frames';
import { Player } from '../animation/player';
import { pageIcons } from '../pages/icons';
import { audienceLabel, writingText } from './writing';
import './reader.css';

export const readLabel = { pt: 'Ler', en: 'Read' };
export const presentLabel = { pt: 'Apresentar à turma', en: 'Present to the class' };

export const slidesLabel = { pt: 'Diapositivos', en: 'Slideshow' };
export const hasCover = (project: ProjectRecord) => project.pages.length > 1 || Boolean(project.title.trim() || project.author.trim());

export function coverDetails(project: ProjectRecord, className: string) {
  return h('div', 'book-cover-details',
    h('h1', '', project.title || t(untitled)),
    className.trim() ? h('p', 'book-class', className) : null,
    project.author ? h('p', 'book-author', project.author) : null,
    project.audience ? h('div', 'book-audience', h('strong', '', t(audienceLabel)), h('p', '', project.audience)) : null);
}

export function showReader(app: App, presentation?: (() => HTMLElement) | readonly ProjectRecord[]) {
  const slides = presentation && typeof presentation !== 'function'
    ? presentation.flatMap(project => project.pages.map((page, index) => ({ project, page, index }))) : undefined;
  const presenting = Boolean(presentation);
  const title = slides ? slidesLabel : presenting ? presentLabel : readLabel;
  const settings = app.store.get().settings;
  const speeds = [
    { label: { pt: 'Devagar', en: 'Slow' }, icon: animationIcons.snail, delay: 8000 },
    { label: { pt: 'Normal', en: 'Normal' }, icon: animationIcons.cat, delay: 5000 },
    { label: { pt: 'Depressa', en: 'Fast' }, icon: animationIcons.hare, delay: 2500 },
  ];
  let delay = speeds[1].delay;
  let timer: number | undefined;
  let autoplay = false;
  const display = h('div', 'book-display');
  const position = h('span', 'book-position');
  const boundary = h('span', 'book-boundary');
  boundary.setAttribute('role', 'status');
  const explain = (message: L10n) => { boundary.textContent = t(message); };
  position.setAttribute('role', 'status');
  position.tabIndex = -1;
  const feedback = typeof presentation === 'function' ? presentation() : undefined;
  const project = app.documents.snapshot();
  const first = slides || !hasCover(project) ? 0 : -1;
  const last = slides ? slides.length - 1 : project.pages.length - (feedback ? 0 : 1);
  let pageIndex = first;
  let player: Player | undefined;
  let closed = false;
  let closing = false;
  let wasFull = false;
  const animatePlay = { pt: 'Reproduzir animação', en: 'Play animation' };
  const animateBack = { pt: 'Voltar à página', en: 'Back to the page' };
  const animation = button(animatePlay, pageIcons.play, () => {
    if (player) {
      closeAnimation();
      render();
      return;
    }
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
  const automatic = button({ pt: 'Avanço automático', en: 'Auto advance' }, pageIcons.play, () => {
    autoplay = !autoplay;
    if (autoplay && pageIndex === last) pageIndex = first;
    render();
  });
  const speedRow = h('div', 'slide-speeds', ...speeds.map(({ label, icon, delay: ms }) => {
    const speed = button(label, icon, () => {
      delay = ms;
      for (const item of speedRow.querySelectorAll('button')) pressed(item, item === speed);
      schedule();
    });
    pressed(speed, ms === delay);
    return speed;
  }));
  const closeButton = button({ pt: 'Sair', en: 'Exit' }, icons.close, () => dismiss());
  const content = h('div', presenting ? 'book-reader class-presentation' : 'book-reader',
    presenting ? h('header', 'book-presentation-bar', h('h2', '', t(title)), slides ? automatic : animation, slides ? speedRow : null, closeButton) : null,
    display, h('nav', 'book-navigation', previous, h('div', '', position, boundary), next));

  function fullscreenChanged() {
    if (document.fullscreenElement === content) wasFull = true;
    else if (wasFull) dismiss();
  }

  const close = app.modal({ title, content, onClose: () => {
    closed = true;
    window.clearTimeout(timer);
    closeAnimation();
    document.removeEventListener('fullscreenchange', fullscreenChanged);
    if (document.fullscreenElement === content) void document.exitFullscreen().catch(() => {});
  } });
  const dialog = content.closest('dialog');
  dialog?.classList.add(presenting ? 'presentation-dialog' : 'book-dialog');
  dialog?.addEventListener('cancel', event => {
    if (!presenting) return;
    event.preventDefault();
    dismiss();
  });
  if (presenting) {
    document.addEventListener('fullscreenchange', fullscreenChanged);
    void content.requestFullscreen?.().catch(() => {});
    position.focus();
  }

  function dismiss() {
    if (closing || closed) return;
    closing = true;
    if (!feedback) { close(); return; }
    app.run(async () => {
      await app.documents.save(false);
      close();
    });
  }

  function closeAnimation() {
    player?.pause();
    player = undefined;
  }

  function scrollWriting(delta: number) {
    if (player) return false;
    const copy = display.querySelector<HTMLElement>('.book-copy, .book-cover-details');
    if (!copy) return false;
    const limit = copy.scrollHeight - copy.clientHeight;
    if (limit <= 1 || (delta > 0 ? copy.scrollTop >= limit - 1 : copy.scrollTop <= 1)) return false;
    copy.scrollTop += delta * Math.max(1, copy.clientHeight - 40);
    schedule();
    return true;
  }

  function move(delta: number) {
    if (scrollWriting(delta)) return;
    const index = Math.min(last, Math.max(first, pageIndex + delta));
    if (index === pageIndex && !player) {
      explain(delta < 0 ? { pt: 'Já estás no início.', en: 'You are at the beginning.' }
        : { pt: 'Já estás no fim.', en: 'You are at the end.' });
      return;
    }
    pageIndex = index;
    closeAnimation();
    render();
  }

  function schedule() {
    window.clearTimeout(timer);
    if (autoplay && !closed && !closing) timer = window.setTimeout(() => move(1), delay);
  }

  function render() {
    if (closed) return;
    if (pageIndex === last) autoplay = false;
    pressed(automatic, autoplay);
    schedule();
    boundary.textContent = '';
    unavailable(previous, pageIndex === first && !player
      ? { pt: 'Já estás no início.', en: 'You are at the beginning.' } : undefined, explain);
    unavailable(next, pageIndex === last && !player
      ? { pt: 'Já estás no fim.', en: 'You are at the end.' } : undefined, explain);
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
    if (pageIndex === -1) {
      display.replaceChildren(h('article', 'book-spread book-cover', coverDetails(project, settings.className)));
      position.textContent = t({ pt: 'Capa', en: 'Cover' });
      return;
    }
    const slide = slides?.[pageIndex];
    const page = slide?.page ?? project.pages[pageIndex];
    if (!page) return;
    const canvas = viewport(960, 720);
    const illustration = h('div', 'book-illustration', canvas.canvas);
    const writing = writingText(page.text, settings);
    display.replaceChildren(h('article', 'book-spread', illustration,
      h('div', 'book-copy',
        slide ? h('header', 'slide-work', h('h3', '', slide.project.title || t(untitled)),
          h('p', '', slide.project.author)) : null,
        h('p', '', writing))));
    const index = (slide?.index ?? pageIndex) + 1;
    const count = slide?.project.pages.length ?? project.pages.length;
    position.textContent = t({ pt: `Página ${index} de ${count}`, en: `Page ${index} of ${count}` });
    app.run(() => app.surface.compositePage(page, canvas));
  }

  dialog?.addEventListener('keydown', event => {
    if (event.key === 'Escape' && presenting) {
      event.preventDefault();
      dismiss();
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
  render();
}
