import type { Feature } from '../../ui/app';
import { pageIcons } from '../pages/icons';
import { readLabel, showReader } from './reader';

export default {
  id: 'book',
  mount(app) {
    app.registerScreen('book.read', app => showReader(app));
    app.registerAction({ id: 'read', label: readLabel, icon: pageIcons.book, order: 10,
      run: app => app.openScreen('book.read') });
  },
} satisfies Feature;
