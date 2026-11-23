import { loadFonts } from '../../fonts/load';
import type { Feature } from '../../ui/app';
import { bitmapText } from './bitmap-text';
import { labelEditor } from './editor';
import './labels.css';

/**
 * Writing on the sheet: the Texto and Legenda tools share a text field, the four fonts and
 * the label renderer. This feature wires them to the app; the tools live in `src/tools`.
 */
export default {
  id: 'labels',
  mount(app) {
    labelEditor.attach(app);
    if (labelEditor.layer) bitmapText.attach(app, labelEditor.layer);
    const restore = () => {
      const draft = app.documents.page.writingDraft;
      if (!draft) return;
      app.chooseTool('text');
      if (app.tool.id === 'text') bitmapText.resume(draft);
    };
    queueMicrotask(restore);
    app.store.subscribe((state, previous) => {
      labelEditor.onState(state, previous);
      bitmapText.onState(state, previous);
      if (state.pageId !== previous.pageId || state.toolId === 'text' && previous.toolId !== 'text') {
        queueMicrotask(() => { if (app.tool.id === 'text' || state.pageId !== previous.pageId) restore(); });
      }
    });
    // Canvas text falls back silently while a font loads: repaint and rebuild the option previews once ready.
    void loadFonts().then(() => {
      labelEditor.repaint();
      app.refresh();
    });
  },
} satisfies Feature;
