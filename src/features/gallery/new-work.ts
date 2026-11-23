import { createPage, createProject } from '../../core/document';
import { t } from '../../core/i18n';
import { starters } from '../../core/registry';
import type { L10n } from '../../core/types';
import type { App } from '../../ui/app';
import { art, button, h, pressed, roving } from '../../ui/dom';
import { icons } from '../../ui/icons';
import { groupStarters, paintStarter, paperColors } from './papers';

const words = {
  title: { pt: 'Novo trabalho', en: 'New work' },
  kept: {
    pt: 'O trabalho que está na folha fica guardado na galeria.',
    en: 'The work on the paper stays saved in the gallery.',
  },
  paper: { pt: 'Cor do papel', en: 'Paper color' },
  model: { pt: 'Modelo', en: 'Template' },
  create: { pt: 'Começar', en: 'Start' },
  done: {
    pt: 'Tens uma folha nova.',
    en: 'Here is a new sheet.',
  },
} satisfies Record<string, L10n>;

let lastColor = '#ffffff';
let lastStarter = 'plain';

export function newWork(app: App) {
  const hadWork = app.documents.hasWork;
  const all = starters.all();
  let color = lastColor;
  let chosen = all.some(starter => starter.id === lastStarter) ? lastStarter : 'plain';
  const thumbs: [HTMLCanvasElement, string][] = [];
  const scale = Math.min(2, window.devicePixelRatio || 1);

  const swatches = paperColors.map(item => {
    const control = button(item.label, undefined, () => {
      color = item.color;
      for (const [other, value] of swatchControls) pressed(other, value === color);
      paintThumbs();
    }, 'paper-swatch');
    control.prepend(h('span', 'paper-chip'));
    control.style.setProperty('--paper', item.color);
    control.dataset.focus = item.color;
    pressed(control, item.color === color);
    return [control, item.color] as const;
  });
  const swatchControls = swatches;
  const colorRow = h('div', 'paper-colors', ...swatches.map(([control]) => control));

  const modelControls: [HTMLButtonElement, string][] = [];
  const groups = groupStarters(all).map(group => {
    const row = h('div', 'model-grid', ...group.starters.map(starter => {
      const canvas = h('canvas', 'model-thumb');
      canvas.width = Math.round(176 * scale);
      canvas.height = Math.round(132 * scale);
      canvas.setAttribute('aria-hidden', 'true');
      thumbs.push([canvas, starter.id]);
      const control = button(starter.label, undefined, () => {
        chosen = starter.id;
        for (const [other, id] of modelControls) pressed(other, id === chosen);
      }, 'model-choice');
      control.prepend(canvas);
      control.dataset.starter = starter.id;
      pressed(control, starter.id === chosen);
      modelControls.push([control, starter.id]);
      return control;
    }));
    roving(row, group.label);
    return h('section', 'model-group', h('h4', 'choice-group', t(group.label)), row);
  });

  function paintThumbs() {
    for (const [canvas, id] of thumbs) {
      const starter = starters.get(id);
      const ctx = canvas.getContext('2d');
      if (starter && ctx) paintStarter(ctx, starter, color);
    }
  }

  const create = button(words.create, icons.new, () => app.run(async () => {
    create.disabled = true;
    try {
      lastColor = color;
      lastStarter = chosen;
      const page = createPage(color, starters.get(chosen));
      if (!await app.documents.open(createProject(page))) return;
      close();
      app.say(hadWork && !app.documents.recoveryProjects.length ? {
        pt: 'Guardei o trabalho anterior na galeria. Tens uma folha nova!',
        en: 'I saved your previous work in the gallery. Here is a new sheet!',
      } : words.done);
    } finally {
      create.disabled = false;
    }
  }), 'primary big-action');
  create.dataset.focus = 'create';

  const recovery = app.saveRecovery();
  const content = h('div', 'new-work', recovery,
    hadWork && !app.documents.hasUnsavedChanges ? h('p', 'pingo-note', art(icons.pingo), h('span', '', t(words.kept))) : null,
    h('section', 'new-step', h('h3', 'step-title', t(words.paper)), colorRow),
    h('section', 'new-step', h('h3', 'step-title', t(words.model)), ...groups),
    h('div', 'dialog-actions sticky-actions', create));
  roving(colorRow, words.paper);
  const close = app.modal({ title: words.title, content, onClose: () => app.removeSaveRecovery(recovery) });
  content.closest('dialog')?.classList.add('dialog-wide');
  paintThumbs();
  modelControls.find(([, id]) => id === chosen)?.[0].scrollIntoView({ block: 'nearest' });
}
