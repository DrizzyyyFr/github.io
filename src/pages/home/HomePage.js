import { useEffect, useRef, useState } from 'react';
import { profile } from '../../config/profile';
import PortfolioBrowser from '../../components/browser/PortfolioBrowser';
import EntryOverlay from '../work/EntryOverlay';
import OceanScene from './OceanScene';
import { sceneAt } from './sceneTimeline';
import './HomePage.css';

// The introduction's pose on the scene's scroll timeline, and how long a fresh visit takes to glide there.
const INTRODUCTION = 1 / 3;
const GLIDE_MS = 4000;

export default function HomePage({ route }) {
  const scene = useRef(null);
  const origin = useRef(null);
  const oceanState = useRef({ ...sceneAt(0), reducedMotion: false });
  const [visible, setVisible] = useState({ intro: false, menu: false, cue: true });

  useEffect(() => {
    const element = scene.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let target = 0;
    let progress = 0;
    let previousTime;

    const paint = () => {
      const state = sceneAt(progress);
      oceanState.current = { ...state, reducedMotion: reduced.matches };
      element.style.setProperty('--progress', target);
      element.style.setProperty('--intro-opacity', state.introOpacity);
      element.style.setProperty('--intro-x', `${state.introOffset}vw`);
      element.style.setProperty('--work-progress', state.navigation);
      element.style.setProperty('--nav-opacity', state.navigation);
      element.style.setProperty('--cue-opacity', state.cueOpacity);
      const crestClearance = 4 * Math.sin(state.submerge * Math.PI);
      element.style.setProperty('--waterline', `${(1 - state.waterline) * 100 + crestClearance}%`);
      element.dataset.phase = progress < .17 ? 'sunrise' : progress < .56 ? 'about' : progress < .71 ? 'sunset' : 'underwater';
      const next = { intro: state.introOpacity > .01, menu: state.navigation > .94, cue: state.cueOpacity > .1 };
      setVisible(current => current.intro === next.intro && current.menu === next.menu && current.cue === next.cue ? current : next);
      element.dispatchEvent(new Event('ocean-frame'));
    };
    const tick = time => {
      const dt = previousTime === undefined ? 1 / 60 : Math.min((time - previousTime) / 1000, .05);
      previousTime = time;
      progress += (target - progress) * (1 - Math.exp(-dt * 18));
      if (Math.abs(target - progress) < .0001) progress = target;
      paint();
      if (progress !== target) frame = requestAnimationFrame(tick);
      else { frame = 0; previousTime = undefined; }
    };
    const measure = () => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      target = Math.max(0, Math.min(1, (window.scrollY - top) / Math.max(1, element.offsetHeight - window.innerHeight)));
      if (reduced.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
        previousTime = undefined;
        progress = target;
        paint();
      } else if (!frame) frame = requestAnimationFrame(tick);
    };
    const navigate = (initial = false) => {
      const hash = window.location.hash;
      let destination;
      if (hash === '#/' || !hash) destination = 0;
      else if (hash === '#about') destination = INTRODUCTION;
      else if (hash === '#work' || initial) destination = 1;
      if (destination !== undefined) {
        const top = element.getBoundingClientRect().top + window.scrollY;
        const travel = Math.max(0, element.offsetHeight - window.innerHeight);
        if (initial) { target = destination; progress = destination; paint(); }
        window.scrollTo({ top: top + travel * destination, behavior: initial || reduced.matches ? 'instant' : 'smooth' });
      }
      measure();
    };
    const hashChanged = () => navigate(false);
    navigate(true);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('hashchange', hashChanged);
    reduced.addEventListener?.('change', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      window.removeEventListener('hashchange', hashChanged);
      reduced.removeEventListener?.('change', measure);
    };
  }, []);

  // A fresh visit glides from sunrise down to the introduction over four seconds, easing in
  // and out. A link to a section or project keeps its own pose, and any wheel, touch, key,
  // press or navigation hands the page back to the visitor at once.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash !== '#/') return undefined;
    const element = scene.current;
    const introduction = () => element.getBoundingClientRect().top + window.scrollY
      + Math.max(0, element.offsetHeight - window.innerHeight) * INTRODUCTION;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ top: introduction(), behavior: 'instant' });
      return undefined;
    }
    const takeovers = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'hashchange'];
    let frame = 0;
    let start;
    let from;
    const stop = () => {
      cancelAnimationFrame(frame);
      takeovers.forEach(name => window.removeEventListener(name, stop));
    };
    const step = time => {
      if (start === undefined) { start = time; from = window.scrollY; }
      const t = Math.min(1, (time - start) / GLIDE_MS);
      const eased = t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      // The target is read every frame, so a resize or late layout still lands on the name.
      window.scrollTo({ top: from + (introduction() - from) * eased, behavior: 'instant' });
      if (t < 1) frame = requestAnimationFrame(step);
      else stop();
    };
    takeovers.forEach(name => window.addEventListener(name, stop, { passive: true }));
    frame = requestAnimationFrame(step);
    return stop;
  }, []);

  return <main id="main" className="home-page">
    <div ref={scene} className="scroll-scene">
      <span id="about" className="about-anchor" />
      <span id="work" className="work-anchor" />
      <div className="scene-sticky">
        <OceanScene stateRef={oceanState} />
        <section className="home-intro" aria-labelledby="intro-name" aria-hidden={!visible.intro} inert={!visible.intro ? true : undefined}>
          <p className="eyebrow intro-role">Animation &amp; Technical Animation</p>
          <h1 id="intro-name"><span className="intro-first">{profile.firstName}</span>{' '}<span className="intro-last">{profile.lastName}</span></h1>
          <div className="intro-biography">
            <p className="intro-welcome">Hey, welcome to my corner of the internet.</p>
            <p className="intro-summary">Where I share my animation work, technical systems,<br className="desktop-break" /> and the ideas behind them.</p>
          </div>
        </section>
        <a className="explore-cue" href="#about" aria-label="Scroll to introduction" aria-hidden={!visible.cue} tabIndex={visible.cue ? 0 : -1}><span className="explore-cue-arrow" aria-hidden="true">&darr;</span></a>
        <div className="navigation-depth"><section className="work-section" aria-labelledby="work-title" aria-hidden={!visible.menu} inert={!visible.menu ? true : undefined}>
          <div className="work-heading"><h2 id="work-title">Work<span>.</span></h2></div>
          <PortfolioBrowser categoryId={route.category?.id} subcategoryId={route.explicitSubcategoryId} entryId={route.entry?.id}
            onOpen={element => { origin.current = { element, rect: element?.getBoundingClientRect(), focus: document.activeElement }; }} />
        </section></div>
        <div className="scene-progress" aria-hidden="true"><span /></div>
      </div>
    </div>
    <EntryOverlay route={route} origin={origin} />
  </main>;
}
