import './ui/style.css';
import { createPage, createProject } from './core/document';
import { setLocale, t } from './core/i18n';
import { Storage } from './core/storage';
import { readSettings } from './core/store';
import { Surface } from './core/surface';
import { App, type Feature } from './ui/app';
import { button, h } from './ui/dom';
import { icons } from './ui/icons';
import { mountShell } from './ui/shell';

declare global {
  interface Window {
    __garatuja?: {
      pixel(x: number, y: number): number[];
      app: App;
    };
  }
}

const root = document.getElementById('app');
if (!root) throw new Error('Missing application root');

async function start(target: HTMLElement) {
  const settings = readSettings();
  setLocale(settings.locale);
  const storage = await Storage.open();
  const recoveredCopy = await storage.recover();
  const recent = await storage.recent();
  const project = recent?.project ?? createProject(createPage());
  const page = project.pages.find(page => page.id === recent?.pageId) ?? project.pages[0];
  const surface = new Surface();
  await surface.load(page);
  const app = new App(surface, storage, project, page.id, settings, Boolean(recent));
  const features = Object.values(import.meta.glob<Feature>('./features/*/index.ts', { eager: true, import: 'default' }));
  for (const feature of features) feature.mount(app);
  mountShell(app, target);
  if (recoveredCopy) app.notify({
    pt: 'Recuperei as tuas alterações numa cópia do trabalho.',
    en: 'I recovered your changes in a copy of the work.',
  });
  if (import.meta.env.MODE === 'test') {
    window.__garatuja = { app, pixel: (x, y) => Array.from(surface.ctx.getImageData(x, y, 1, 1).data) };
  }
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    void navigator.serviceWorker.register('./sw.js').catch(error => console.error(error));
  }
}

void start(root).catch(error => {
  console.error(error);
  const text = { pt: 'Não consegui abrir o ateliê. Tenta abrir de novo.', en: 'I couldn’t open the studio. Try opening it again.' };
  root.replaceChildren(h('div', 'startup-error', h('p', '', t(text)),
    button({ pt: 'Tentar de novo', en: 'Try again' }, icons.open, () => location.reload())));
});
