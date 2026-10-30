import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import portfolio from '../../content/portfolio.json';
import { projectPreview, youtubePreviewUrl } from './projectPreview';
import useMediaQuery from './useMediaQuery';
import './PortfolioBrowser.css';

// Every entry of a category in one list.
const projectsOf = category => category.subcategories.flatMap(subcategory => subcategory.entries.map(entry => ({
  category, subcategory, entry,
})));
const navigate = hash => { if (window.location.hash !== hash) window.location.hash = hash; };
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Changing category lets the old content leave before the new content unfolds from the left.
function Handover({ id, className, children }) {
  const [shown, setShown] = useState(id);
  const retained = useRef(children);
  const leaving = shown !== id;
  if (!leaving) retained.current = children;
  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => setShown(id), reducedMotion() ? 0 : 160);
    return () => clearTimeout(timer);
  }, [id, leaving]);
  return <div className={`work-handover ${className}${leaving ? ' is-leaving' : ''}`} inert={leaving ? true : undefined}>
    <div key={shown} className="work-arrival">{leaving ? retained.current : children}</div>
  </div>;
}

// Each preview reports its media's natural proportions once they are known, so the card can
// take the media's shape. They are remembered, so a revisited project opens at its shape.
const mediaRatios = new Map();
const MEDIA_RATIO = { fallback: 16 / 9, min: .6, max: 14 };

// Media reports its natural proportions as soon as it knows them, and that it is ready once
// it can actually be seen, so the card never fades in an empty or black frame.
function PreviewMedia({ media, onRatio, onReady }) {
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  // The YouTube player cannot report its video's size across origins; its videos are 16:9.
  const youtube = media.kind === 'youtube';
  useEffect(() => { if (youtube) onRatio(16 / 9); }, [youtube, onRatio]);
  // The preview is a silent backdrop: it takes no pointer or focus, so the card stays the control.
  if (youtube) return <iframe className="work-preview-youtube" src={youtubePreviewUrl(media.id, !still)} title="Project video preview"
    allow="autoplay; encrypted-media; picture-in-picture" tabIndex={-1} aria-hidden="true" onLoad={onReady} />;
  if (media.kind === 'video') return <video className="work-preview-video" src={media.src} muted loop playsInline autoPlay={!still}
    preload="auto" aria-hidden="true" tabIndex={-1} onCanPlay={onReady}
    onLoadedMetadata={event => onRatio(event.currentTarget.videoWidth / event.currentTarget.videoHeight)} />;
  return <img className="work-preview-image" src={media.src} alt={media.alt}
    onLoad={event => { onRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight); onReady(); }} />;
}

// Keeps outgoing values on screen while the incoming one arrives, so a swap crossfades
// instead of cutting. The current value comes last; older ones are marked leaving and
// dropped once their fade has had time to finish. While `hold` is set, the outgoing values
// stay fully shown, for an incoming one that cannot be seen yet.
const FADE_MS = 520;
function useCrossfade(key, value, hold = false) {
  const serial = useRef(1);
  const [items, setItems] = useState(() => [{ id: 1, key, value, leaving: false }]);
  useEffect(() => {
    setItems(previous => previous[previous.length - 1].key === key ? previous
      : [...previous.map(item => ({ ...item, leaving: true })), { id: ++serial.current, key, value, leaving: false }]);
    // A new value only ever arrives with a new key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (hold) return undefined;
    const timer = setTimeout(() => setItems(previous => previous.some(item => item.leaving) ? previous.filter(item => !item.leaving) : previous),
      reducedMotion() ? 0 : FADE_MS);
    return () => clearTimeout(timer);
  }, [key, hold]);
  return items;
}
// How long the card waits for new media that never reports ready before showing it anyway.
const READY_TIMEOUT_MS = 2500;

// True while active and for a moment after, so a closing element can animate away first.
function useLinger(active) {
  const [shown, setShown] = useState(active);
  useEffect(() => {
    if (active) { setShown(true); return undefined; }
    const timer = setTimeout(() => setShown(false), reducedMotion() ? 0 : FADE_MS);
    return () => clearTimeout(timer);
  }, [active]);
  return active || shown;
}

