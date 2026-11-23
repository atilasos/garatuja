import { t } from '../../core/i18n';
import moveTool, { editSelection, hasSelection, makeStamp, observeSelection, resizeSelectionPreview, shapeOption } from '../../tools/move';
import type { App } from '../../ui/app';
import { button, h, pressed, roving } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { stampIcons } from './icons';
import './move.css';

const actions = [
  { id: 'duplicate', label: { pt: 'Duplicar', en: 'Duplicate' }, icon: stampIcons.duplicate },
  { id: 'mirror', label: { pt: 'Espelhar', en: 'Mirror' }, icon: icons.mirror },
  { id: 'delete', label: { pt: 'Apagar recorte', en: 'Delete cutout' }, icon: stampIcons.delete },
  { id: 'drop', label: { pt: 'Pousar', en: 'Put down' }, icon: stampIcons.place },
] as const;

export function registerMovePanel(app: App, save: (picture: Blob) => void) {
  observeSelection(() => {
    if (app.tool.id !== moveTool.id) return;
    if (!hasSelection()) app.say(moveTool.hint);
    app.refresh();
  });
  new ResizeObserver(resizeSelectionPreview).observe(app.surface.element);
  app.registerOptions(moveTool.id, () => {
    const selected = hasSelection();
    const shapes = h('div', 'choice-grid move-shapes');
    for (const shape of shapeOption.items) {
      const item = button(shape.label, shape.icon, () => app.setOption(shapeOption.id, shape.value), 'choice');
      item.dataset.focus = 'selection:' + shape.value;
      item.disabled = selected;
      pressed(item, app.option(moveTool, shapeOption) === shape.value);
      shapes.append(item);
    }
    roving(shapes, shapeOption.label);
    const buttons = h('div', 'choice-grid move-actions');
    for (const action of actions) {
      const item = button(action.label, action.icon, () => editSelection(action.id), 'choice');
      item.dataset.focus = 'move:' + action.id;
      item.disabled = !selected;
      buttons.append(item);
    }
    roving(buttons, { pt: 'Ações do recorte', en: 'Cutout actions' });
    const create = button({ pt: 'Fazer carimbo', en: 'Make stamp' }, icons.stamp, () => {
      const picture = makeStamp();
      if (picture) save(picture);
      else app.notify({ pt: 'Este recorte só tem papel. Recorta uma parte do desenho.', en: 'This cutout only has paper. Cut out part of your drawing.' });
    });
    create.disabled = !selected;
    create.dataset.focus = 'move:stamp';
    return h('div', 'move-options', h('h3', 'option-title', t(shapeOption.label)), shapes, buttons, create);
  });
}
