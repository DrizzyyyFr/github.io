import React, { useEffect, useRef, useState } from 'react';
import { solveIK, springStep, footPosition } from './motion';
import './App.css';

const GITHUB = 'https://github.com/DrizzyyyFr';
const studies = [
  { id: 'ik', number: '01', title: 'Following a target.', name: 'Inverse kinematics', category: 'RIGGING', description: 'Two bones, one target. Explore how an analytical IK solver finds a pose within reach.', tags: ['Two-bone solver', 'Interactive target'] },
  { id: 'spring', number: '02', title: 'A little follow-through.', name: 'Spring dynamics', category: 'SECONDARY MOTION', description: 'Give a point some weight. Tune frequency and damping to go from loose overshoot to a controlled settle.', tags: ['Damped spring', 'Motion trails'] },
  { id: 'gait', number: '03', title: 'One step at a time.', name: 'Procedural locomotion', category: 'PROCEDURAL ANIMATION', description: 'Build a walk from a phase, a foot trajectory, and IK. Change the stride and watch the pose respond.', tags: ['Gait cycle', 'Foot placement'] },
];
const defaults = { upper: 140, lower: 115, bend: 1, frequency: 1.6, damping: 0.35, speed: 1, stride: 140, lift: 60 };
const origin = { x: 220, y: 225 };

function Arrow() { return <span aria-hidden="true">↗</span>; }
function Bone({ from, to, muted = false }) {
  const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length * 9, ny = dx / length * 9;
  const p = { x: from.x + dx * 0.23, y: from.y + dy * 0.23 };
  return <g className={muted ? 'bone muted-bone' : 'bone'}><polygon points={`${from.x},${from.y} ${p.x + nx},${p.y + ny} ${to.x},${to.y} ${p.x - nx},${p.y - ny}`} /><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} /><circle cx={from.x} cy={from.y} r="5" /><circle cx={to.x} cy={to.y} r="5" /></g>;
}
function Range({ label, value, min, max, step = 1, unit = '', onChange }) {
  return <label className="parameter"><span>{label}<output>{value}{unit}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}

