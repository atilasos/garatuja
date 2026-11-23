import { createPage, createProject } from '../../core/document';
import { t } from '../../core/i18n';
import { starters } from '../../core/registry';
import type { App, Feature } from '../../ui/app';
import { button, h, roving } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { untitled } from '../../ui/work-fields';

const newTitle = { pt: 'Novo trabalho', en: 'New work' };
const openTitle = { pt: 'Abrir trabalho', en: 'Open work' };

function newWork(app: App) {
  const color = h('input', 'color-input');
  color.type = 'color';
  color.value = '#ffffff';
  const model = h('select');
  for (const starter of starters.all()) {
    const option = h('option', '', t(starter.label));
    option.value = starter.id;
    model.append(option);
  }
  model.value = 'plain';
  const create = button({ pt: 'Criar trabalho', en: 'Create work' }, icons.plus, () => app.run(async () => {
    create.disabled = true;
    try {
      const page = createPage(color.value, starters.get(model.value));
      await app.documents.open(createProject(page));
      close();
    } finally {
      create.disabled = false;
    }
  }), 'primary');
  const close = app.modal({
    title: newTitle, content: h('div', 'dialog-stack',
      h('label', 'work-field', h('span', '', t({ pt: 'Cor do papel', en: 'Paper color' })), color),
      h('label', 'work-field', h('span', '', t({ pt: 'Modelo', en: 'Template' })), model), create),
  });
}

async function openWork(app: App) {
  await app.documents.save();
  const projects = (await app.storage.list()).sort((a, b) => b.updatedAt - a.updatedAt);
  const gallery = h('div', 'gallery');
  const urls: string[] = [];
  const close = app.modal({ title: openTitle, content: gallery, onClose: () => urls.forEach(url => URL.revokeObjectURL(url)) });
  for (const project of projects) {
    const page = project.pages[0];
    if (!page) continue;
    const thumb = h('img');
    thumb.alt = '';
    thumb.src = URL.createObjectURL(page.thumb);
    urls.push(thumb.src);
    const item = h('button', 'gallery-item', thumb, h('strong', '', project.title || t(untitled)), h('span', '', project.author));
    item.type = 'button';
    item.addEventListener('click', () => app.run(async () => {
      await app.documents.open(project);
      close();
    }));
    gallery.append(item);
  }
  roving(gallery, openTitle);
}

export default {
  id: 'gallery',
  mount(app) {
    app.registerScreen('gallery.new', newWork);
    app.registerScreen('gallery.open', openWork);
    app.registerAction({ id: 'new', label: { pt: 'Novo', en: 'New' }, icon: icons.new,
      placement: 'files', order: 10, run: app => app.openScreen('gallery.new') });
    app.registerAction({ id: 'open', label: { pt: 'Abrir', en: 'Open' }, icon: icons.open,
      placement: 'files', order: 20, run: app => app.openScreen('gallery.open') });
    app.registerAction({
      id: 'save', label: { pt: 'Guardar', en: 'Save' }, icon: icons.save, placement: 'files', order: 30,
      async run(app) {
        await app.documents.save();
        app.say({ pt: 'O trabalho ficou guardado.', en: 'Your work is saved.' });
      },
    });
  },
} satisfies Feature;
