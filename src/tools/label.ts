import { clampToPage, hasTarget, layoutOf, movedLabel, typeHasTarget, variantOf, type LabelType } from '../core/labels';
import type { LabelObject, PaintPointer, Point, Tool, ToolContext } from '../core/types';
import { labelEditor } from '../features/labels/editor';
import { labelIcons } from '../features/labels/icons';
import { fontOption, labelSizes, sizeOption, typeOption } from '../features/labels/options';

type Drag =
  | { mode: 'move'; id: string; origin: LabelObject; start: Point; moved: boolean }
  | { mode: 'target'; id: string }
  | { mode: 'create'; start: Point; type: LabelType; moved: boolean };

let drag: Drag | undefined;
let lastTap: { id: string; t: number } | undefined;

/** Fingertip radius, in page pixels, for grabbing the arrow/tail handle (44 px across on screen). */
const grab = () => 24 * labelEditor.pageUnitsPerPixel;

function preview(from: Point, to: Point, c: ToolContext) {
  const ctx = c.overlay;
  c.clearOverlay();
  ctx.save();
  ctx.strokeStyle = '#23578d';
  ctx.fillStyle = '#23578d';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(from.x, from.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Legenda: text that stays editable. Tap to write, drag from the thing you want to point at to
 * where the text goes, drag a label to move it, drag its round handle to aim the arrow or tail.
 * The tool only handles gestures; typing, selection and actions live in `LabelEditor`.
 */
export default {
  id: 'label', label: { pt: 'Legenda', en: 'Label' }, icon: labelIcons.labelTool, order: 45, level: 1, usesColor: true,
  hint: {
    pt: 'Escolhe o tipo e toca na folha para escrever. Arrasta do alvo até ao texto para fazer uma seta.',
    en: 'Pick a kind and tap the paper to write. Drag from the target to the text to make an arrow.',
  },
  options: [typeOption, fontOption, sizeOption(labelSizes, 64)],
  onSelect(c) { labelEditor.activate(c); },
  onDeselect() { drag = undefined; labelEditor.deactivate(); },
  down(p, c) {
    const editor = labelEditor;
    editor.finish(true);
    const selected = editor.selected();
    if (selected?.target && hasTarget(variantOf(selected)) && Math.hypot(p.x - selected.target.x, p.y - selected.target.y) <= grab()) {
      drag = { mode: 'target', id: selected.id };
      return;
    }
    const hit = c.labels.at(p);
    if (hit) {
      editor.select(hit.id);
      drag = { mode: 'move', id: hit.id, origin: structuredClone(hit), start: p, moved: false };
      return;
    }
    // Empty paper: a tap starts a new label (and lets go of the selected one).
    editor.select(undefined);
    drag = { mode: 'create', start: p, type: c.opt<LabelType>('type'), moved: false };
  },
  move(p, _previous, c) {
    if (!drag) return;
    const reach = 8 * labelEditor.pageUnitsPerPixel;
    if (drag.mode === 'move') {
      const dx = p.x - drag.start.x;
      const dy = p.y - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) < reach) return;
      drag.moved = true;
      c.labels.update(drag.id, movedLabel(drag.origin, layoutOf(drag.origin), dx, dy));
    } else if (drag.mode === 'target') {
      c.labels.update(drag.id, { target: clampToPage(p) });
    } else if (typeHasTarget(drag.type)) {
      drag.moved = Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > reach * 2;
      if (drag.moved) preview(drag.start, p, c);
    }
  },
  up(p: PaintPointer, c) {
    const finished = drag;
    drag = undefined;
    c.clearOverlay();
    if (!finished) return;
    if (finished.mode === 'create') {
      // Start typing once this gesture is closed, so creating a label stays a single undo step.
      queueMicrotask(() => {
        if (finished.moved) labelEditor.startNew(finished.type, p, finished.start);
        else labelEditor.startNew(finished.type, finished.start);
      });
    } else if (finished.mode === 'move' && !finished.moved) {
      const quick = lastTap?.id === finished.id && p.t - lastTap.t < 500;
      lastTap = quick ? undefined : { id: finished.id, t: p.t };
      if (quick) queueMicrotask(() => labelEditor.startEdit(finished.id));
    }
  },
  cancel() { drag = undefined; },
  key(event) {
    if ((event.key !== 'Delete' && event.key !== 'Backspace') || !labelEditor.selectedId || labelEditor.session) return false;
    labelEditor.remove(labelEditor.selectedId);
    return true;
  },
} satisfies Tool;