function MotionLab({ mode, setMode }) {
  const [params, setParams] = useState(defaults);
  const [target, setTarget] = useState({ x: 418, y: 175 });
  const [running, setRunning] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [automatic, setAutomatic] = useState(false);
  const [guides, setGuides] = useState(true);
  const [frame, setFrame] = useState({ point: { x: 290, y: 255 }, trail: [], phase: 0 });
  const simulation = useRef({ x: 290, y: 255, vx: 0, vy: 0, time: 0, trail: [] });
  const viewport = useRef(null);
  const dragging = useRef(false);
  const active = useRef(true);
  const options = useRef({ params, target, running, automatic, mode });
  options.current = { params, target, running, automatic, mode };
  const reset = () => { setParams(defaults); setTarget({ x: 418, y: 175 }); setAutomatic(false); simulation.current = { x: 290, y: 255, vx: 0, vy: 0, time: 0, trail: [] }; setFrame({ point: { x: 290, y: 255 }, trail: [], phase: 0 }); };
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { active.current = entry.isIntersecting; });
    observer.observe(viewport.current);
    let request, previous;
    const animate = now => {
      const dt = previous === undefined ? 0 : Math.min((now - previous) / 1000, 0.04);
      previous = now;
      const o = options.current, s = simulation.current;
      if (o.running && active.current && !document.hidden) {
        s.time += dt * o.params.speed;
        let destination = o.target;
        if (o.automatic && o.mode !== 'gait') {
          destination = { x: 360 + Math.cos(s.time) * 115, y: 215 + Math.sin(s.time * 1.4) * 95 };
          setTarget(destination);
        }
        if (o.mode === 'spring') {
          Object.assign(s, springStep(s, destination, o.params.frequency, o.params.damping, dt));
          s.trail = [...s.trail.slice(-65), { x: s.x, y: s.y }];
        }
        setFrame({ point: { x: s.x, y: s.y }, trail: s.trail, phase: s.time });
      }
      request = requestAnimationFrame(animate);
    };
    request = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(request); observer.disconnect(); };
  }, []);
  const change = (key, value) => setParams(p => ({ ...p, [key]: value }));
  const moveTarget = event => {
    if (mode === 'gait') return;
    const rect = viewport.current.getBoundingClientRect();
    setTarget({ x: Math.max(25, Math.min(615, (event.clientX - rect.left) / rect.width * 640)), y: Math.max(30, Math.min(390, (event.clientY - rect.top) / rect.height * 420)) });
    setAutomatic(false);
  };
  const keyTarget = event => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction || mode === 'gait') return;
    event.preventDefault(); setAutomatic(false);
    setTarget(t => ({ x: Math.max(25, Math.min(615, t.x + direction[0] * (event.shiftKey ? 30 : 10))), y: Math.max(30, Math.min(390, t.y + direction[1] * (event.shiftKey ? 30 : 10))) }));
  };
  const chain = solveIK(origin, target, params.upper, params.lower, params.bend);
  const hip = { x: 320, y: 173 + Math.cos(frame.phase * Math.PI * 4) * 5 };
  const rearFoot = footPosition(frame.phase + 0.5, params.stride, params.lift);
  const frontFoot = footPosition(frame.phase, params.stride, params.lift);
  const rearLeg = solveIK(hip, rearFoot, 100, 100, 1);
  const frontLeg = solveIK(hip, frontFoot, 100, 100, 1);
  const note = mode === 'ik' ? 'Drag the target · arrow keys to nudge' : mode === 'spring' ? 'Click or drag to move the target' : 'Adjust stride, foot lift, and cycle speed';
  return <div className="lab" id="playground">
    <div className="lab-top"><span><i className={running ? 'status-dot' : 'status-dot paused'} /> LIVE PLAYGROUND</span><span className="viewport-label">2D / REALTIME</span></div>
    <div className="demo-tabs" aria-label="Select an experiment">{studies.map(s => <button key={s.id} aria-pressed={mode === s.id} onClick={() => setMode(s.id)}>{s.number}<span>{s.name}</span></button>)}</div>
    <div className="viewport-wrap">
      <svg ref={viewport} className={`viewport ${mode !== 'gait' ? 'draggable' : ''}`} viewBox="0 0 640 420" role="img" aria-label={`${studies.find(s => s.id === mode).name} visualization. ${note}.`} tabIndex={mode === 'gait' ? -1 : 0} onKeyDown={keyTarget} onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); moveTarget(e); }} onPointerMove={e => { if (dragging.current) moveTarget(e); }} onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
        <defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#ffffff" strokeOpacity=".055" /></pattern><radialGradient id="vignette"><stop offset="0" stopColor="#253b31" stopOpacity=".55" /><stop offset="1" stopColor="#131816" stopOpacity="0" /></radialGradient></defs>
        <rect width="640" height="420" fill="url(#grid)" /><rect width="640" height="420" fill="url(#vignette)" />
        <g className="axis"><path d="M34 356v30h30" /><text x="71" y="390">X</text><text x="29" y="346">Y</text></g>
        {mode === 'ik' && <>
          {guides && <g className="guides"><circle cx={origin.x} cy={origin.y} r={params.upper + params.lower} /><circle cx={origin.x} cy={origin.y} r={Math.abs(params.upper - params.lower)} /><line x1={origin.x} y1={origin.y} x2={target.x} y2={target.y} /><path d={`M${origin.x - 20} ${origin.y}h40 M${origin.x} ${origin.y - 20}v40`} /></g>}
          <g className="ghost"><Bone from={origin} to={{ x: origin.x + 108, y: origin.y - 91 }} muted /><Bone from={{ x: origin.x + 108, y: origin.y - 91 }} to={{ x: origin.x + 222, y: origin.y - 82 }} muted /></g>
          <Bone from={origin} to={chain.joint} /><Bone from={chain.joint} to={chain.end} />
          <g className="point-label"><text x={origin.x - 18} y={origin.y + 32}>ROOT</text><text x={chain.joint.x - 10} y={chain.joint.y - 20}>JOINT</text><text x={target.x + 20} y={target.y - 16}>TARGET</text></g>
          {!chain.reachable && <text className="reach-warning" x="320" y="378" textAnchor="middle">Target outside reach · chain clamped</text>}
        </>}
        {mode === 'spring' && <>
          {guides && <g className="guides"><line x1={frame.point.x} y1={frame.point.y} x2={target.x} y2={target.y} /></g>}
          <polyline className="trail" points={frame.trail.map(p => `${p.x},${p.y}`).join(' ')} />
          <circle className="spring-halo" cx={frame.point.x} cy={frame.point.y} r="28" /><circle className="spring-point" cx={frame.point.x} cy={frame.point.y} r="12" />
          <text className="point-label" x={frame.point.x + 22} y={frame.point.y + 34}>FOLLOWER</text>
        </>}
        {mode === 'gait' && <>
          <path className="ground" d="M100 340H540" />
          {guides && <g className="guides"><path d={`M${320 - params.stride / 2} 340 Q320 ${340 - params.lift * 2} ${320 + params.stride / 2} 340`} /><line x1="320" y1="100" x2="320" y2="340" /></g>}
          <Bone from={hip} to={rearLeg.joint} muted /><Bone from={rearLeg.joint} to={rearLeg.end} muted />
          <Bone from={hip} to={frontLeg.joint} /><Bone from={frontLeg.joint} to={frontLeg.end} />
          <Bone from={hip} to={{ x: hip.x + 6, y: hip.y - 60 }} /><circle className="head" cx={hip.x + 8} cy={hip.y - 82} r="18" />
          <path className="foot" d={`M${rearLeg.end.x - 10} ${rearLeg.end.y}h25 M${frontLeg.end.x - 10} ${frontLeg.end.y}h25`} />
          <text className="point-label" x="109" y="365">STANCE / SWING</text><text className="point-label" x="470" y="365">PHASE {(frame.phase % 1).toFixed(2)}</text>
        </>}
        {mode !== 'gait' && <g className="target"><circle cx={target.x} cy={target.y} r="12" /><circle cx={target.x} cy={target.y} r="3" /><path d={`M${target.x - 20} ${target.y}h10 M${target.x + 10} ${target.y}h10 M${target.x} ${target.y - 20}v10 M${target.x} ${target.y + 10}v10`} /></g>}
      </svg>
      <div className="viewport-note"><span className="mouse-icon" aria-hidden="true">⌁</span>{note}</div>
    </div>
    <div className="parameters">
      {mode === 'ik' ? <><Range label="Upper bone" value={params.upper} min={70} max={175} unit=" px" onChange={v => change('upper', v)} /><Range label="Lower bone" value={params.lower} min={70} max={175} unit=" px" onChange={v => change('lower', v)} /><button className="small-button bend" onClick={() => change('bend', -params.bend)}>Flip bend <span aria-hidden="true">⇄</span></button></> : mode === 'spring' ? <><Range label="Frequency" value={params.frequency} min={0.5} max={4} step={0.1} unit=" Hz" onChange={v => change('frequency', v)} /><Range label="Damping ratio" value={params.damping} min={0.05} max={1.5} step={0.05} onChange={v => change('damping', v)} /></> : <><Range label="Stride" value={params.stride} min={50} max={160} unit=" px" onChange={v => change('stride', v)} /><Range label="Foot lift" value={params.lift} min={15} max={90} unit=" px" onChange={v => change('lift', v)} /><Range label="Cycle speed" value={params.speed} min={0.25} max={2} step={0.05} unit=" Hz" onChange={v => change('speed', v)} /></>}
    </div>
    <div className="lab-footer"><div><button className="transport" aria-label={running ? 'Pause simulation' : 'Play simulation'} onClick={() => setRunning(!running)}>{running ? 'Ⅱ' : '▶'}</button><button className="reset" onClick={reset}>↺ <span>Reset</span></button></div><div className="toggles">{mode !== 'gait' && <label><input type="checkbox" checked={automatic} onChange={e => setAutomatic(e.target.checked)} />Auto target</label>}<label><input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)} />Guides</label></div></div>
  </div>;
}

