import { speak, t } from '../../core/i18n';
import type { Settings } from '../../core/store';
import type { App } from '../../ui/app';
import { button, h } from '../../ui/dom';
import { icons } from '../../ui/icons';
import './writing.css';

export const audienceLabel = { pt: 'Para quem é?', en: 'Who is it for?' };
export const textLabel = { pt: 'O meu texto', en: 'My text' };

export function writingText(value: string, settings: Settings) {
  return settings.uppercase ? value.toLocaleUpperCase(settings.locale === 'pt' ? 'pt-PT' : 'en') : value;
}

export function editWriting(app: App) {
  const { settings } = app.store.get();
  const text = h('textarea', 'book-writing');
  text.value = writingText(app.documents.page.text, settings);
  text.autofocus = true;
  text.lang = settings.locale === 'pt' ? 'pt-PT' : 'en';
  text.setAttribute('autocorrect', 'off');
  text.setAttribute('autocapitalize', settings.uppercase ? 'characters' : 'off');
  text.addEventListener('input', () => {
    const value = writingText(text.value, settings);
    if (value !== text.value) {
      const start = writingText(text.value.slice(0, text.selectionStart), settings).length;
      const end = writingText(text.value.slice(0, text.selectionEnd), settings).length;
      text.value = value;
      text.setSelectionRange(start, end);
    }
    app.documents.editText(value);
    listen.disabled = !value.trim();
  });
  const notice = h('p', 'book-writing-warning');
  notice.hidden = true;
  notice.setAttribute('role', 'status');
  const listen = button({ pt: 'Ouvir', en: 'Listen' }, icons.sound, () => {
    const value = text.value.trim();
    if (!value) return;
    notice.hidden = speak({ pt: value, en: value });
    if (!notice.hidden) notice.textContent = t({
      pt: 'A leitura precisa de uma voz instalada neste dispositivo.',
      en: 'Reading aloud needs a voice installed on this device.',
    });
  });
  listen.disabled = !text.value.trim();
  app.modal({
    title: textLabel,
    content: h('div', 'dialog-stack', h('label', 'work-field', h('span', '', t(textLabel)), text),
      settings.readAloud ? listen : null, notice),
    onClose: () => {
      if (settings.readAloud && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
  });
  text.closest('dialog')?.classList.add('writing-dialog');
}
