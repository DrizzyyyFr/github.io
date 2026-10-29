import { useEffect, useRef, useState } from 'react';

export default function useDepthPosition(target) {
  const [position, setPosition] = useState(target);
  const motion = useRef({ position: target, velocity: 0 });
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    let previous;
    const settle = () => {
      cancelAnimationFrame(frame);
      motion.current = { position: target, velocity: 0 };
      setPosition(target);
    };
    const tick = time => {
      const dt = previous === undefined ? 1 / 60 : Math.min((time - previous) / 1000, .05);
      previous = time;
      const state = motion.current;
      const displacement = state.position - target;
      const coefficient = state.velocity + 22 * displacement;
      const decay = Math.exp(-22 * dt);
      state.position = target + (displacement + coefficient * dt) * decay;
      state.velocity = (state.velocity - 22 * coefficient * dt) * decay;
      if (Math.abs(state.position - target) < .0005 && Math.abs(state.velocity) < .005) {
        settle();
      } else {
        setPosition(state.position);
        frame = requestAnimationFrame(tick);
      }
    };
    const preferenceChanged = () => { if (preference.matches) settle(); };
    if (preference.matches) settle();
    else frame = requestAnimationFrame(tick);
    preference.addEventListener?.('change', preferenceChanged);
    return () => {
      cancelAnimationFrame(frame);
      preference.removeEventListener?.('change', preferenceChanged);
    };
  }, [target]);
  return position;
}
