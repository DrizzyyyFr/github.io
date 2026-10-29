import { useEffect, useRef, useState } from 'react';
import portfolio from '../../content/portfolio.json';
import WheelPicker from './WheelPicker';
import useMediaQuery from './useMediaQuery';
import './PortfolioBrowser.css';

function Branch({ branchKey, children }) {
  const [visible, setVisible] = useState(branchKey);
  const retained = useRef(children);
  const changing = visible !== branchKey;
  if (!changing) retained.current = children;
  useEffect(() => {
    if (!changing) return;
    const timer = setTimeout(() => setVisible(branchKey), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160);
    return () => clearTimeout(timer);
  }, [branchKey, changing]);
  return <div className={`browser-branch${changing ? ' is-leaving' : ''}`} inert={changing || !branchKey ? true : undefined}>
    <div key={visible} className="branch-arrival">{changing ? retained.current : children}</div>
  </div>;
}

export default function PortfolioBrowser({ categoryId, subcategoryId, entryId, onOpen }) {
  const root = useRef(null);
  const mobile = useMediaQuery('(max-width: 850px)');
  const categories = portfolio.categories;
  const categoryIndex = Math.max(0, categories.findIndex(item => item.id === categoryId));
  const category = categories[categoryIndex];
  const subcategoryIndex = Math.max(0, category.subcategories.findIndex(item => item.id === subcategoryId));
  const subcategory = category.subcategories[subcategoryIndex];
  const [entrySelections, setEntrySelections] = useState({});
  const [mobileStep, setMobileStep] = useState(subcategoryId ? 2 : categoryId ? 1 : 0);
  const familyKey = `${category.id}/${subcategory.id}`;
  useEffect(() => {
    if (!entryId) return;
    const index = subcategory.entries.findIndex(entry => entry.id === entryId);
    if (index >= 0) setEntrySelections(previous => previous[familyKey] === index ? previous : { ...previous, [familyKey]: index });
  }, [entryId, familyKey, subcategory.entries]);
  const entryIndex = Math.min(entrySelections[familyKey] || 0, subcategory.entries.length - 1);
  const hasCategory = Boolean(categoryId);
  const hasTopic = hasCategory && Boolean(subcategoryId);
  const stage = Math.min(mobileStep, hasTopic ? 2 : hasCategory ? 1 : 0);
  useEffect(() => {
    if (!mobile) return;
    const timer = setTimeout(() => root.current?.querySelectorAll('.browser-column')[stage]?.querySelector('[role="listbox"]')?.focus({ preventScroll: true }), 750);
    return () => clearTimeout(timer);
  }, [mobile, stage]);
  const navigate = hash => { if (window.location.hash !== hash) window.location.hash = hash; };
  const selectCategory = index => {
    if (categories[index].id !== categoryId) navigate(`#/${categories[index].id}`);
  };
  const selectSubcategory = index => navigate(`#/${category.id}/${category.subcategories[index].id}`);
  const openEntry = (index, element) => {
    onOpen?.(element);
    navigate(`#/${category.id}/${subcategory.id}/${subcategory.entries[index].id}`);
  };

  return <div ref={root} className={`portfolio-browser${hasCategory ? ' has-category' : ''}${hasTopic ? ' has-topic' : ''}`}>
    <nav className="browser-trail" aria-label="Browse levels">
      <button onClick={() => setMobileStep(0)} aria-current={stage === 0 ? 'step' : undefined}>01 <span>{hasCategory ? category.label : 'Category'}</span></button>
      <span aria-hidden="true">&rarr;</span>
      <button onClick={() => setMobileStep(1)} disabled={!hasCategory} aria-current={stage === 1 ? 'step' : undefined}>02 <span>{hasTopic ? subcategory.label : 'Topic'}</span></button>
      <span aria-hidden="true">&rarr;</span>
      <button onClick={() => setMobileStep(2)} disabled={!hasTopic} aria-current={stage === 2 ? 'step' : undefined}>03 <span>Entry</span></button>
    </nav>
    <div className="browser-window">
      <div className="browser-columns" style={{ '--mobile-step': stage }}>
        <div className="browser-column" inert={mobile && stage !== 0 ? true : undefined}>
          <WheelPicker label="Category" items={categories} selectedIndex={categoryIndex} onChange={selectCategory} onActivate={() => setMobileStep(1)} />
        </div>
        <div className="browser-column branch-column" inert={mobile && stage !== 1 ? true : undefined}>
          <span className={`branch-connection${hasCategory ? ' is-connected' : ''}`} aria-hidden="true" />
          <Branch branchKey={categoryId || ''}>
            {hasCategory && <WheelPicker label="Subcategory" variant="subcategory" items={category.subcategories} selectedIndex={subcategoryIndex} onChange={selectSubcategory} onActivate={() => setMobileStep(2)} />}
          </Branch>
        </div>
        <div className="browser-column branch-column" inert={mobile && stage !== 2 ? true : undefined}>
          <span className={`branch-connection${hasTopic ? ' is-connected' : ''}`} aria-hidden="true" />
          <Branch branchKey={hasTopic ? familyKey : ''}>
            {hasTopic && <WheelPicker label="Entry" variant="entry" items={subcategory.entries} selectedIndex={entryIndex}
              onChange={index => setEntrySelections(previous => ({ ...previous, [familyKey]: index }))} onActivate={openEntry} />}
          </Branch>
        </div>
      </div>
    </div>
  </div>;
}
