import type { Feature } from '../../ui/app';
import { presentLabel, showReader } from '../book/reader';
import { commentsPanel } from './comments';
import { presentationIcons } from './icons';

export default {
  id: 'presentation',
  mount(app) {
    app.registerScreen('presentation.show', app => showReader(app, () => commentsPanel(app)));
    app.registerAction({ id: 'present', hint: { pt: 'Mostra o trabalho à turma em ecrã inteiro.', en: 'Show your work to the class in full screen.' }, label: presentLabel, icon: presentationIcons.show, order: 15,
      run: app => app.openScreen('presentation.show') });
  },
} satisfies Feature;
