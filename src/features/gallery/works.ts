import { createPage, createProject } from '../../core/document';
import { CANVAS_H, CANVAS_W, type ProjectRecord, type StarterDef } from '../../core/types';

/** A copy with fresh ids, so both works can change independently. */
export function duplicateProject(project: ProjectRecord, now = Date.now()): ProjectRecord {
  return {
    ...structuredClone({ ...project, pages: [] }),
    id: crypto.randomUUID(),
    pages: project.pages.map(page => ({ ...page, id: crypto.randomUUID(), labels: structuredClone(page.labels) })),
    comments: structuredClone(project.comments),
    createdAt: now,
    updatedAt: now,
  };
}

/** Fit an image inside the page (letterboxed on the paper colour). */
export function fitRect(width: number, height: number, w = CANVAS_W, h = CANVAS_H) {
  const scale = Math.min(w / width, h / height);
  const fw = width * scale;
  const fh = height * scale;
  return { x: (w - fw) / 2, y: (h - fh) / 2, w: fw, h: fh };
}

/** A new work whose paper is the imported picture, so the eraser restores it. */
export function projectFromImage(image: ImageBitmap, color = '#ffffff') {
  const starter: StarterDef = {
    id: 'imported', label: { pt: 'Imagem', en: 'Picture' }, category: { pt: 'Importada', en: 'Imported' },
    paper(ctx, w, h) {
      const box = fitRect(image.width, image.height, w, h);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, box.x, box.y, box.w, box.h);
    },
  };
  return createProject(createPage(color, starter));
}