function Miniature({ type }) {
  return <svg className="miniature" viewBox="0 0 400 200" aria-hidden="true"><defs><pattern id={`mini-grid-${type}`} width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="currentColor" strokeOpacity=".07" /></pattern></defs><rect width="400" height="200" fill={`url(#mini-grid-${type})`} />{type === 'ik' ? <><circle className="mini-guide" cx="125" cy="135" r="105" /><Bone from={{ x: 125, y: 135 }} to={{ x: 205, y: 65 }} /><Bone from={{ x: 205, y: 65 }} to={{ x: 290, y: 110 }} /><circle className="mini-target" cx="290" cy="110" r="12" /></> : type === 'spring' ? <><path className="mini-guide" d="M45 100H355" /><path className="wave" d="M45 135C70 135 70 35 95 35S120 145 145 145S170 67 195 67S220 123 245 123S270 88 295 88S320 105 355 100" /><circle className="mini-target" cx="355" cy="100" r="8" /></> : <><path className="mini-guide" d="M70 165H330 M150 165Q200 60 250 165" /><Bone from={{ x: 205, y: 65 }} to={{ x: 240, y: 110 }} /><Bone from={{ x: 240, y: 110 }} to={{ x: 260, y: 165 }} /><Bone from={{ x: 205, y: 65 }} to={{ x: 165, y: 105 }} muted /><Bone from={{ x: 165, y: 105 }} to={{ x: 140, y: 160 }} muted /><circle className="mini-target" cx="205" cy="45" r="14" /></>}</svg>;
}

