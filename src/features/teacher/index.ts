import { getLocale, t } from '../../core/i18n';
import { configurableTools, type Settings } from '../../core/store';
import { tools } from '../../core/registry';
import { keyboardIcon, keyboardLabel, keyboardLayoutField, writingInput } from '../../ui/writing-input';
import type { L10n } from '../../core/types';
import type { App, Feature } from '../../ui/app';
import { art, button, h, pressed, roving } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { extraIcons } from '../settings/icons';
import './teacher.css';
import { archiveVolumes } from '../exchange/format';
import { download } from '../exchange/download';
import { clearPreferences, formatBytes } from './data';
import { checkAnswer, checkPin, makeChallenge, readPin, removePin, setPin, validPin } from './gate';

const words = {
  gateTitle: { pt: 'Área do adulto', en: 'Adult area' },
  question: { pt: 'Quanto é', en: 'What is' },
  answer: { pt: 'Resposta por extenso', en: 'Answer in words' },
  pin: { pt: 'PIN do adulto', en: 'Adult PIN' },
  setPin: { pt: 'Definir PIN', en: 'Set PIN' },
  changePin: { pt: 'Alterar PIN', en: 'Change PIN' },
  pinHelp: {
    pt: 'Podes proteger esta área com um PIN de quatro algarismos, guardado neste dispositivo. Se te esqueceres, apaga os dados deste site no navegador. Isso também apaga os trabalhos e as definições.',
    en: 'You can protect this area with a four-digit PIN stored on this device. If you forget it, clear this site’s data in the browser. This also deletes works and settings.',
  },
  removePin: { pt: 'Remover PIN', en: 'Remove PIN' },
  pinRemoved: { pt: 'PIN removido.', en: 'PIN removed.' },
  tools: { pt: 'Ferramentas disponíveis', en: 'Available tools' },
  pinSaved: { pt: 'PIN guardado neste dispositivo.', en: 'PIN saved on this device.' },
  pinInvalid: { pt: 'Escreve quatro algarismos.', en: 'Enter four digits.' },
  erase: { pt: 'Escreve APAGAR', en: 'Type DELETE' },
  eraseWord: { pt: 'APAGAR', en: 'DELETE' },
  enter: { pt: 'Entrar', en: 'Enter' },
  wrong: { pt: 'Não é essa. Experimenta outra vez.', en: 'That is not it. Try again.' },
  title: { pt: 'Área do professor', en: 'Teacher area' },
  privacy: {
    pt: 'Tudo fica neste dispositivo. A Garatuja não envia nada para a internet: não há contas, anúncios nem estatísticas.',
    en: 'Everything stays on this device. Garatuja sends nothing to the internet: no accounts, ads or statistics.',
  },
  interface: { pt: 'Interface e língua', en: 'Interface and language' },
  byDefault: { pt: 'Interface', en: 'Interface' },
  simple: { pt: 'Simples', en: 'Simple' },
  full: { pt: 'Completa', en: 'Full' },
  language: { pt: 'Língua', en: 'Language' },
  options: { pt: 'Opções para a turma', en: 'Class options' },
  className: { pt: 'Nome da turma', en: 'Class name' },
  classHint: { pt: 'Aparece discreto na barra de cima.', en: 'Shown discreetly in the top bar.' },
  data: { pt: 'Trabalhos e espaço', en: 'Works and storage' },
  used: { pt: 'Espaço usado', en: 'Space used' },
  unknown: { pt: 'Este navegador não diz o espaço usado.', en: 'This browser does not report storage use.' },
  persist: { pt: 'Pedir armazenamento persistente', en: 'Ask for persistent storage' },
  persisted: { pt: 'O navegador não apaga os trabalhos sozinho.', en: 'The browser will not clear the works on its own.' },
  notPersisted: {
    pt: 'O navegador pode apagar dados se faltar espaço. Pede armazenamento persistente.',
    en: 'The browser may clear data when space runs low. Ask for persistent storage.',
  },
  refused: { pt: 'O navegador não aceitou o pedido.', en: 'The browser did not accept the request.' },
  exportAll: { pt: 'Exportar todos os trabalhos', en: 'Export all works' },
  exported: { pt: 'Ficheiro com todos os trabalhos criado.', en: 'File with all works created.' },
  clearAll: { pt: 'Apagar todos os dados do dispositivo', en: 'Delete all data on this device' },
  confirm1: {
    pt: 'Apagar todos os trabalhos e definições deste dispositivo? Exporta-os primeiro se os quiseres guardar.',
    en: 'Delete all works and settings on this device? Export them first if you want to keep them.',
  },
  continue: { pt: 'Continuar', en: 'Continue' },
  confirm2: { pt: 'Tens a certeza? Isto não se pode anular.', en: 'Are you sure? This cannot be undone.' },
  confirmFinal: { pt: 'Sim, apagar tudo', en: 'Yes, delete everything' },
  cancel: { pt: 'Cancelar', en: 'Cancel' },
} satisfies Record<string, L10n>;

