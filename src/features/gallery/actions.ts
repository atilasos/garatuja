/**
 * Extension point for the gallery ("Abrir"). Other features (for example the
 * `.garatuja` export/import) register buttons here instead of editing the
 * gallery itself:
 *
 *   import { galleryActions } from '../gallery/actions';
 *   galleryActions.add({ id: 'export-file', scope: 'project', label, icon,
 *     run: (app, { project }) => exportProject(project) });
 *
 * `scope: 'gallery'` puts the button in the gallery toolbar (next to "Importar
 * imagem"); `scope: 'project'` puts it on every work card.
 */
import { Registry } from '../../core/registry';
import type { IconSvg, L10n, ProjectRecord } from '../../core/types';
import type { App } from '../../ui/app';

export interface GalleryContext {
  /** The work on that card (only for `scope: 'project'`). */
  project?: ProjectRecord;
  /** Re-read the list of works from storage and redraw the gallery. */
  refresh(): Promise<void>;
  /** Local feedback remains visible inside the dialog. */
  notice(message: L10n, warning?: boolean): void;
  /** Attach a file picker for the lifetime of this gallery. */
  attach(input: HTMLInputElement): void;
  isOpen(): boolean;
  /** Close the gallery dialog. */
  close(): void;
}

export interface GalleryAction {
  id: string;
  label: L10n;
  icon: IconSvg;
  scope: 'gallery' | 'project';
  order?: number;
  /** Hide the action when this returns false (e.g. a teacher setting). */
  available?(app: App): boolean;
  run(app: App, context: GalleryContext): void | Promise<void>;
}

export const galleryActions = new Registry<GalleryAction>([], (a, b) => (a.order ?? 50) - (b.order ?? 50) || a.id.localeCompare(b.id));