// One card that stays put while its project changes: the media and the title crossfade, the
// media area folds away for a project without any, and a reflection crosses the glass.
// Nothing loads until the panel is `active` on screen, and only the shown project's media.
function ProjectPreview({ project, active, onOpen }) {
  const card = useRef(null);
  const { category, subcategory, entry } = project;
  const media = projectPreview(entry);
  const src = media?.src;
  const [readySrc, setReadySrc] = useState(null);
  // Incoming media that cannot be seen yet keeps the outgoing media fully shown. Leaving the
  // screen unloads the media, so coming back waits for it again and fades it in.
  const waiting = Boolean(src) && active && readySrc !== src;
  useEffect(() => { if (!active) setReadySrc(null); }, [active]);
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setTimeout(() => setReadySrc(src), READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [waiting, src]);
  const layers = useCrossfade(entry.id, media, waiting);
  const labels = useCrossfade(entry.id, entry.title);
  // The media area follows the current media's proportions. Until new media reports its own,
  // the area keeps its present shape, then eases to the new one rather than jumping.
  const [ratio, setRatio] = useState(() => mediaRatios.get(src) || MEDIA_RATIO.fallback);
  useEffect(() => { if (mediaRatios.has(src)) setRatio(mediaRatios.get(src)); }, [src]);
  const measured = from => value => {
    if (!Number.isFinite(value) || value <= 0) return;
    const shape = Math.min(MEDIA_RATIO.max, Math.max(MEDIA_RATIO.min, value));
    mediaRatios.set(from, shape);
    if (from === src) setRatio(shape);
  };
  const open = () => {
    onOpen?.(card.current);
    navigate(`#/${category.id}/${subcategory.id}/${entry.id}`);
  };
  return <section ref={card} className="work-preview" data-entry-id={entry.id} aria-label={`${entry.title} preview`}>
    <span className="work-preview-surface" aria-hidden="true" />
    <span key={entry.id} className="work-preview-glint" aria-hidden="true" />
    <div className={`work-preview-stage${media ? '' : ' is-empty'}`} style={{ '--media-ratio': ratio }}>
      <div className={`work-preview-media${media?.kind === 'image' ? ' is-image' : ''}`}>
        {active && layers.filter(layer => layer.value).map(layer => {
          const state = layer.leaving ? (waiting ? '' : ' is-leaving') : (waiting ? ' is-waiting' : '');
          return <div key={layer.id} className={`work-preview-layer${state}`}>
            <PreviewMedia media={layer.value} onRatio={measured(layer.value.src)} onReady={() => setReadySrc(layer.value.src)} />
          </div>;
        })}
      </div>
    </div>
    <div className="work-preview-meta">
      <div className="work-preview-heading">
        {labels.map(label => <div key={label.id} className={`work-preview-label${label.leaving ? ' is-leaving' : ''}`} aria-hidden={label.leaving || undefined}>
          <h3 className="work-preview-title" data-morph-title={label.leaving ? undefined : true}>{label.value}</h3>
        </div>)}
      </div>
      <button type="button" className="glass-button work-open" onClick={open}>View <span className="glass-button-icon" aria-hidden="true">&rarr;</span></button>
    </div>
  </section>;
}

// The glass of a row or of the tab highlight: a rim that catches the sun, a resting and a lit
// pane, the sun's light and shade, a highlight that follows the mouse, and a reflection that
// sweeps across on selection. Every layer carries its own clip-path, and selection only fades
// and moves layers, so the browser can run it without restyling the row on every frame.
const Glass = () => <span className="work-glass" aria-hidden="true">
  <span className="work-glass-rim" /><span className="work-glass-pane" /><span className="work-glass-lit" />
  <span className="work-glass-light" /><span className="work-glass-pointer" /><span className="work-glass-glint" />
</span>;

// A mouse over the glass carries a small sun highlight with it. It writes the pointer
// position straight onto the row, so following it costs no render.
const followPointer = event => {
  if (event.pointerType !== 'mouse') return;
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - box.left}px`);
  event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - box.top}px`);
};

// One project as a glass row. Selecting it grows the row, lights its glass and sweeps a
// reflection across it; its text only scales, so nothing re-wraps while it moves.
function ProjectRow({ project, index, current, stacked, active, onPreview, onOpen }) {
  const inline = useLinger(current);
  return <li className={`work-project${current ? ' is-selected' : ''}`}>
    <button type="button" className="work-row" aria-pressed={current} onClick={() => onPreview(project)} onPointerMove={followPointer}>
      <Glass />
      <span className="work-row-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      <span className="work-row-text">
        <span className="work-row-title">{project.entry.title}</span>
      </span>
    </button>
    {/* On phones the preview opens under its row, and folds away again when another is chosen. */}
    {stacked && inline && <div className={`work-inline${current ? '' : ' is-closing'}`} inert={current ? undefined : true}>
      <div className="work-inline-body"><ProjectPreview project={project} active={active} onOpen={onOpen} /></div>
    </div>}
  </li>;
}

