import { t } from '../../core/i18n';
import { untitled } from '../../ui/work-fields';

export function download(blob: Blob, title: string, extension: string) {
  const basename = title.trim().replace(/[<>:"/\\|?*\p{Cc}]/gu, '-').replace(/^[. ]+|[. ]+$/g, '').slice(0, 100);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${basename || t(untitled)}.${extension}`;
  link.href = url;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
