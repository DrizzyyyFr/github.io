import { useEffect, useId, useRef } from 'react';
import useDepthPosition from './useDepthPosition';
import './WheelPicker.css';

export default function WheelPicker({ label, items, selectedIndex = 0, onChange, onActivate, variant = 'category' }) {
  const id = useId().replace(/:/g, '');
  const list = useRef(null);
  const touch = useRef(null);
  const gesture = useRef({ delta: 0, last: -Infinity, lastStep: -Infinity, direction: 0, magnitude: 0, stepped: false });
  const position = useDepthPosition(selectedIndex);
  const selected = Math.max(0, Math.min(items.length - 1, selectedIndex));
  const step = direction => onChange(Math.max(0, Math.min(items.length - 1, selected + direction)));
  const activate = (index, element) => {
    list.current.focus({ preventScroll: true });
    onChange(index);
    onActivate?.(index, element);
  };

  useEffect(() => {
    const element = list.current;
    const wheel = event => {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY || items.length < 2) return;
      const now = performance.now();
      const state = gesture.current;
      const direction = Math.sign(event.deltaY);
      const atEnd = selectedIndex + direction < 0 || selectedIndex + direction >= items.length;
      if (atEnd) return;
      event.preventDefault();
      const magnitude = Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1);
      const gap = now - state.last;
      const reaccelerating = magnitude >= 12 && magnitude > state.magnitude * 1.5 && now - state.lastStep >= 80;
      const freshGesture = gap > 110 || direction !== state.direction || reaccelerating;
      const previousMagnitude = state.magnitude;
      if (freshGesture) { state.delta = 0; state.stepped = false; }
      state.last = now;
      state.direction = direction;
      state.magnitude = magnitude;
      const decaying = state.stepped && !freshGesture && magnitude < previousMagnitude - .25;
      state.delta = decaying ? 0 : state.delta + magnitude;
      const notch = event.deltaMode !== 0 || (magnitude >= 80 && Math.abs(magnitude - previousMagnitude) <= magnitude * .1);
      const firstStep = !state.stepped && state.delta >= 12;
      const continuedStep = state.stepped && !decaying && (
        (notch && now - state.lastStep >= 32) ||
        (state.delta >= 90 && now - state.lastStep >= 90)
      );
      if (firstStep || continuedStep) {
        state.delta = 0;
        state.stepped = true;
        state.lastStep = now;
        onChange(Math.max(0, Math.min(items.length - 1, selectedIndex + direction)));
      }
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [items.length, selectedIndex, onChange]);

  const keyDown = event => {
    const values = { ArrowDown: selected + 1, ArrowUp: selected - 1, Home: 0, End: items.length - 1 };
    if (event.key in values) {
      event.preventDefault();
      onChange(Math.max(0, Math.min(items.length - 1, values[event.key])));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(selected, list.current.querySelector('[aria-selected="true"]'));
    }
  };

  return <section className={`wheel-picker wheel-picker--${variant}`} aria-label={`${label} selector`}>
    <div className="wheel-stage" ref={list} role="listbox" tabIndex={0}
      aria-label={label} aria-activedescendant={items[selected] ? `${id}-${items[selected].id}` : undefined}
      aria-orientation="vertical" onKeyDown={keyDown}
      onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
      onTouchEnd={event => {
        if (!touch.current) return;
        const dx = event.changedTouches[0].clientX - touch.current.x;
        const dy = event.changedTouches[0].clientY - touch.current.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
        touch.current = null;
      }}>
      {items.map((item, index) => {
        const offset = index - position;
        const depth = Math.min(Math.abs(offset), 3);
        const spacing = variant === 'subcategory' ? 98 : 136;
        return <div key={item.id} id={`${id}-${item.id}`} role="option" aria-label={item.label || item.title}
          aria-selected={index === selected} data-entry-id={variant === 'entry' ? item.id : undefined}
          className={`glass-option${index === selected ? ' is-selected' : ''}`}
          onClick={event => activate(index, event.currentTarget)}
          style={{ transform: `translate3d(0, ${offset * spacing}px, 0) perspective(1000px) translateZ(${24 - depth * 135}px) rotateX(${Math.max(-20, Math.min(20, offset * -10))}deg) rotateY(-3deg) scale(${1 - depth * .045})`, opacity: Math.max(0, 1 - depth * .33), zIndex: 10 - Math.round(depth), pointerEvents: depth > 2.3 ? 'none' : 'auto' }}>
          <span className="shard-surface" aria-hidden="true"><span className="shard-reflection" /></span>
          <span className="shard-label">{item.label || item.title}</span>
          <span className="shard-action" aria-hidden="true">{variant === 'entry' ? '+' : '\u2192'}</span>
        </div>;
      })}
    </div>
    <div className="wheel-controls">
      <button type="button" aria-label={`Previous ${label.toLowerCase()}`} disabled={selected <= 0} onClick={() => step(-1)}>&uarr;</button>
      <button type="button" aria-label={`Next ${label.toLowerCase()}`} disabled={selected >= items.length - 1} onClick={() => step(1)}>&darr;</button>
    </div>
    <span className="visually-hidden" aria-live="polite">{items[selected]?.label || items[selected]?.title}</span>
  </section>;
}