function App() {
  const [mode, setMode] = useState(() => { const id = new URLSearchParams(window.location.search).get('demo'); return studies.some(s => s.id === id) ? id : 'ik'; });
  const selectMode = id => { setMode(id); const url = new URL(window.location.href); url.searchParams.set('demo', id); window.history.replaceState({}, '', url); };
  const openStudy = id => { selectMode(id); document.getElementById('playground').scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }); };
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header" id="top"><a className="brand" href="#top" aria-label="Andre Matthiessen home"><span className="brand-mark">am<span>·</span></span><span className="brand-name">ANDRE<br />MATTHIESSEN</span></a><nav aria-label="Main navigation"><a href="#experiments">Experiments</a><a href="#notes">Notes</a><a href="#about">About</a></nav><a className="github-link" href={GITHUB} target="_blank" rel="noreferrer">GitHub <Arrow /></a></header>
    <main id="main">
      <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><div className="eyebrow"><span className="tiny-cross">+</span> TECHNICAL ANIMATOR</div><h1 id="hero-title">A little code.<br />A lot of <em>life.</em></h1><p className="intro">I’m Andre Matthiessen. This is my space for exploring the systems behind the motion.</p><p className="hero-secondary">Rigging, procedural animation, and small ideas you can play with. Open an experiment. Move a target. See what makes it tick.</p><a className="primary-link" href="#experiments">Explore the experiments <span aria-hidden="true">↓</span></a><div className="hero-bottom"><span className="line-symbol" aria-hidden="true">↳</span><span>LESS BLACK BOX.<br />MORE HANDS ON.</span><span className="hero-index">PORTFOLIO / 001</span></div></div><MotionLab mode={mode} setMode={selectMode} /></section>
      <section className="experiments section" id="experiments" aria-labelledby="experiments-title"><div className="section-heading"><div><p className="eyebrow">01 / THE SANDBOX</p><h2 id="experiments-title">Ideas in motion<span className="accent">.</span></h2></div><p>Small, interactive studies.<br />A look under the hood of animation.</p></div><div className="study-grid">{studies.map(s => <article className={`study-card study-${s.id}`} key={s.id}><button className="study-visual" aria-label={`Open ${s.name} experiment`} onClick={() => openStudy(s.id)}><Miniature type={s.id} /><span className="study-number">EXPERIMENT / {s.number}</span><span className="open-icon"><Arrow /></span></button><div className="study-meta"><span>{s.category}</span><span className="live-tag"><i /> LIVE DEMO</span></div><h3><button onClick={() => openStudy(s.id)}>{s.title}</button></h3><p>{s.description}</p><div className="tags">{s.tags.map(t => <span key={t}>{t}</span>)}</div></article>)}</div><div className="study-disclaimer"><span>↳</span> Interactive studies in rigging, motion, and animation systems.</div></section>
      <section className="notes-section section" id="notes" aria-labelledby="notes-title"><div><p className="eyebrow">02 / FIELD NOTES</p><h2 id="notes-title">Behind the<br />movement.</h2><p className="section-intro">The idea, the moving parts,<br />and the useful constraints.</p><a href={`${GITHUB}/github.io`} className="text-link" target="_blank" rel="noreferrer">Explore the source <Arrow /></a></div><div className="notes-list"><details open><summary><span className="note-number">01</span><span>Solving a two-bone chain<small>GEOMETRY / INVERSE KINEMATICS</small></span><span className="expand-icon">+</span></summary><div className="note-body"><p>The root, joint, and target form a triangle. The law of cosines gives the joint angle; the target direction orients the chain. Flipping the bend selects the other solution.</p><p>The target is clamped between the chain’s minimum and maximum reach. Try moving it outside the dashed circle: the bones keep their lengths instead of stretching.</p><button className="text-link" onClick={() => openStudy('ik')}>Try the solver <Arrow /></button></div></details><details><summary><span className="note-number">02</span><span>Giving motion a little memory<small>DYNAMICS / DAMPED SPRINGS</small></span><span className="expand-icon">+</span></summary><div className="note-body"><p>A spring accelerates the follower toward a target, while damping removes energy. Frequency controls how quickly it responds. A damping ratio below 1 creates overshoot; around 1 it settles without oscillating.</p><p>This study uses small integration substeps to keep motion stable. Move the target or enable Auto target to compare loose and tightly controlled motion.</p><button className="text-link" onClick={() => openStudy('spring')}>Tune the spring <Arrow /></button></div></details><details><summary><span className="note-number">03</span><span>From a phase to a footstep<small>LOCOMOTION / PROCEDURAL GAITS</small></span><span className="expand-icon">+</span></summary><div className="note-body"><p>Each leg alternates between a grounded stance and a lifted swing. The two legs run half a cycle apart. The foot trajectory drives the same two-bone IK solver used in the first study.</p><p>This is an in-place gait sketch on a flat ground plane. It explores timing and trajectories, rather than a full character controller or terrain adaptation.</p><button className="text-link" onClick={() => openStudy('gait')}>Explore the gait <Arrow /></button></div></details></div></section>
      <section className="about-section section" id="about" aria-labelledby="about-title"><div className="eyebrow">03 / THE PERSON BEHIND THE RIG</div><div className="about-content"><h2 id="about-title">Technical thinking.<br /><span>Animated results.</span></h2><div><p>I’m Andre, a technical animator interested in the space where animation and code meet.</p><p>This portfolio is a growing collection of hands-on experiments and their breakdowns. A place to make technical ideas visible, understandable, and a little more playful.</p><a className="text-link" href={GITHUB} target="_blank" rel="noreferrer">Find me on GitHub <Arrow /></a></div></div></section>
    </main><footer className="site-footer"><span>© {new Date().getFullYear()} Andre Matthiessen</span><span>BUILT TO BE PLAYED WITH.</span><a href="#top">Back to top ↑</a></footer>
  </>;
}

export default App;
