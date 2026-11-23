import { starters } from '../../core/registry';
import type { Feature } from '../../ui/app';
import { icons } from '../../ui/icons';
import './gallery.css';
import { newWork } from './new-work';
import { openWork } from './open';
import { paintStarter } from './papers';
import { saveWork } from './save';
import { Trash } from './trash';

declare global {
  interface Window {
    /** Test-only hooks for batch G (starters contact sheet). */
    __garatujaStarters?: { ids(): string[]; render(id: string, color: string, width: number, height: number): string };
  }
}

export default {
  id: 'gallery',
  mount(app) {
    const trash = new Trash(app.storage);
    app.registerScreen('gallery.new', newWork);
    app.registerScreen('gallery.open', app => openWork(app, trash));
    app.registerAction({ id: 'new', label: { pt: 'Novo', en: 'New' }, icon: icons.new,
      placement: 'files', order: 10, run: app => app.openScreen('gallery.new') });
    app.registerAction({ id: 'open', label: { pt: 'Abrir', en: 'Open' }, icon: icons.open,
      placement: 'files', order: 20, run: app => app.openScreen('gallery.open') });
    app.registerAction({ id: 'save', label: { pt: 'Guardar', en: 'Save' }, icon: icons.save,
      placement: 'files', order: 30, run: saveWork });
    window.addEventListener('keydown', event => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      if (app.store.get().busy || document.querySelector('dialog[open]')) return;
      const key = event.key.toLowerCase();
      if (key === 's') { event.preventDefault(); app.run(() => saveWork(app)); }
      if (key === 'o') { event.preventDefault(); app.openScreen('gallery.open'); }
    });
    if (import.meta.env.MODE === 'test') {
      window.__garatujaStarters = {
        ids: () => starters.all().map(starter => starter.id),
        render(id, color, width, height) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          const starter = starters.get(id);
          if (!ctx || !starter) throw new Error('Unknown starter ' + id);
          paintStarter(ctx, starter, color);
          return canvas.toDataURL('image/png');
        },
      };
    }
  },
} satisfies Feature;
