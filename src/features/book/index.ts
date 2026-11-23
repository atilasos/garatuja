import type { Feature } from '../../ui/app';
import { pageIcons } from '../pages/icons';
import { readLabel, showReader } from './reader';

export default {
  id: 'book',
  mount(app) {
    app.registerScreen('book.read', app => showReader(app));
    app.registerAction({ id: 'read', hint: { pt: 'Lê as páginas e vê os desenhos como num livro.', en: 'Read the pages and see the drawings as a book.' }, label: readLabel, icon: pageIcons.book, order: 10,
      run: app => app.openScreen('book.read') });
  },
} satisfies Feature;
