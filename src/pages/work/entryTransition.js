export const DURATION = 720;
export const FRAME = [[0, .025], [.018, 0], [.975, 0], [1, .035], [.982, 1], [.01, .985]];
export const SHARD = [[0, .18], [.06, 0], [.94, .03], [1, .8], [.96, 1], [.02, .94]];
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

export function createEntryTransition({ dialog, heading, viewport, back, source, origin, onExited }) {
  const scene = document.querySelector('.scroll-scene');
  const layout = document.querySelector('.site-layout');
  const siblings = [...document.querySelectorAll('.glass-option')].filter(pane => pane !== source);
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let destination = targetRect();
  const fallback = { left: (window.innerWidth - 340) / 2, top: (window.innerHeight - 112) / 2, width: 340, height: 112 };
  let sourceRect = source && source !== origin.current?.element
    ? source.getBoundingClientRect()
    : origin.current?.rect || source?.getBoundingClientRect();
  if (!sourceRect?.width) sourceRect = fallback;
  const points = outline(source);
  const label = source?.querySelector('.shard-label');
  const labelStyle = label && getComputedStyle(label);
  const sourceFont = parseFloat(labelStyle?.fontSize) || 20;
  const labelRect = label?.getBoundingClientRect();
  const labelScale = source?.offsetWidth ? sourceRect.width / source.offsetWidth : 1;
  const sourceLeft = (parseFloat(labelStyle?.paddingLeft) || sourceRect.width * .11) * labelScale;
  const sourceRight = (parseFloat(labelStyle?.paddingRight) || sourceRect.width * .17) * labelScale;
  const sourceTop = labelRect?.height ? labelRect.top - sourceRect.top + (parseFloat(labelStyle?.paddingTop) || 0) * labelScale : Math.max(20, (sourceRect.height - 50) / 2);
  let progress = 0;
  let target = 1;
  let frame = 0;
  let previous;
  let disposed = false;

  const paint = () => {
    const { rect, clip, morph, reveal, retreat } = transitionAt(progress, sourceRect, destination, points);
    for (const key of ['left', 'top', 'width', 'height']) dialog.style[key] = `${rect[key]}px`;
    dialog.style.clipPath = clip;
    dialog.style.setProperty('--pane-outline', clip);
    dialog.style.setProperty('--content-reveal', reveal);
    scene?.style.setProperty('--entry-travel', progress);
    scene?.style.setProperty('--entry-retreat', retreat);
    scene?.style.setProperty('--entry-content-reveal', reveal);
    layout?.style.setProperty('--entry-retreat', retreat);
    siblings.forEach((pane, index) => pane.style.setProperty('--entry-pane-retreat', ease(progress, index * .022, .48 + index * .022)));
    const inset = Math.min(70, Math.max(24, destination.width * .045));
    const font = Math.min(46, Math.max(26, destination.width * .033));
    const endTop = window.innerWidth <= 850 ? 66 : 32;
    const reserve = window.innerWidth <= 850 ? inset : 160;
    const startWidth = sourceRect.width - sourceLeft - sourceRight;
    heading.style.left = `${lerp(sourceLeft, inset, morph)}px`;
    heading.style.top = `${lerp(sourceTop, endTop, morph)}px`;
    heading.style.width = `${lerp(startWidth, destination.width - inset - reserve, morph)}px`;
    heading.style.fontSize = `${lerp(sourceFont * labelScale, font, morph)}px`;
    const bodyTop = endTop + heading.offsetHeight + 30;
    viewport.style.left = `${inset}px`;
    viewport.style.right = `${inset}px`;
    viewport.style.top = `${bodyTop}px`;
    viewport.style.height = `${Math.max(0, destination.height - bodyTop - inset) * reveal}px`;
    viewport.style.overflowY = reveal === 1 ? 'auto' : 'hidden';
    viewport.inert = reveal < 1;
    back.style.opacity = reveal > .8 ? 1 : 0;
    back.style.pointerEvents = reveal > .8 ? 'auto' : 'none';
    back.disabled = reveal <= .8;
  };

  const finishClosing = () => {
    if (disposed) return;
    dialog.close();
    source?.classList.remove('is-entry-source');
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
      siblings.forEach(pane => pane.style.removeProperty('--entry-pane-retreat'));
      ['--entry-travel', '--entry-retreat', '--entry-content-reveal'].forEach(name => scene?.style.removeProperty(name));
      layout?.style.removeProperty('--entry-retreat');
      window.removeEventListener('resize', resize);
      preference.removeEventListener?.('change', preferenceChanged);
    },
  };
}
