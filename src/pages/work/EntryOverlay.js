import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import NoteContent from '../../components/content/NoteContent';
import { createEntryTransition } from './entryTransition';
import './EntryOverlay.css';

function ExpandedEntry({ route, closing, origin, onExited }) {
  const dialog = useRef(null);
  const heading = useRef(null);
  const viewport = useRef(null);
  const back = useRef(null);
  const motion = useRef(null);
  const { category, subcategory, entry } = route;
  const close = () => { window.location.hash = `/${category.id}/${subcategory.id}`; };

  useLayoutEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    const previousTitle = document.title;
    const clicked = origin.current?.element;
    const source = clicked?.isConnected && clicked.dataset.entryId === entry.id ? clicked : document.querySelector(`[data-entry-id="${entry.id}"]`);
    document.body.style.overflow = 'hidden';
    document.title = `${entry.title} | Andre Matthiessen`;
    element.showModal();
    element.focus({ preventScroll: true });
    motion.current = createEntryTransition({ dialog: element, heading: heading.current, viewport: viewport.current, back: back.current, source, origin, onExited });
    return () => {
      motion.current.destroy();
      element.close();
      document.body.style.overflow = previousOverflow;
      document.title = previousTitle;
    };
  }, [entry.id, entry.title, origin, onExited]);

  useEffect(() => { motion.current?.setOpen(!closing); }, [closing]);

  return <dialog ref={dialog} className="entry-overlay" tabIndex={-1} aria-labelledby="expanded-entry-title"
    onCancel={event => { event.preventDefault(); close(); }}>
    <div className="entry-pane-surface" aria-hidden="true" />
    <h2 ref={heading} id="expanded-entry-title" className="expanded-entry-title">{entry.title}</h2>
    <button ref={back} className="entry-return" onClick={close} aria-label="Close entry"><span aria-hidden="true">&larr;</span> Back</button>
    <div ref={viewport} className="entry-scroll">
      <article className="entry-content"><NoteContent body={entry.body} /></article>
    </div>
  </dialog>;
}

export default function EntryOverlay({ route, origin }) {
  const [shown, setShown] = useState(route.entry ? route : null);
  useEffect(() => { if (route.entry) setShown(route); }, [route]);
  const onExited = useRef(() => setShown(null)).current;
  return shown ? <ExpandedEntry key={shown.entry.id} route={shown} closing={!route.entry} origin={origin} onExited={onExited} /> : null;
}