// The selected tab's glass glides to a newly chosen tab instead of jumping. It measures
// through its own parent, because the tab list's ref is not attached yet when a child's
// layout effect first runs, and only starts gliding after it has been placed once.
function TabGlass({ selectedIndex }) {
  const anchor = useRef(null);
  const [place, setPlace] = useState(null);
  const [placed, setPlaced] = useState(false);
  useLayoutEffect(() => {
    const list = anchor.current?.parentElement;
    if (!list) return undefined;
    const measure = () => {
      const tab = list.querySelectorAll('[role="tab"]')[selectedIndex];
      if (tab) setPlace(previous => previous && previous.x === tab.offsetLeft && previous.y === tab.offsetTop && previous.width === tab.offsetWidth && previous.height === tab.offsetHeight
        ? previous : { x: tab.offsetLeft, y: tab.offsetTop, width: tab.offsetWidth, height: tab.offsetHeight });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [selectedIndex]);
  useEffect(() => {
    if (!place || placed) return undefined;
    const frame = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(frame);
  }, [place, placed]);
  return <span ref={anchor} className={`work-tab-glass${placed ? ' is-placed' : ''}`} aria-hidden="true"
    style={place ? { transform: `translate(${place.x}px, ${place.y}px)`, width: place.width, height: place.height } : { display: 'none' }}>
    <Glass />
  </span>;
}

// Flags the list while rows remain beyond either end, so an edge fades only when there is
// more to scroll that way, and a row scrolled past the top dissolves instead of being cut.
function useMoreBelow(list, key) {
  useEffect(() => {
    const element = list.current;
    if (!element) return undefined;
    const update = () => {
      element.toggleAttribute('data-more', element.scrollTop + element.clientHeight < element.scrollHeight - 2);
      element.toggleAttribute('data-above', element.scrollTop > 2);
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    return () => { element.removeEventListener('scroll', update); observer?.disconnect(); };
  }, [list, key]);
}

// `active` is whether the panel is on screen; preview media only loads while it is.
export default function PortfolioBrowser({ categoryId, subcategoryId, entryId, onOpen, active = true }) {
  const list = useRef(null);
  const stacked = useMediaQuery('(max-width: 850px) and (orientation: portrait)');
  const categories = portfolio.categories;
  const category = categories.find(item => item.id === categoryId) || categories[0];
  const projects = projectsOf(category);
  const [previewed, setPreviewed] = useState({});
  const routed = projects.find(project => project.entry.id === entryId);
  const routedId = routed?.entry.id;
  useEffect(() => {
    if (routedId) setPreviewed(previous => previous[category.id] === routedId ? previous : { ...previous, [category.id]: routedId });
  }, [routedId, category.id]);
  const selected = routed
    || projects.find(project => project.entry.id === previewed[category.id])
    || projects.find(project => project.subcategory.id === subcategoryId)
    || projects[0];
  useMoreBelow(list, `${category.id}/${stacked}/${selected.entry.id}`);

  // A stacked row opens downwards, so once it has opened, bring all of it into the list's view.
  // Only the list scrolls: moving the page would move the ocean scene.
  const chosen = useRef(false);
  useEffect(() => {
    if (!stacked || !chosen.current) return undefined;
    chosen.current = false;
    const timer = setTimeout(() => {
      const box = list.current;
      const item = box?.querySelector('.work-project.is-selected');
      if (!item) return;
      const view = box.getBoundingClientRect();
      const rect = item.getBoundingClientRect();
      const offset = rect.top < view.top ? rect.top - view.top - 8 : rect.bottom > view.bottom ? Math.min(rect.bottom - view.bottom + 12, rect.top - view.top - 8) : 0;
      if (offset) box.scrollBy?.({ top: offset, behavior: 'smooth' });
    }, reducedMotion() ? 0 : FADE_MS + 40);
    return () => clearTimeout(timer);
  }, [stacked, selected.entry.id]);

  const preview = project => {
    if (project.entry.id === selected.entry.id) return;
    chosen.current = true;
    setPreviewed(previous => ({ ...previous, [category.id]: project.entry.id }));
  };
  const chooseCategory = index => navigate(`#/${categories[index].id}`);
  const tabKeys = event => {
    const index = categories.indexOf(category);
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: categories.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const wrapped = (next + categories.length) % categories.length;
    chooseCategory(wrapped);
    event.currentTarget.querySelectorAll('[role="tab"]')[wrapped]?.focus();
  };
  const rowKeys = event => {
    const rows = [...list.current.querySelectorAll('.work-row')];
    const index = rows.indexOf(document.activeElement);
    const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: rows.length - 1 }[event.key];
    if (index < 0 || next === undefined) return;
    event.preventDefault();
    const target = Math.max(0, Math.min(rows.length - 1, next));
    preview(projects[target]);
    rows[target].focus();
  };

  return <div className={`portfolio-browser${stacked ? ' is-stacked' : ''}`}>
    <div className="work-index">
      <div className="work-tabs" role="tablist" aria-label="Work categories" onKeyDown={tabKeys}>
        <TabGlass selectedIndex={categories.indexOf(category)} />
        {categories.map((item, index) => <button key={item.id} type="button" role="tab" id={`work-tab-${item.id}`} className="work-tab"
          aria-selected={item === category} aria-controls="work-projects" tabIndex={item === category ? 0 : -1}
          onClick={() => chooseCategory(index)}>{item.label}</button>)}
      </div>
      <div ref={list} id="work-projects" className="work-projects" role="tabpanel" aria-labelledby={`work-tab-${category.id}`}>
        <Handover id={category.id} className="work-list-handover">
          <ul className="work-project-list" onKeyDown={rowKeys}>
            {projects.map((project, index) => <ProjectRow key={project.entry.id} project={project} index={index} current={project === selected}
              stacked={stacked} active={active} onPreview={preview} onOpen={onOpen} />)}
          </ul>
        </Handover>
      </div>
    </div>
    {!stacked && <Handover id={category.id} className="work-preview-handover">
      <ProjectPreview project={selected} active={active} onOpen={onOpen} />
    </Handover>}
  </div>;
}
