import { png, viewport } from '../../core/canvas';
import type { L10n } from '../../core/types';
import type { App, Feature } from '../../ui/app';
import { h } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { galleryActions, type GalleryContext } from '../gallery/actions';
import { pageIcons } from '../pages/icons';
import { download } from './download';
import { deserializeWorks, maxFileBytes, serializeWorks } from './format';

const importLabel = { pt: 'Importar .garatuja', en: 'Import .garatuja' };
const exportLabel = { pt: 'Guardar .garatuja', en: 'Save .garatuja' };
const invalid = { pt: 'Não consegui abrir este ficheiro. Escolhe um trabalho .garatuja válido.', en: 'I couldn’t open this file. Choose a valid .garatuja work.' };
const tooLarge = { pt: 'Este ficheiro é demasiado grande para abrir aqui.', en: 'This file is too large to open here.' };
const importing = { pt: 'A abrir o ficheiro…', en: 'Opening the file…' };
const preparing = { pt: 'A preparar o trabalho…', en: 'Preparing the work…' };
const exported = { pt: 'O ficheiro está pronto.', en: 'The file is ready.' };
const saveFailed = { pt: 'Não consegui guardar os trabalhos neste dispositivo.', en: 'I couldn’t save the works on this device.' };
const exportFailed = { pt: 'Não consegui preparar o ficheiro. Verifica o tamanho do trabalho e tenta de novo.',
  en: 'I couldn’t prepare the file. Check the size of the work and try again.' };

function chooseArchive(app: App, gallery: GalleryContext) {
  const allowed = () => gallery.isOpen() && app.store.get().settings.allowImport;
  if (!allowed()) return;
  const input = h('input');
  input.type = 'file';
  input.accept = '.garatuja,application/json';
  input.hidden = true;
  input.dataset.import = 'archive';
  input.addEventListener('cancel', () => input.remove());
  input.addEventListener('change', () => app.run(async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file || !allowed()) return;
    if (file.size > maxFileBytes) { gallery.notice(tooLarge, true); return; }
    gallery.notice(importing);
    let projects;
    try {
      projects = await deserializeWorks(file, async blob => {
        if (!allowed()) throw new Error('Import closed');
        const image = await createImageBitmap(blob);
        image.close();
      });
    } catch {
      if (allowed()) gallery.notice(invalid, true);
      return;
    }
    if (!allowed()) return;
    try {
      await app.storage.saveWorks(projects);
      if (!gallery.isOpen()) return;
      if (!await app.documents.open(projects[0], undefined, true)) { await gallery.refresh(); return; }
      gallery.close();
      const count = projects.length;
      const notice: L10n = count === 1 ? { pt: 'Importaste um trabalho.', en: 'You imported one work.' }
        : { pt: `Importaste ${count} trabalhos.`, en: `You imported ${count} works.` };
      app.confirm(notice);
    } catch (error) {
      console.error(error);
      if (gallery.isOpen()) gallery.notice(saveFailed, true);
    }
  }), { once: true });
  gallery.attach(input);
  input.click();
}

export default {
  id: 'exchange',
  mount() {
    galleryActions.add({
      id: 'import-archive', scope: 'gallery', label: importLabel, icon: icons.open,
      available: app => app.store.get().settings.allowImport, run: chooseArchive,
    });
    galleryActions.add({
      id: 'export-png', scope: 'gallery', label: { pt: 'Guardar página em PNG', en: 'Save page as PNG' }, icon: pageIcons.download,
      run(app) {
        app.input.flushPending();
        const canvas = viewport();
        app.surface.composite(canvas);
        download(png(canvas.canvas), app.store.get().project.title, 'png');
      },
    });
    galleryActions.add({
      id: 'export-archive', scope: 'project', label: exportLabel, icon: pageIcons.download,
      async run(app, gallery) {
        const entry = gallery.project;
        if (!entry) return;
        gallery.notice(preparing);
        try {
          const project = await app.documents.resolveProject(entry);
          const file = await serializeWorks([project]);
          if (!gallery.isOpen()) return;
          download(file, project.title, 'garatuja');
          gallery.notice(exported);
        } catch (error) {
          console.error(error);
          if (gallery.isOpen()) gallery.notice(exportFailed, true);
        }
      },
    });
  },
} satisfies Feature;