type Flag = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

const flags: { key: Flag; label: L10n; icon: string }[] = [
  { key: 'sound', label: { pt: 'Som', en: 'Sound' }, icon: icons.sound },
  { key: 'readAloud', label: { pt: 'Leitura em voz alta', en: 'Read aloud' }, icon: extraIcons.listen },
  { key: 'uppercase', label: { pt: 'Só maiúsculas', en: 'Capital letters only' }, icon: extraIcons.uppercase },
  { key: 'allowPrint', label: { pt: 'Permitir imprimir', en: 'Allow printing' }, icon: icons.print },
  { key: 'allowImport', label: { pt: 'Permitir importar ficheiros', en: 'Allow importing files' }, icon: extraIcons.importImage },
  { key: 'screenKeyboard', label: keyboardLabel, icon: keyboardIcon },
  { key: 'fixedClick', label: { pt: 'Clique fixo', en: 'Click to start and stop' }, icon: extraIcons.fixedClick },
  { key: 'largeCursor', label: { pt: 'Cursor grande', en: 'Large cursor' }, icon: extraIcons.cursor },
  { key: 'highContrast', label: { pt: 'Alto contraste', en: 'High contrast' }, icon: extraIcons.contrast },
  { key: 'leftHanded', label: { pt: 'Mão esquerda', en: 'Left-handed layout' }, icon: extraIcons.hand },
];

function gate(app: App) {
  const challenge = makeChallenge();
  const input = h('input');
  const pin = readPin();
  if (pin) {
    input.type = 'password';
    input.inputMode = 'numeric';
    input.maxLength = 4;
  }
  input.autocomplete = 'off';
  input.autofocus = true;
  const message = h('p', 'gate-message');
  message.setAttribute('role', 'alert');
  const submit = () => app.run(async () => {
    if (pin ? await checkPin(input.value, pin) : checkAnswer(input.value, challenge.answer)) {
      if (!input.closest('dialog')?.open) return;
      close();
      app.openScreen('teacher.panel');
    } else {
      message.textContent = t(words.wrong);
      input.select();
    }
  });
  input.addEventListener('keydown', event => { if (event.key === 'Enter') submit(); });
  const close = app.modal({
    title: words.gateTitle,
    content: h('div', 'dialog-stack',
      pin ? null : h('p', 'gate-question', `${t(words.question)} `, h('strong', '', t(challenge.question)), '?'),
      h('label', 'work-field', h('span', '', t(pin ? words.pin : words.answer)), input), message,
      h('div', 'dialog-actions', button(words.enter, extraIcons.check, submit, 'primary'))),
  });
}

function section(title: L10n, ...children: (Node | string)[]) {
  return h('section', 'teacher-section', h('h3', '', t(title)), ...children);
}

