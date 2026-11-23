import { png, viewport } from '../../core/canvas';
import { t } from '../../core/i18n';
import type { App } from '../../ui/app';
import { button, h, pressed } from '../../ui/dom';
import { icon, icons } from '../../ui/icons';
import { untitled } from '../../ui/work-fields';
import { pageIcons } from '../pages/icons';
import { coverDetails, hasCover } from './reader';
import { writingText } from './writing';
import './print.css';

export const printLabel = { pt: 'Imprimir', en: 'Print' };
type Orientation = 'portrait' | 'landscape';

export async function printWork(app: App) {
  if (!app.store.get().settings.allowPrint) return;
  const project = app.documents.snapshot();
  const { pageId, settings } = app.store.get();
  const current = project.pages.find(page => page.id === pageId) ?? project.pages[0];
  const preview = h('div', 'print-work-preview');
  preview.tabIndex = 0;
  preview.setAttribute('aria-label', t({ pt: 'Pré-visualização de impressão', en: 'Print preview' }));
  const loading = h('p', 'print-work-loading', t({ pt: 'A preparar as folhas…', en: 'Preparing the sheets…' }));
  loading.setAttribute('role', 'status');
  const urls = new Map<string, string>();
  const canvas = viewport();
  let closed = false;
  let reading = false;
  let book = false;
  let printOutput: HTMLElement | undefined;
  let orientation: Orientation = 'portrait';

  const pageMode = button({ pt: 'Página atual', en: 'Current page' }, icons.new, () => setBook(false));
  const bookMode = button({ pt: 'Livro inteiro', en: 'Whole book' }, pageIcons.book, () => setBook(true));
  const portrait = button({ pt: 'Ao alto', en: 'Portrait' }, icon('<rect x="13" y="5" width="22" height="38" rx="3" fill="#fff5db"/><path d="M18 15h12m-12 7h12m-12 7h8"/>'), () => setOrientation('portrait'));
  const landscape = button({ pt: 'Ao baixo', en: 'Landscape' }, icon('<rect x="5" y="13" width="38" height="22" rx="3" fill="#fff5db"/><path d="M12 21h24m-24 6h17"/>'), () => setOrientation('landscape'));
  const print = button(printLabel, icons.print, () => {
    if (!app.store.get().settings.allowPrint || reading) return;
    const output = h('article', `print-only print-work print-work-${orientation}`,
      ...[...preview.children].map(sheet => sheet.cloneNode(true)));
    printOutput?.remove();
    printOutput = output;
    document.body.append(output);
    const clear = () => output.remove();
    window.addEventListener('afterprint', clear, { once: true });
    try {
      window.print();
    } catch (error) {
      window.removeEventListener('afterprint', clear);
      clear();
      throw error;
    }
  }, 'primary');
  const modes = h('div', 'print-work-controls', pageMode, bookMode);
  const sizes = h('div', 'print-work-controls', portrait, landscape);
  const content = h('div', 'print-work-screen', h('div', 'print-work-options', modes, sizes, print), loading, preview);
  app.modal({ title: printLabel, content, onClose: () => {
    closed = true;
    printOutput?.remove();
    for (const url of urls.values()) URL.revokeObjectURL(url);
    urls.clear();
  } });
  content.closest('dialog')?.classList.add('print-work-dialog');

  function setBook(value: boolean) {
    if (reading || book === value) return;
    book = value;
    app.run(render);
  }
  function setOrientation(value: Orientation) {
    orientation = value;
    pressed(portrait, value === 'portrait');
    pressed(landscape, value === 'landscape');
    preview.dataset.orientation = value;
  }
  async function picture(page: typeof current) {
    let url = urls.get(page.id);
    if (!url) {
      await app.surface.compositePage(page, canvas);
      if (closed) return;
      url = URL.createObjectURL(png(canvas.canvas));
      urls.set(page.id, url);
    }
    const image = h('img');
    image.alt = '';
    image.src = url;
    await image.decode();
    return image;
  }
  async function render() {
    if (closed || reading) return;
    reading = true;
    print.disabled = pageMode.disabled = bookMode.disabled = true;
    loading.hidden = false;
    pressed(pageMode, !book);
    pressed(bookMode, book);
    preview.replaceChildren();
    preview.scrollTop = 0;
    try {
      if (book && hasCover(project)) {
        preview.append(h('section', 'print-work-sheet print-work-cover', coverDetails(project, settings.className)));
      }
      for (const page of book ? project.pages : [current]) {
        const image = await picture(page);
        if (closed) return;
        const details = [project.title || t(untitled), project.author].filter(Boolean).join(' · ');
        const copy = h('p', 'print-work-copy', writingText(page.text.trimEnd(), settings));
        if (book) {
          const lines = page.text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 50)), 0);
          copy.style.setProperty('--print-text-size', lines <= 8 ? '18pt' : lines <= 16 ? '17pt' : '16pt');
        }
        // The credit shares the paragraph's widow rule so the last line and
        // the credit stay together when Chromium fragments the text.
        if (page.text.trim()) copy.append(h('br'));
        copy.append(h('span', 'print-work-credit', details));
        preview.append(h('section', 'print-work-sheet', image, copy));
      }
      print.disabled = false;
    } finally {
      reading = false;
      pageMode.disabled = bookMode.disabled = false;
      loading.hidden = true;
    }
  }

  setOrientation(orientation);
  await render();
}
