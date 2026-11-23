/**
 * Garatuja — core contracts.
 *
 * Every tool, brush, magic effect, stamp pack and starter is a plug-in that
 * implements one of the interfaces below and lives in its own file. Registries
 * discover plug-ins with `import.meta.glob`, so adding a plug-in never requires
 * editing a shared file. Keep this file small and stable: propose changes in
 * docs/SPEC.md §"Alterações ao contrato" instead of silently diverging.
 */

/** Logical size of every page bitmap. The view scales it with CSS. */
export const CANVAS_W = 1600;
export const CANVAS_H = 1200;

/** User-visible text. Portuguese (pt-PT, AO90) is mandatory; English is the fallback locale. */
export interface L10n {
  pt: string;
  en: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A pointer sample already converted to page coordinates. */
export interface PaintPointer extends Point {
  /** 0..1. Mouse and touch without force report 0.5. */
  pressure: number;
  pointerType: 'mouse' | 'touch' | 'pen';
  /** ms, monotonic. */
  t: number;
  /** Constrain modifier (Shift) — straight lines, regular shapes. */
  constrain: boolean;
}

/** SVG markup with viewBox="0 0 48 48"; no scripts, no external references. */
export type IconSvg = string;

export type SoundId =
  | 'tap'
  | 'brush'
  | 'erase'
  | 'fill'
  | 'stamp'
  | 'shape'
  | 'line'
  | 'magic'
  | 'undo'
  | 'redo'
  | 'page'
  | 'save'
  | 'oops';

/* ------------------------------------------------------------------ */
/* Options shown in the side panel for the active tool                 */
/* ------------------------------------------------------------------ */

export interface ChoiceItem {
  value: string;
  label: L10n;
  hint?: L10n;
  icon?: IconSvg;
  /** Draw a live preview into a small canvas instead of a static icon. */
  preview?: (ctx: CanvasRenderingContext2D, w: number, h: number, color: string) => void;
  /** Category used to group long lists (stamps, magic). */
  group?: L10n;
  /** Omit or use 1 to include this choice in the simple interface. */
  level?: 1 | 2;
}

export type OptionSpec = {
  level?: 1 | 2;
  visible?: (option: (id: string) => string | number | boolean) => boolean;
} & (
  | { kind: 'choice'; id: string; label: L10n; items: ChoiceItem[] | (() => ChoiceItem[]); default: string; shared?: string }
  | { kind: 'size'; id: string; label: L10n; steps: number[]; default: number }
  | { kind: 'toggle'; id: string; label: L10n; icon: IconSvg; default: boolean; fixed?: boolean }
);

/* ------------------------------------------------------------------ */
/* Vector objects that stay editable above the bitmap (labels)         */
/* ------------------------------------------------------------------ */

export interface LabelObject {
  id: string;
  kind: 'text' | 'callout' | 'balloon';
  /** Anchor of the text box, page coordinates. */
  x: number;
  y: number;
  text: string;
  font: string;
  size: number;
  color: string;
  /** callout: tip of the arrow/leader line. balloon: tip of the tail. */
  target?: Point;
  /** balloon shape. */
  shape?: 'speech' | 'thought' | 'shout' | 'box';
  /** callout number badge for numbered diagrams ("1", "2"…). */
  badge?: string;
}

export interface LabelStore {
  list(): readonly LabelObject[];
  add(label: LabelObject): void;
  update(id: string, patch: Partial<LabelObject>): void;
  remove(id: string): void;
  /** Hit-test in page coordinates; topmost first. */
  at(p: Point): LabelObject | undefined;
}

/* ------------------------------------------------------------------ */
/* Tool contract                                                       */
/* ------------------------------------------------------------------ */

/**
 * Everything a tool may touch. The page bitmap is OPAQUE: the paper colour or
 * starter background is baked in, and erasing means copying pixels back from
 * `paper`. Draw freely on `ctx`, report what you changed with `markDirty`, and
 * the engine turns the difference against `snapshot` into one undo step.
 */
export interface ToolContext {
  readonly width: number;
  readonly height: number;
  /** The page bitmap. */
  readonly ctx: CanvasRenderingContext2D;
  /** Transient previews (rubber bands, cursors). Never saved, never undone. */
  readonly overlay: CanvasRenderingContext2D;
  /** The pristine paper/background of this page (what the eraser restores). */
  readonly paper: HTMLCanvasElement;
  /** Read-only copy of the page as it was when the current gesture began. */
  readonly snapshot: HTMLCanvasElement;
  /** Starter foreground line-art drawn above the bitmap, if any (fill must respect it). */
  readonly foreground: HTMLCanvasElement | null;
  /** Current colour, `#rrggbb`. */
  readonly color: string;
  /** Current value of one of the tool's own options. */
  opt<T extends string | number | boolean>(id: string): T;
  markDirty(r: Rect): void;
  markAllDirty(): void;
  markSolidChange?(before: string, after: string): void;
  clearOverlay(): void;
  /**
   * Close the current undo step now. The engine calls this automatically on
   * pointer-up; tools with `manualCommit` (text, multi-click shapes) call it themselves.
   */
  commit(): void;
  /** Throw away everything drawn since the gesture began. */
  rollback(): void;
  /** Seeded per gesture, so strokes are reproducible in tests. */
  random(): number;
  sound(id: SoundId): void;
  /** Show a message in the helper line (and speak it when read-aloud is on). */
  say(text: L10n): void;
  readonly labels: LabelStore;
}

export interface Tool {
  id: string;
  label: L10n;
  /** One short sentence for the helper line: what the tool does, in child language. */
  hint: L10n;
  icon: IconSvg;
  /** Position in the toolbox. */
  order: number;
  /** 1 = shown in the simple interface too; 2 = only in the complete interface. */
  level: 1 | 2;
  usesColor: boolean;
  options?: OptionSpec[];
  manualCommit?: boolean;
  /** A tap tool ends on the first activation, including in fixed-click mode. */
  tapOnly?(c: ToolContext, p: Point): boolean;
  /** Settle state that outlives a pointer gesture before leaving the tool or taking a snapshot. */
  flushPending?(c: ToolContext): void;
  /** An editor can stay open outside a pointer gesture. Undo closes it before touching committed work. */
  hasPendingEdit?(): boolean;
  undoPendingEdit?(): { resume(): void; bytes: number } | undefined;
  optionHint?(option: (id: string) => string | number | boolean): L10n;
  onSelect?(c: ToolContext): void;
  onDeselect?(c: ToolContext): void;
  down(p: PaintPointer, c: ToolContext): void;
  /** `prev` is the previous sample of this gesture. Called once per coalesced sample. */
  move(p: PaintPointer, prev: PaintPointer, c: ToolContext): void;
  up(p: PaintPointer, c: ToolContext): void;
  /** Pointer moving without a button pressed — draw the cursor preview on the overlay. */
  hover?(p: PaintPointer, c: ToolContext): void;
  /** Refresh a preview that is waiting for another pointer gesture. */
  updatePending?(c: ToolContext): void;
  /** Gesture aborted (second finger or Escape). Default: rollback. */
  cancel?(c: ToolContext): void;
  /** Return true when the key was handled. */
  key?(e: KeyboardEvent, c: ToolContext): boolean;
}

/* ------------------------------------------------------------------ */
/* Brushes (used by Paint and Lines)                                   */
/* ------------------------------------------------------------------ */

export interface BrushDab {
  x: number;
  y: number;
  /** Direction of travel in radians. */
  angle: number;
  pressure: number;
  /** Diameter in page pixels chosen by the child. */
  size: number;
  color: string;
  /** Distance travelled since the stroke began, in page pixels. */
  travelled: number;
  /** Smoothed pointer speed in page pixels per millisecond. Absent for static previews. */
  speed?: number;
  random(): number;
}

export interface BrushDef {
  id: string;
  label: L10n;
  hint?: L10n;
  order: number;
  level: 1 | 2;
  /** Dab spacing as a fraction of size (0.1 = dense, 1 = dotted). */
  spacing: number;
  /** Maximum distance from the dab centre, as a multiple of size. Defaults to 1.5. */
  extent?: number;
  /** Paint one dab. The engine interpolates dabs along the stroke. */
  dab(ctx: CanvasRenderingContext2D, d: BrushDab): void;
  /** Fill a continuous segment when individual dabs would leave stepped edges. */
  segment?(ctx: CanvasRenderingContext2D, from: PaintPointer, to: PaintPointer, size: number, color: string): void;
  /** Optional: called when a stroke begins, to reset per-stroke state. */
  begin?(color: string, size: number): void;
}

/* ------------------------------------------------------------------ */
/* Magic effects                                                       */
/* ------------------------------------------------------------------ */

export type MagicCategory = 'pintar' | 'cor' | 'distorcer' | 'padroes' | 'pagina';

/**
 * A magic effect is a small tool hosted by the Magic tool. Implement `stroke`
 * for effects painted with the finger, `whole` for effects applied to the whole
 * page at once, or both. The thumbnail is generated by running the effect on a
 * sample picture, so no icon is needed.
 */
export interface MagicEffect {
  id: string;
  label: L10n;
  hint: L10n;
  category: MagicCategory;
  order: number;
  level: 1 | 2;
  usesColor: boolean;
  /** Called at pointer-down. */
  begin?(p: PaintPointer, c: ToolContext, size: number): void;
  /** Called for every segment of the gesture (from === to on the first sample). */
  stroke?(from: PaintPointer, to: PaintPointer, c: ToolContext, size: number): void;
  /** Called at pointer-up. */
  end?(p: PaintPointer, c: ToolContext, size: number): void;
  /** Apply to the whole page. */
  whole?(c: ToolContext): void;
}

/* ------------------------------------------------------------------ */
/* Stamps and starters                                                 */
/* ------------------------------------------------------------------ */

export interface StampDef {
  id: string;
  label: L10n;
  category: L10n;
  /** URL of an SVG or PNG bundled with the app, or a blob URL for the child's own stamps. */
  src: string;
  /** True when the stamp is a flat silhouette that takes the current colour. */
  tintable?: boolean;
  /** Attribution kept for the credits screen. */
  credit?: string;
}

export interface StarterDef {
  id: string;
  label: L10n;
  category: L10n;
  /** Paint the paper (opaque). */
  paper(ctx: CanvasRenderingContext2D, w: number, h: number): void;
  /** Optional line-art kept above the child's paint. */
  foreground?(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export interface WritingDraft extends Point {
  text: string;
  font: string;
  size: number;
  color: string;
}

/** One page = one picture. A story is several pages; an animation is several pages played fast. */
export interface PageRecord {
  id: string;
  /** PNG of the opaque bitmap. */
  bitmap: Blob;
  /** PNG of the paper, so the eraser keeps working after reload. */
  paper: Blob;
  foreground?: Blob;
  labels: LabelObject[];
  /** The child's text that this page illustrates. */
  text: string;
  thumb: Blob;
  writingDraft?: WritingDraft;
}

export interface ProjectRecord {
  id: string;
  title: string;
  author: string;
  /** "Para quem é?" — the real audience of the work (turma, jornal, correspondentes…). */
  audience: string;
  pages: PageRecord[];
  /** Frames per second when played as an animation. */
  fps: number;
  /** Comments from classmates: qualitative only, never scores. */
  comments: { id: string; kind: 'gostei' | 'pergunto' | 'sugiro'; text: string; from: string }[];
  createdAt: number;
  updatedAt: number;
}
