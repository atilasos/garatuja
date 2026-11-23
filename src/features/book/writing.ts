import { speak, t } from '../../core/i18n';
import type { Settings } from '../../core/store';
import type { App } from '../../ui/app';
import { button, h, replaceControls, unavailable } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { writingInput, uppercaseValue } from '../../ui/writing-input';
import './writing.css';

export const audienceLabel = { pt: 'Para quem é?', en: 'Who is it for?' };
export const textLabel = { pt: 'O meu texto', en: 'My text' };

export function writingText(value: string, settings: Settings) {
  return uppercaseValue(value, settings);
}

export function editWriting(app: App) {
  const { settings } = app.store.get();
  const text = h('textarea', 'book-writing');
  const before = app.documents.page.text;
  text.value = writingText(before, settings);
  text.autofocus = true;
  text.lang = settings.locale === 'pt' ? 'pt-PT' : 'en';
  text.setAttribute('autocorrect', 'off');
  text.setAttribute('autocapitalize', settings.uppercase ? 'characters' : 'off');
  const listenReason = { pt: 'Escreve primeiro um pouco de texto.', en: 'Write some text first.' };
  const explain = (message: typeof listenReason) => {
    notice.hidden = false;
    notice.textContent = t(message);
  };
  writingInput(text, () => app.store.get().settings, value => {
    app.documents.editText(value);
    notice.hidden = true;
    unavailable(listen, value.trim() ? undefined : listenReason, explain);
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
  unavailable(listen, text.value.trim() ? undefined : listenReason, explain);
  app.modal({
    title: textLabel,
    content: h('div', 'dialog-stack', h('label', 'work-field', h('span', '', t(textLabel)), text),
      settings.readAloud ? listen : null, notice),
    onClose: () => {
      app.documents.editText(uppercaseValue(text.value, app.store.get().settings));
      app.documents.rememberText(before);
      void app.documents.save(false);
      if (settings.readAloud && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
  });
  text.closest('dialog')?.classList.add('writing-dialog');
}

export function writingStrip(app: App) {
  const element = h('div', 'writing-strip');
  const invitation = { pt: 'Escreve aqui o teu texto', en: 'Write your text here' };
  const labels = {
    collapsed: { pt: 'Mostrar texto', en: 'Show text' },
    expanded: { pt: 'Recolher texto', en: 'Collapse text' },
    edit: { pt: 'Editar o texto da página', en: 'Edit the page text' },
  };
  const render = () => {
    const { settings, busy } = app.store.get();
    const collapsed = settings.textCollapsed;
    const toggle = button(collapsed ? labels.collapsed : labels.expanded, collapsed ? icons.down : icons.up,
      () => app.configure({ textCollapsed: !collapsed }), 'writing-toggle');
    toggle.dataset.focus = 'writing-toggle';
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-controls', 'page-writing-preview');
    const value = writingText(app.documents.page.text, settings);
    const preview = button({ pt: value || invitation.pt, en: value || invitation.en }, icons.text,
      () => editWriting(app), 'writing-preview');
    preview.id = 'page-writing-preview';
    preview.dataset.focus = 'writing-preview';
    preview.setAttribute('aria-label', t(labels.edit) + (value.trim() ? '. ' + value : ''));
    preview.title = value || t(invitation);
    preview.classList.toggle('writing-invitation', !value.trim());
    preview.hidden = collapsed;
    preview.disabled = busy;
    element.classList.toggle('collapsed', collapsed);
    replaceControls(element, [preview, toggle]);
  };
  render();
  app.store.subscribe((state, previous) => {
    if (state.project !== previous.project || state.pageId !== previous.pageId ||
      state.settings !== previous.settings || state.busy !== previous.busy) render();
  });
  return element;
}
