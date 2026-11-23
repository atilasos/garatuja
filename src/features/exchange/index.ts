import { png, viewport } from '../../core/canvas';
import { t } from '../../core/i18n';
import type { App, Feature } from '../../ui/app';
import { button, h } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { pageIcons } from '../pages/icons';
import { maxPages } from '../pages/operations';
import { download } from './download';
import { deserializeWork, maxFileBytes, serializeWork } from './format';
import './exchange.css';

const label = { pt: 'Ficheiros', en: 'Files' };
const importLabel = { pt: 'Importar .garatuja', en: 'Import .garatuja' };
const exportLabel = { pt: 'Guardar .garatuja', en: 'Save .garatuja' };
const invalid = { pt: 'Não consegui abrir este ficheiro. Escolhe um trabalho .garatuja válido.', en: 'I couldn’t open this file. Choose a valid .garatuja work.' };
const tooLarge = { pt: 'Este ficheiro é demasiado grande para abrir aqui.', en: 'This file is too large to open here.' };

function exchange(app: App) {
  const input = h('input');
  input.type = 'file';
  input.accept = '.garatuja,application/json';
  input.hidden = true;
  const status = h('p', 'exchange-notice');
  status.setAttribute('role', 'status');
  status.hidden = true;
  const progress = h('progress');
  progress.hidden = true;
  progress.setAttribute('aria-label', t(exportLabel));
  let working = false;
  let closed = false;

  function notice(words: Parameters<typeof t>[0], warning: boolean) {
    status.hidden = false;
    status.textContent = t(words);
    status.classList.toggle('exchange-warning', warning);
  }

  function lock(value: boolean) {
    working = value;
    buttons.forEach(control => { control.disabled = value; });
  }

  async function importFile(file: File) {
    if (file.size > maxFileBytes) { notice(tooLarge, true); return; }
    lock(true);
    let project;
    try {
      notice({ pt: 'A abrir o trabalho…', en: 'Opening the work…' }, false);
      project = await deserializeWork(file, async blob => {
        if (closed) throw new Error('Import closed');
        const image = await createImageBitmap(blob);
        image.close();
      });
    } catch {
      if (!closed) notice(invalid, true);
      return;
    } finally {
      lock(false);
    }
    if (closed) return;
    lock(true);
    try {
      await app.documents.open(project);
      close();
    } catch (error) {
      console.error(error);
      notice({ pt: 'Não consegui guardar o trabalho neste dispositivo.', en: 'I couldn’t save the work on this device.' }, true);
    } finally {
      lock(false);
    }
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file && !working) app.run(() => importFile(file));
  });
  const importButton = button(importLabel, icons.open, () => input.click());
  const exportButton = button(exportLabel, pageIcons.download, () => app.run(async () => {
    lock(true);
    try {
      await app.documents.save();
      const { project } = app.store.get();
      if (closed) return;
      if (project.pages.length > maxPages) {
        notice({ pt: 'O ficheiro .garatuja pode guardar até 60 páginas.', en: 'A .garatuja file can hold up to 60 pages.' }, true);
        return;
      }
      notice({ pt: 'A preparar o trabalho…', en: 'Preparing the work…' }, false);
      progress.value = 0;
      progress.max = project.pages.length;
      progress.hidden = false;
      const file = await serializeWork(project, done => { progress.value = done; });
      if (closed) return;
      download(file, project.title, 'garatuja');
      status.hidden = true;
    } catch (error) {
      console.error(error);
      if (!closed) notice({ pt: 'Não consegui preparar o ficheiro. Verifica o tamanho do trabalho e tenta de novo.',
        en: 'I couldn’t prepare the file. Check the size of the work and try again.' }, true);
    } finally {
      lock(false);
      progress.hidden = true;
    }
  }));
  const downloadPage = button({ pt: 'Guardar página em PNG', en: 'Save page as PNG' }, pageIcons.download, () => app.run(() => {
    const canvas = viewport();
    app.surface.composite(canvas);
    download(png(canvas.canvas), app.store.get().project.title, 'png');
  }));
  const buttons = [importButton, exportButton, downloadPage];
  const close = app.modal({ title: label, content: h('div', 'dialog-stack', ...buttons, input, status, progress),
    onClose: () => { closed = true; } });
}

export default {
  id: 'exchange',
  mount(app) {
    app.registerScreen('exchange.files', exchange);
    app.registerAction({ id: 'exchange-files', label, icon: pageIcons.download, placement: 'files', order: 40,
      run: app => app.openScreen('exchange.files') });
  },
} satisfies Feature;
