import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import NoteContent from '../../components/content/NoteContent';
import { createEntryTransition } from './entryTransition';
import './EntryOverlay.css';

// One project in the expanded pane. A project of several pages shows them in a bar under its
// title; turning a page swaps only the note, so the pane stays open around it.
function ExpandedEntry({ route, closing, origin, onExited }) {
  const dialog = useRef(null);
  const heading = useRef(null);
  const pageBar = useRef(null);
  const viewport = useRef(null);
  const back = useRef(null);
  const motion = useRef(null);
  const { category, subcategory, project, entry } = route;
  const { pages } = project;
  const pageHref = page => `#/${category.id}/${subcategory.id}/${page.id}`;
  const next = pages[pages.findIndex(page => page.id === entry.id) + 1];
  const close = () => { window.location.hash = `/${category.id}/${subcategory.id}`; };

  useLayoutEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    const clicked = origin.current?.element;
    const source = clicked?.isConnected && clicked.dataset.projectId === project.id ? clicked : document.querySelector(`[data-project-id="${project.id}"]`);
    document.body.style.overflow = 'hidden';
    element.showModal();
    element.focus({ preventScroll: true });
    motion.current = createEntryTransition({ dialog: element, heading: heading.current, pages: pageBar.current, viewport: viewport.current, back: back.current, source, origin, onExited });
    return () => {
      motion.current.destroy();
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [project.id, origin, onExited]);

  useEffect(() => { motion.current?.setOpen(!closing); }, [closing]);

  // The tab names the page being read, and its project when the project has several.
  const title = pages.length > 1 ? `${entry.title} · ${project.title}` : project.title;
  useLayoutEffect(() => {
    const previous = document.title;
    document.title = `${title} | Andre Matthiessen`;
    return () => { document.title = previous; };
  }, [title]);

  // The current page's tab is centred in the bar when the pane opens, and glides there when a
  // page is turned. A turned page starts from its top, and focus that left with the old page,
  // such as on its Next link, moves to the new page's tab.
  const reading = useRef(entry.id);
  useLayoutEffect(() => {
    const turned = reading.current !== entry.id;
    reading.current = entry.id;
    const bar = pageBar.current;
    const tab = bar?.querySelector('[aria-current="page"]');
    if (tab) bar.scrollTo?.({ left: tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2, behavior: turned ? 'smooth' : 'auto' });
    if (!turned) return;
    viewport.current.scrollTop = 0;
    if (!dialog.current.contains(document.activeElement)) (tab || dialog.current).focus({ preventScroll: true });
  }, [entry.id]);

  return <dialog ref={dialog} className="entry-overlay" tabIndex={-1} aria-labelledby="expanded-entry-title"
    onCancel={event => { event.preventDefault(); close(); }}>
    <div className="entry-pane-surface" aria-hidden="true" />
    <h2 ref={heading} id="expanded-entry-title" className="expanded-entry-title">{project.title}</h2>
    <button ref={back} className="glass-button entry-return" onClick={close} aria-label="Close entry"><span className="glass-button-icon" aria-hidden="true">&larr;</span> Back</button>
    {pages.length > 1 && <nav ref={pageBar} className="entry-pages" aria-label={`${project.title} pages`}>
      {pages.map((page, index) => <a key={page.id} className="entry-page" href={pageHref(page)} aria-current={page.id === entry.id ? 'page' : undefined}>
        <span className="entry-page-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{page.title}
      </a>)}
    </nav>}
    <div ref={viewport} className="entry-scroll">
      <article key={entry.id} className="entry-content">
        <NoteContent body={entry.body} />
        {next && <a className="glass-button entry-next" href={pageHref(next)}>Next: {next.title} <span className="glass-button-icon" aria-hidden="true">&rarr;</span></a>}
      </article>
    </div>
  </dialog>;
}

export default function EntryOverlay({ route, origin }) {
  const [shown, setShown] = useState(route.entry ? route : null);
  useEffect(() => { if (route.entry) setShown(route); }, [route]);
  const onExited = useRef(() => setShown(null)).current;
  return shown ? <ExpandedEntry key={shown.project.id} route={shown} closing={!route.entry} origin={origin} onExited={onExited} /> : null;
}
