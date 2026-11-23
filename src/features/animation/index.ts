import { t } from '../../core/i18n';
import type { App, Feature } from '../../ui/app';
import { art, button, h, pressed, unavailable } from '../../ui/dom';
import { pageIcons } from '../pages/icons';
import { download } from '../exchange/download';
import { encodeGif, encodeWebm, webmType } from './encode';
import { animationFps, speeds } from './frames';
import { animationIcons } from './icons';
import { Player } from './player';
import './player.css';

const animate = { pt: 'Animar', en: 'Animate' };
const preview = { pt: 'Reproduzir', en: 'Play' };
const pause = { pt: 'Pausar', en: 'Pause' };
const speedOptions = [
  { label: { pt: 'Devagar', en: 'Slow' }, icon: animationIcons.snail },
  { label: { pt: 'Normal', en: 'Normal' }, icon: animationIcons.cat },
  { label: { pt: 'Depressa', en: 'Fast' }, icon: animationIcons.hare },
];

async function animateWork(app: App) {
  const project = app.documents.snapshot();
  const { pages, title } = project;
  const controller = new AbortController();
  const position = h('span', 'animation-position');
  const notice = h('p', 'animation-warning');
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  const progress = h('progress');
  progress.max = pages.length;
  progress.hidden = true;
  const progressWords = { pt: 'A preparar o ficheiro…', en: 'Preparing the file…' };
  progress.setAttribute('aria-label', t(progressWords));
  const progressLabel = h('span', '', t(progressWords));
  progressLabel.hidden = true;

  function showNotice(message: Parameters<typeof t>[0]) {
    notice.textContent = t(message);
    notice.hidden = false;
  }

  const player = new Player(app.surface, pages, animationFps(project.fps),
    update, error => {
      console.error(error);
      showNotice({ pt: 'Não consegui mostrar a página.', en: 'I couldn’t show that page.' });
    });
  const previous = button({ pt: 'Quadro anterior', en: 'Previous frame' }, pageIcons.left, () => player.step(-1));
  const next = button({ pt: 'Quadro seguinte', en: 'Next frame' }, pageIcons.right, () => player.step(1));
  const play = button(preview, pageIcons.play, () => player.playing ? player.pause() : player.play(), 'primary');
  const loop = button({ pt: 'Ciclo', en: 'Loop' }, animationIcons.loop, () => {
    player.loop = !player.loop;
    pressed(loop, player.loop);
  });
  pressed(loop, player.loop);
  const speedButtons = speeds.map((fps, index) => {
    const { label, icon } = speedOptions[index];
    return button(label, icon, () => {
      player.fps = fps;
      app.documents.editProject({ fps });
      update();
    });
  });
  const speedGroup = h('div', 'animation-tools', ...speedButtons);
  speedGroup.setAttribute('role', 'group');
  speedGroup.setAttribute('aria-label', t({ pt: 'Velocidade', en: 'Speed' }));

  function update() {
    const action = player.playing ? pause : preview;
    if (play.getAttribute('aria-label') !== t(action)) {
      play.replaceChildren(art(player.playing ? animationIcons.pause : pageIcons.play), h('span', 'button-label', t(action)));
      play.setAttribute('aria-label', t(action));
    }
    position.textContent = t({ pt: `Quadro ${player.index + 1} de ${pages.length}`, en: `Frame ${player.index + 1} of ${pages.length}` });
    unavailable(previous, player.index === 0
      ? { pt: 'Este já é o primeiro quadro.', en: 'This is already the first frame.' } : undefined, showNotice);
    unavailable(next, player.index === pages.length - 1
      ? { pt: 'Este já é o último quadro.', en: 'This is already the last frame.' } : undefined, showNotice);
    speedButtons.forEach((control, i) => pressed(control, speeds[i] === player.fps));
  }

  async function exportFile(format: 'gif' | 'webm') {
    if (!progress.hidden) return;
    notice.hidden = true;
    const type = format === 'webm' ? webmType() : undefined;
    if (format === 'webm' && !type) {
      showNotice({ pt: 'Este dispositivo não grava vídeo WebM. Podes guardar em GIF.', en: 'This device can’t record WebM. You can save a GIF.' });
      return;
    }
    player.pause();
    progress.hidden = progressLabel.hidden = false;
    progress.value = 0;
    gif.disabled = webm.disabled = true;
    try {
      const options = { surface: app.surface, pages, fps: player.fps, loop: player.loop, signal: controller.signal,
        progress: (done: number) => { progress.value = done; } };
      const file = type ? await encodeWebm(options, type) : await encodeGif(options);
      if (!controller.signal.aborted) download(file, title, format);
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(error);
        showNotice({ pt: 'Não consegui preparar o ficheiro. Tenta de novo.', en: 'I couldn’t prepare the file. Try again.' });
      }
    } finally {
      gif.disabled = webm.disabled = false;
      progress.hidden = progressLabel.hidden = true;
    }
  }

  const gif = button({ pt: 'Guardar GIF', en: 'Save GIF' }, pageIcons.download, () => app.run(() => exportFile('gif')));
  const webm = button({ pt: 'Guardar WebM', en: 'Save WebM' }, pageIcons.download, () => app.run(() => exportFile('webm')));
  const content = h('div', 'animation-screen', player.view.canvas,
    h('div', 'animation-tools', previous, play, next, loop, position),
    h('div', 'animation-settings', speedGroup, h('div', 'animation-tools', gif, webm)),
    h('div', 'animation-progress', progressLabel, progress), notice);
  app.modal({ title: animate, content, onClose: () => { controller.abort(); player.pause(); } });
  content.closest('dialog')?.classList.add('animation-dialog');
  update();
  await player.show(0);
}

export default {
  id: 'animation',
  mount(app) {
    app.registerScreen('animation.play', animateWork);
    app.registerAction({
      id: 'animate', hint: { pt: 'Vê as páginas a passar como um filme.', en: 'Watch your pages play like a film.' }, label: animate, icon: pageIcons.play, order: 5,
      unavailable: app => app.store.get().project.pages.length < 2
        ? { pt: 'Para animar, junta outra página.', en: 'Add another page to animate.' } : undefined,
      run: app => app.openScreen('animation.play'),
    });
  },
} satisfies Feature;
