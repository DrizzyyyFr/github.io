import { useEffect, useRef, useState } from 'react';
import portfolio from '../../content/portfolio.json';
import { projectPreview } from './projectPreview';
import useMediaQuery from './useMediaQuery';
import './PortfolioBrowser.css';

// Every entry of a category in one list; its topic becomes the row's path.
const projectsOf = category => category.subcategories.flatMap(subcategory => subcategory.entries.map(entry => ({
  category, subcategory, entry, path: `${category.label} / ${subcategory.label}`,
})));
const navigate = hash => { if (window.location.hash !== hash) window.location.hash = hash; };

function PreviewMedia({ media }) {
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  if (media.kind === 'video') return <video className="work-preview-video" src={media.src} muted loop playsInline autoPlay={!still}
    preload={still ? 'metadata' : 'auto'} aria-hidden="true" tabIndex={-1} />;
  return <img className="work-preview-image" src={media.src} alt={media.alt} />;
}

function ProjectPreview({ project, onOpen }) {
  const card = useRef(null);
  const { category, subcategory, entry, path } = project;
  const media = projectPreview(entry);
  const open = () => {
    onOpen?.(card.current);
    navigate(`#/${category.id}/${subcategory.id}/${entry.id}`);
  };
  return <section ref={card} className="work-preview" data-entry-id={entry.id} aria-label={`${entry.title} preview`}>
    <span className="work-preview-surface" aria-hidden="true" />
    {media && <div className="work-preview-media" key={entry.id}><PreviewMedia media={media} /></div>}
    <div className="work-preview-meta">
      <div className="work-preview-heading">
        <h3 className="work-preview-title" data-morph-title>{entry.title}</h3>
        <p className="work-preview-path">{path}</p>
      </div>
      <button type="button" className="work-open" onClick={open}>View project <span aria-hidden="true">&rarr;</span></button>
    </div>
  </section>;
}

// Flags the list while rows remain below its fold, so the edge fades only when there is more to scroll.
function useMoreBelow(list, key) {
  useEffect(() => {
    const element = list.current;
    if (!element) return undefined;
    const update = () => element.toggleAttribute('data-more', element.scrollTop + element.clientHeight < element.scrollHeight - 2);
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    return () => { element.removeEventListener('scroll', update); observer?.disconnect(); };
  }, [list, key]);
}

export default function PortfolioBrowser({ categoryId, subcategoryId, entryId, onOpen }) {
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

  // A stacked row opens downwards, so bring all of it into the list's view. Only the list
  // scrolls: moving the page would move the ocean scene.
  const chosen = useRef(false);
  useEffect(() => {
    if (!stacked || !chosen.current) return;
    chosen.current = false;
    const box = list.current;
    const item = box?.querySelector('.work-project.is-selected');
    if (!item) return;
    const view = box.getBoundingClientRect();
    const rect = item.getBoundingClientRect();
    const offset = rect.top < view.top ? rect.top - view.top - 8 : rect.bottom > view.bottom ? Math.min(rect.bottom - view.bottom + 12, rect.top - view.top - 8) : 0;
    if (offset) box.scrollBy?.({ top: offset, behavior: 'smooth' });
  }, [stacked, selected.entry.id]);

  const preview = project => {
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
        {categories.map((item, index) => <button key={item.id} type="button" role="tab" id={`work-tab-${item.id}`} className="work-tab"
          aria-selected={item === category} aria-controls="work-projects" tabIndex={item === category ? 0 : -1}
          onClick={() => chooseCategory(index)}>{item.label}</button>)}
      </div>
      <div ref={list} id="work-projects" className="work-projects" role="tabpanel" aria-labelledby={`work-tab-${category.id}`}>
        <ul key={category.id} className="work-project-list" onKeyDown={rowKeys}>
          {projects.map((project, index) => {
            const current = project === selected;
            return <li key={project.entry.id} className={`work-project${current ? ' is-selected' : ''}`}>
              <button type="button" className="work-row" aria-pressed={current} onClick={() => preview(project)}>
                <span className="work-row-surface" aria-hidden="true" />
                <span className="work-row-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span className="work-row-text">
                  <span className="work-row-title">{project.entry.title}</span>
                  <span className="work-row-path">{project.path}</span>
                </span>
              </button>
              {stacked && current && <ProjectPreview project={project} onOpen={onOpen} />}
            </li>;
          })}
        </ul>
      </div>
    </div>
    {!stacked && <ProjectPreview key={selected.entry.id} project={selected} onOpen={onOpen} />}
  </div>;
}
