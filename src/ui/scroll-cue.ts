import { h } from './dom';

type Axis = 'x' | 'y';

/**
 * Shows a fade with a small arrow on each side of a scrolling strip that still hides choices,
 * so a button cut by the edge always reads as «there is more». The cues are decorative siblings
 * of the strip, placed over its edges; the strip's parent must be positioned (the cues' containing block).
 */
export function scrollCue(scroller: HTMLElement, axis: Axis = 'x') {
  const marks = (['start', 'end'] as const).map(edge => {
    const mark = h('span', `scroll-more scroll-more-${axis} scroll-more-${edge}`);
    mark.setAttribute('aria-hidden', 'true');
    mark.hidden = true;
    return mark;
  });
  let frame = 0;
  const update = () => {
    frame = 0;
    if (!scroller.isConnected) {
      resize.disconnect();
      mutations.disconnect();
      removeEventListener('resize', schedule);
      for (const mark of marks) mark.remove();
      return;
    }
    if (marks[0].previousElementSibling !== scroller) scroller.after(...marks);
    const host = scroller.parentElement;
    const box = scroller.getBoundingClientRect();
    const visible = host instanceof HTMLElement && box.width > 0 && box.height > 0 && getComputedStyle(scroller)[axis === 'x' ? 'overflowX' : 'overflowY'] !== 'visible';
    const position = axis === 'x' ? scroller.scrollLeft : scroller.scrollTop;
    const room = axis === 'x' ? scroller.scrollWidth - scroller.clientWidth : scroller.scrollHeight - scroller.clientHeight;
    const more = [visible && position > 1, visible && position < room - 1];
    if (!visible) {
      for (const mark of marks) mark.hidden = true;
      return;
    }
    const outer = host.getBoundingClientRect();
    const left = box.left - outer.left - host.clientLeft;
    const top = box.top - outer.top - host.clientTop;
    marks.forEach((mark, i) => {
      mark.hidden = !more[i];
      if (!more[i]) return;
      const end = i === 1;
      if (axis === 'x') {
        mark.style.top = top + 'px';
        mark.style.height = scroller.clientHeight + 'px';
        mark.style.left = (end ? left + scroller.clientWidth - mark.offsetWidth : left) + 'px';
      } else {
        mark.style.left = left + 'px';
        mark.style.width = scroller.clientWidth + 'px';
        mark.style.top = (end ? top + scroller.clientHeight - mark.offsetHeight : top) + 'px';
      }
    });
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const resize = new ResizeObserver(schedule);
  const mutations = new MutationObserver(schedule);
  resize.observe(scroller);
  mutations.observe(scroller, { childList: true, subtree: true, characterData: true });
  scroller.addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  queueMicrotask(() => {
    if (scroller.parentElement) {
      scroller.after(...marks);
      resize.observe(scroller.parentElement);
    }
    schedule();
  });
  return schedule;
}

/** Scrolls a horizontal strip just enough that the chosen item is clear of the «more» cues. */
export function revealInStrip(scroller: HTMLElement, item: HTMLElement | null, cue = 48) {
  if (!item || scroller.scrollWidth <= scroller.clientWidth) return;
  const box = scroller.getBoundingClientRect();
  const rect = item.getBoundingClientRect();
  const left = scroller.scrollLeft > 1 ? cue : 0;
  if (rect.left < box.left + left) scroller.scrollLeft -= box.left + left - rect.left;
  else if (rect.right > box.right - cue) scroller.scrollLeft += Math.min(rect.right - (box.right - cue), rect.left - box.left - cue);
}
