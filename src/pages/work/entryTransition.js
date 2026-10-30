export const DURATION = 720;
// The expanded pane is a plain rectangle, as six points so a source's outline can blend into it
// point by point (tokens.css --shard-outline). A source without an outline uses the same.
export const FRAME = [[0, 0], [0, 0], [1, 0], [1, 0], [1, 1], [0, 1]];
export const SHARD = FRAME;
export const ease = (progress, start, end) => {
  const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
export function transitionAt(progress, source, destination, points = SHARD) {
  const morph = ease(progress, .12, .84);
  return {
    morph,
    reveal: ease(progress, .77, 1),
    retreat: ease(progress, 0, .52),
    rect: Object.fromEntries(['left', 'top', 'width', 'height'].map(key => [key, lerp(source[key], destination[key], morph)])),
    clip: `polygon(${points.map((point, i) => `${lerp(point[0], FRAME[i][0], morph) * 100}% ${lerp(point[1], FRAME[i][1], morph) * 100}%`).join(', ')})`,
  };
}

export function targetRect() {
  const width = window.innerWidth <= 850 ? window.innerWidth - 20 : Math.min(window.innerWidth * .925, window.innerWidth > 2300 ? 1800 : 1500);
  const height = window.innerWidth <= 850 ? window.innerHeight - 24 : window.innerHeight * .878;
  return { left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2, width, height };
}

function outline(source) {
  const raw = source && getComputedStyle(source).getPropertyValue('--shard-outline');
  const matches = raw?.match(/[-.\d]+%\s+[-.\d]+%/g);
  return matches?.length === 6 ? matches.map(pair => pair.split(/\s+/).map(value => parseFloat(value) / 100)) : SHARD;
}

// The elements that fade and slide away while an entry is open. Each reads --entry-retreat
// itself, so a frame restyles these few instead of everything under the page's root.
const RETREATING = '.site-header, .site-footer, .work-tabs, .work-heading';

export function createEntryTransition({ dialog, heading, viewport, back, source, origin, onExited }) {
  const retreating = [...document.querySelectorAll(RETREATING)];
  const siblings = [...document.querySelectorAll('.work-row')].filter(pane => pane !== source);
  // Writes a style only when its value changes: even an unchanged write costs a style pass.
  const written = new Map();
  const set = (element, property, value) => {
    if (!element) return;
    if (!written.has(element)) written.set(element, {});
    const text = String(value);
    if (written.get(element)[property] === text) return;
    written.get(element)[property] = text;
    if (property.startsWith('--')) element.style.setProperty(property, text);
    else element.style[property] = text;
  };
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let destination = targetRect();
  const fallback = { left: (window.innerWidth - 340) / 2, top: (window.innerHeight - 112) / 2, width: 340, height: 112 };
  let sourceRect = source && source !== origin.current?.element
    ? source.getBoundingClientRect()
    : origin.current?.rect || source?.getBoundingClientRect();
  if (!sourceRect?.width) sourceRect = fallback;
  const points = outline(source);
  const label = source?.querySelector('[data-morph-title]');
  const labelStyle = label && getComputedStyle(label);
  const sourceFont = parseFloat(labelStyle?.fontSize) || 20;
  const labelRect = label?.getBoundingClientRect();
  const labelScale = source?.offsetWidth ? sourceRect.width / source.offsetWidth : 1;
  const placed = Boolean(labelRect?.width);
  const sourceLeft = placed ? labelRect.left - sourceRect.left + (parseFloat(labelStyle.paddingLeft) || 0) * labelScale : sourceRect.width * .11;
  const sourceRight = placed ? sourceRect.left + sourceRect.width - labelRect.right + (parseFloat(labelStyle.paddingRight) || 0) * labelScale : sourceRect.width * .17;
  const sourceTop = labelRect?.height ? labelRect.top - sourceRect.top + (parseFloat(labelStyle?.paddingTop) || 0) * labelScale : Math.max(20, (sourceRect.height - 50) / 2);
  let progress = 0;
  let target = 1;
  let frame = 0;
  let previous;
  let disposed = false;

  const paint = () => {
    const { rect, clip, morph, reveal, retreat } = transitionAt(progress, sourceRect, destination, points);
    for (const key of ['left', 'top', 'width', 'height']) set(dialog, key, `${rect[key]}px`);
    set(dialog, 'clipPath', clip);
    set(dialog, '--pane-outline', clip);
    // The card hands over to the pane: its media fades out while the same glass fades in over it.
    const handoff = ease(progress, 0, .3);
    set(dialog, '--surface-opacity', handoff);
    set(source, 'opacity', 1 - handoff);
    retreating.forEach(element => set(element, '--entry-retreat', retreat));
    // Each row moves by its own transform, which restyles only that row.
    siblings.forEach((pane, index) => {
      const away = ease(progress, index * .022, .48 + index * .022);
      set(pane, 'transform', away ? `translateX(${away * -75}vw) scale(${1 - away * .12})` : '');
    });
    const inset = Math.min(70, Math.max(24, destination.width * .045));
    const font = Math.min(46, Math.max(26, destination.width * .033));
    const endTop = window.innerWidth <= 850 ? 66 : 32;
    const reserve = window.innerWidth <= 850 ? inset : 160;
    const startWidth = sourceRect.width - sourceLeft - sourceRight;
    set(heading, 'left', `${lerp(sourceLeft, inset, morph)}px`);
    set(heading, 'top', `${lerp(sourceTop, endTop, morph)}px`);
    set(heading, 'width', `${lerp(startWidth, destination.width - inset - reserve, morph)}px`);
    set(heading, 'fontSize', `${lerp(sourceFont * labelScale, font, morph)}px`);
    // The note is laid out once at the pane's final width, rather than re-flowing every frame as
    // the pane grows; it stays hidden until the reveal, so its own position is only read then.
    set(viewport, 'left', `${inset}px`);
    set(viewport, 'width', `${Math.max(0, destination.width - inset * 2)}px`);
    if (reveal > 0) {
      const bodyTop = endTop + heading.offsetHeight + 30;
      set(viewport, 'top', `${bodyTop}px`);
      set(viewport, 'height', `${Math.max(0, destination.height - bodyTop - inset) * reveal}px`);
    } else set(viewport, 'height', '0px');
    const hidden = reveal < 1;
    const returning = reveal > .8;
    set(viewport, 'overflowY', hidden ? 'hidden' : 'auto');
    if (viewport.inert !== hidden) viewport.inert = hidden;
    set(back, 'opacity', returning ? 1 : 0);
    set(back, 'pointerEvents', returning ? 'auto' : 'none');
    if (back.disabled === returning) back.disabled = !returning;
  };

  const finishClosing = () => {
    if (disposed) return;
    dialog.close();
    source?.classList.remove('is-entry-source');
    source?.style.removeProperty('opacity');
    const focus = source?.closest('[role="listbox"]') || origin.current?.focus;
    if (focus?.isConnected) focus.focus({ preventScroll: true });
    onExited();
  };
  const tick = time => {
    frame = 0;
    const dt = previous === undefined ? 1000 / 60 : Math.min(time - previous, 50);
    previous = time;
    progress = Math.max(0, Math.min(1, progress + (target ? 1 : -1) * dt / DURATION));
    paint();
    if (progress !== target) frame = requestAnimationFrame(tick);
    else {
      previous = undefined;
      if (target === 0) finishClosing();
    }
  };
  const wake = () => { if (!frame && !disposed) frame = requestAnimationFrame(tick); };
  const preferenceChanged = () => {
    if (!preference.matches) return;
    cancelAnimationFrame(frame);
    frame = 0;
    progress = target;
    paint();
    if (!target) finishClosing();
  };
  const resize = () => {
    destination = targetRect();
    const current = source?.getBoundingClientRect();
    if (current?.width) sourceRect = current;
    paint();
  };
  source?.classList.add('is-entry-source');
  paint();
  if (preference.matches) { progress = 1; paint(); } else wake();
  window.addEventListener('resize', resize);
  preference.addEventListener?.('change', preferenceChanged);

  return {
    setOpen(open) {
      target = open ? 1 : 0;
      if (!open && progress === 1) {
        const current = source?.getBoundingClientRect();
        if (current?.width) sourceRect = current;
      }
      if (preference.matches) preferenceChanged();
      else if (progress !== target) wake();
      else if (!target) finishClosing();
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      source?.classList.remove('is-entry-source');
      source?.style.removeProperty('opacity');
      siblings.forEach(pane => pane.style.removeProperty('transform'));
      retreating.forEach(element => element.style.removeProperty('--entry-retreat'));
      window.removeEventListener('resize', resize);
      preference.removeEventListener?.('change', preferenceChanged);
    },
  };
}
