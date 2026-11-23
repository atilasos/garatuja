import { t } from '../../core/i18n';
import type { IconSvg, L10n } from '../../core/types';
import { button } from '../../ui/dom';
import { HOLD_MS } from './gate';

const keepHolding: L10n = {
  pt: 'Mantém premido até a barra encher.',
  en: 'Keep holding until the bar fills up.',
};

/**
 * A button that only acts after being held for `ms` (mouse, touch, pen, or the
 * Space/Enter key). A plain click does nothing except explain what to do.
 */
export function holdButton(status: HTMLElement, label: L10n, icon: IconSvg, done: () => void, ms = HOLD_MS) {
  const control = button(label, icon, event => {
    event.preventDefault();
    if (!fired) status.textContent = t(keepHolding);
  }, 'hold-button');
  control.setAttribute('aria-description', t(keepHolding));
  let started = 0;
  let frame = 0;
  let fired = false;

  const tick = () => {
    const progress = Math.min(1, (performance.now() - started) / ms);
    control.style.setProperty('--hold', String(progress));
    if (progress >= 1) {
      stop();
      fired = true;
      done();
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  const start = () => {
    if (started) return;
    fired = false;
    started = performance.now();
    control.classList.add('holding');
    frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    started = 0;
    control.classList.remove('holding');
    control.style.setProperty('--hold', '0');
  };
  control.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    control.setPointerCapture(event.pointerId);
    start();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'] as const) control.addEventListener(type, stop);
  control.addEventListener('contextmenu', event => event.preventDefault());
  control.addEventListener('keydown', event => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) start();
  });
  control.addEventListener('keyup', event => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    stop();
    if (!fired) status.textContent = t(keepHolding);
  });
  return control;
}