async function storageLine() {
  const line = h('p', 'storage-line');
  if (!navigator.storage?.estimate) {
    line.textContent = t(words.unknown);
    return line;
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const locale = getLocale();
  line.textContent = `${t(words.used)}: ${formatBytes(usage, locale)}` + (quota ? ` / ${formatBytes(quota, locale)}` : '');
  return line;
}

async function panel(app: App) {
  const settings = () => app.store.get().settings;
  const choiceRow = <T,>(label: L10n, items: { value: T; label: L10n; icon: string }[], current: () => T, set: (value: T) => void) => {
    const row = h('div', 'segmented');
    const render = () => {
      row.replaceChildren(...items.map(item => {
        const control = button(item.label, item.icon, () => { set(item.value); render(); row.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus(); });
        pressed(control, item.value === current());
        return control;
      }));
    };
    render();
    roving(row, label);
    return h('div', 'teacher-row', h('span', 'teacher-label', t(label)), row);
  };

  const level = choiceRow(words.byDefault, [{ value: 1 as const, label: words.simple, icon: icons.level }, { value: 2 as const, label: words.full, icon: extraIcons.full }],
    () => settings().level, value => app.configure({ level: value }));
  const language = choiceRow(words.language, [
    { value: 'pt' as const, label: { pt: 'Português', en: 'Português' }, icon: extraIcons.language },
    { value: 'en' as const, label: { pt: 'English', en: 'English' }, icon: extraIcons.language }],
  () => settings().locale, value => { app.configure({ locale: value }); close(); app.openScreen('teacher.panel'); });

  const toggles = flags.map(flag => {
    const box = h('input');
    box.type = 'checkbox';
    box.checked = settings()[flag.key];
    box.addEventListener('change', () => app.configure({ [flag.key]: box.checked }));
    return h('label', 'setting', h('span', 'setting-name', art(flag.icon), t(flag.label)), box);
  });

  const toolToggles = configurableTools.flatMap(id => {
    const tool = tools.get(id);
    if (!tool) return [];
    const box = h('input');
    box.type = 'checkbox';
    box.checked = !settings().disabledTools[id];
    box.addEventListener('change', () => app.configure({ disabledTools: { [id]: !box.checked } }));
    return [h('label', 'setting', h('span', 'setting-name', art(tool.icon), t(tool.label)), box)];
  });

  const className = h('input');
  className.value = settings().className;
  className.maxLength = 60;
  writingInput(className, settings, value => app.configure({ className: value }));

  const persistStatus = h('p', 'storage-line');
  const persistButton = button(words.persist, extraIcons.storage, () => app.run(async () => {
    const granted = await navigator.storage?.persist?.();
    if (!granted) app.notify(words.refused);
    await updatePersist();
  }));
  async function updatePersist() {
    const persisted = await navigator.storage?.persisted?.();
    persistStatus.textContent = t(persisted ? words.persisted : words.notPersisted);
    persistButton.hidden = Boolean(persisted) || !navigator.storage?.persist;
  }

  const exportStatus = h('p', 'storage-line');
  exportStatus.setAttribute('role', 'status');
  exportStatus.hidden = true;
  const downloads = h('div', 'dialog-actions start');
  const exportButton = button(words.exportAll, extraIcons.download, () => app.run(async () => {
    exportButton.disabled = true;
    try {
      exportStatus.hidden = false;
      downloads.replaceChildren();
      const projects = (await app.storage.list()).filter(project => !app.isTrashed(project.id));
      for (const draft of app.documents.backupDrafts()) {
        const local = draft.project;
        if (app.isTrashed(local.id)) continue;
        const index = projects.findIndex(project => project.id === local.id);
        if (index < 0) projects.push(local);
        else if (projects[index].updatedAt === draft.expectedAt) projects[index] = local;
        else projects.push({ ...local, id: crypto.randomUUID(), title: draft.copyTitle });
      }
      if (!projects.length) {
        exportStatus.textContent = t({ pt: 'Ainda não há trabalhos para exportar.', en: 'There are no works to export yet.' });
        return;
      }
      const progress = (count: number) => {
        exportStatus.textContent = t({ pt: `A preparar trabalhos (${count}/${projects.length})`, en: `Preparing works (${count}/${projects.length})` });
      };
      progress(0);
      const files = await archiveVolumes(projects, progress);
      const name = 'garatuja-todos-os-trabalhos-' + new Date().toISOString().slice(0, 10);
      if (files.length === 1) {
        download(files[0], name, 'garatuja');
        exportStatus.textContent = t(words.exported);
        app.confirm(words.exported);
        return;
      }
      exportStatus.textContent = t({ pt: `${files.length} volumes prontos. Guarda e importa cada um.`, en: `${files.length} volumes ready. Save and import each one.` });
      files.forEach((file, index) => downloads.append(button(
        { pt: `Guardar volume ${index + 1}`, en: `Save volume ${index + 1}` }, extraIcons.download,
        () => download(file, `${name}-${index + 1}`, 'garatuja'))));
    } finally {
      exportButton.disabled = false;
    }
  }));

  const pin = h('input');
  pin.type = 'password';
  pin.inputMode = 'numeric';
  pin.autocomplete = 'new-password';
  pin.maxLength = 4;
  const pinStatus = h('p', 'gate-message');
  pinStatus.setAttribute('role', 'status');
  const pinButton = button(readPin() ? words.changePin : words.setPin, extraIcons.check, () => app.run(async () => {
    if (!validPin(pin.value)) {
      pinStatus.textContent = t(words.pinInvalid);
      pin.focus();
      return;
    }
    await setPin(pin.value);
    pin.value = '';
    pinStatus.textContent = t(words.pinSaved);
    updatePinButtons();
  }));
  const remove = button(words.removePin, extraIcons.trash, () => app.run(() => {
    removePin();
    pinStatus.textContent = t(words.pinRemoved);
    updatePinButtons();
    pinButton.focus();
  }));
  function updatePinButtons() {
    const labelText = t(readPin() ? words.changePin : words.setPin);
    remove.hidden = !readPin();
    pinButton.setAttribute('aria-label', labelText);
    const label = pinButton.querySelector('.button-label');
    if (label) label.textContent = labelText;
  }
  updatePinButtons();

  const danger = h('div', 'danger-zone');
  const clearStart = () => {
    const cancel = button(words.cancel, icons.close, reset);
    danger.replaceChildren(h('p', '', t(words.confirm1)), h('div', 'dialog-actions',
      cancel, button(words.continue, extraIcons.trash, () => {
        const no = button(words.cancel, icons.close, reset);
        const confirmation = h('input');
        confirmation.autocomplete = 'off';
        const erase = button(words.confirmFinal, extraIcons.trash, () => {
          if (confirmation.value.trim().toUpperCase() === t(words.eraseWord)) app.run(() => clearEverything(app));
        }, 'warning');
        erase.disabled = true;
        confirmation.addEventListener('input', () => { erase.disabled = confirmation.value.trim().toUpperCase() !== t(words.eraseWord); });
        danger.replaceChildren(h('p', '', h('strong', '', t(words.confirm2))),
          h('label', 'work-field', h('span', '', t(words.erase)), confirmation), h('div', 'dialog-actions', no, erase));
        confirmation.focus();
      }, 'warning')));
    cancel.focus();
  };
  function reset() {
    const start = button(words.clearAll, extraIcons.trash, clearStart, 'warning');
    danger.replaceChildren(start);
    start.focus();
  }

  const used = await storageLine();
  const content = h('div', 'teacher-panel',
    h('p', 'privacy-note', art(extraIcons.adult), h('span', '', t(words.privacy))),
    section(words.interface, level, language),
    section(words.pin, h('p', '', t(words.pinHelp)), h('label', 'work-field', h('span', '', t(words.pin)), pin), pinButton, remove, pinStatus),
    section(words.options, h('div', 'teacher-grid', ...toggles), keyboardLayoutField(app)),
    section(words.tools, h('div', 'teacher-grid', ...toolToggles)),
    section(words.className, h('label', 'work-field', h('span', '', t(words.classHint)), className)),
    section(words.data, used, persistStatus, h('div', 'dialog-actions start', persistButton, exportButton), exportStatus, downloads, danger));
  className.setAttribute('aria-label', t(words.className));
  const close = app.modal({ title: words.title, content });
  content.closest('dialog')?.classList.add('dialog-wide');
  danger.append(button(words.clearAll, extraIcons.trash, clearStart, 'warning'));
  await updatePersist();
}

async function clearEverything(app: App) {
  await app.clearData();
  clearPreferences();
  location.reload();
}

export default {
  id: 'teacher',
  mount(app) {
    app.registerScreen('teacher.gate', gate);
    app.registerScreen('teacher.panel', panel);
  },
} satisfies Feature;
