import { stamps } from '../../core/registry';
import type { StoredStamp } from '../../core/storage';
import { forgetStampImage } from '../../core/tooling/stamp-art';
import { registerMovePanel } from '../../stamps/ui/move-panel';
import type { Feature } from '../../ui/app';
import { personal, stampPanel } from './panel';

export default {
  id: 'mystamps',
  mount(app) {
    const registered = new Map<string, { stamp: StoredStamp; unregister: () => void; removing: boolean }>();
    let nextNumber = 1;
    const register = (stamp: StoredStamp) => {
      if (registered.has(stamp.id)) return;
      nextNumber = Math.max(nextNumber, stamp.number + 1);
      const src = URL.createObjectURL(stamp.picture);
      const remove = stamps.add({
        id: stamp.id, src, category: personal,
        label: { pt: `Carimbo ${stamp.number}`, en: `Stamp ${stamp.number}` },
      });
      registered.set(stamp.id, { stamp, removing: false, unregister: () => {
        remove();
        forgetStampImage(src);
        URL.revokeObjectURL(src);
        registered.delete(stamp.id);
      } });
    };
    let load: Promise<void> | undefined;
    const ready = () => load ??= app.storage.listStamps().then(items => {
      for (const stamp of items.sort((a, b) => a.number - b.number)) register(stamp);
      app.refresh();
    }).catch(error => {
      load = undefined;
      throw error;
    });
    app.run(ready);

    app.registerOptions('stamp', stampPanel(id => {
      const entry = registered.get(id);
      if (!entry) return;
      app.run(async () => {
        if (entry.removing) return;
        entry.removing = true;
        try {
          await app.storage.removeStamp(id);
        } finally {
          entry.removing = false;
        }
        entry.unregister();
        if (app.tool.id === 'stamp' && app.store.get().options.stamp?.stamp === id) {
          app.setOption('stamp', registered.values().next().value?.stamp.id ?? 'none');
        }
        app.refresh();
        app.notify({ pt: 'Carimbo apagado.', en: 'Stamp deleted.' }, {
          label: { pt: 'Anular', en: 'Undo' },
          run: () => app.run(async () => {
            await app.storage.saveStamp(entry.stamp);
            register(entry.stamp);
            app.refresh();
          }),
        });
      });
    }));
    registerMovePanel(app, picture => {
      const id = 'personal-' + crypto.randomUUID();
      let number: number | undefined;
      app.run(async () => {
        await ready();
        number ??= nextNumber++;
        const stamp = { id, picture, number };
        await app.storage.saveStamp(stamp);
        register(stamp);
        app.refresh();
        app.notify({ pt: 'Guardado em Os meus carimbos.', en: 'Saved in My stamps.' });
      });
    });
  },
} satisfies Feature;
