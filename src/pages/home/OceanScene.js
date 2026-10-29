import { useEffect, useRef } from 'react';
import { oceanFragmentShader, oceanVertexShader } from './oceanShaders';
import './OceanScene.css';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export default function OceanScene({ stateRef }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    let gl;
    let program;
    let buffer;
    let locations;
    let frame = 0;
    let visible = true;
    let lost = false;
    let disposed = false;
    let resizePending = true;
    let elapsed = 0;
    let lastTime = 0;
    let lastDraw = 0;
    let budgetScale = 1;
    let slowFrames = 0;
    let stableFrames = 0;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const pixelLimit = coarse ? 850000 : 1500000;
    const interval = coarse ? 1000 / 30 : 1000 / 60;
    const paintFallback = () => {
      const state = stateRef.current || {};
      const horizon = clamp(state.horizon ?? .5, .5, 1.2);
      wrapper.style.setProperty('--fallback-waterline', `${(1 - horizon) * 100}%`);
      const waterline = -.08 + 1.16 * clamp(state.submerge || 0, 0, 1);
      wrapper.style.setProperty('--fallback-immersion-line', `${(1 - waterline) * 100}%`);
      wrapper.style.setProperty('--fallback-depth', clamp(state.submerge || 0, 0, 1));
      const day = clamp(state.daylight || 0, 0, 1);
      const sunset = clamp(state.sunset || 0, 0, 1);
      const blend = (dawn, noon, dusk) => `rgb(${dawn.map((channel, index) => Math.round((channel + (noon[index] - channel) * day) * (1 - sunset) + dusk[index] * sunset)).join(', ')})`;
      wrapper.style.setProperty('--fallback-sky-top', blend([61, 89, 148], [41, 117, 181], [74, 69, 122]));
      wrapper.style.setProperty('--fallback-sky-bottom', blend([240, 166, 140], [163, 207, 219], [245, 140, 107]));
    };
    const fallback = () => { wrapper.dataset.renderer = 'fallback'; paintFallback(); };

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        throw new Error('Ocean shader compilation failed');
      }
      return shader;
    };

    const setup = () => {
      try {
        gl = canvas.getContext('webgl', {
          alpha: false, antialias: false, depth: false, stencil: false,
          preserveDrawingBuffer: false, powerPreference: 'default',
        });
        if (!gl) { fallback(); return false; }
        const vertex = compile(gl.VERTEX_SHADER, oceanVertexShader);
        let fragment;
        try { fragment = compile(gl.FRAGMENT_SHADER, oceanFragmentShader); }
        catch (error) { gl.deleteShader(vertex); throw error; }
        program = gl.createProgram();
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Ocean shader linking failed');
        gl.useProgram(program);
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        locations = {};
        ['resolution', 'time', 'elevation', 'daylight', 'sunset', 'submerge', 'horizon', 'sunX'].forEach(name => {
          locations[name] = gl.getUniformLocation(program, `u_${name}`);
        });
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        wrapper.dataset.renderer = 'webgl';
        resizePending = true;
        return true;
      } catch (error) {
        if (buffer) gl?.deleteBuffer(buffer);
        if (program) gl?.deleteProgram(program);
        buffer = null;
        program = null;
        fallback();
        return false;
      }
    };

    const draw = time => {
      if (!program || lost || disposed) return;
      if (resizePending) {
        const bounds = wrapper.getBoundingClientRect();
        const width = Math.max(1, bounds.width);
        const height = Math.max(1, bounds.height);
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(pixelLimit * budgetScale / (width * height)));
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
        gl.viewport(0, 0, canvas.width, canvas.height);
        resizePending = false;
      }
      const state = stateRef.current || {};
      gl.uniform2f(locations.resolution, canvas.width, canvas.height);
      gl.uniform1f(locations.time, state.reducedMotion ? 0 : time);
      gl.uniform1f(locations.elevation, clamp(state.sunElevation || 0, 0, 1));
      gl.uniform1f(locations.daylight, clamp(state.daylight || 0, 0, 1));
      gl.uniform1f(locations.sunset, clamp(state.sunset || 0, 0, 1));
      gl.uniform1f(locations.submerge, clamp(state.submerge || 0, 0, 1));
      gl.uniform1f(locations.horizon, clamp(state.horizon ?? .5, .5, 1.2));
      gl.uniform1f(locations.sunX, clamp(state.sunX ?? .7, .1, .9));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const tick = now => {
      frame = 0;
      if (disposed || lost || !visible || document.hidden || !program) return;
      const reduced = stateRef.current?.reducedMotion;
      if (now - lastDraw >= interval - 1 || reduced || resizePending) {
        if (!reduced && lastTime) {
          const drawInterval = now - lastDraw;
          if (drawInterval > interval * 1.8) {
            slowFrames++;
            stableFrames = 0;
          } else {
            slowFrames = Math.max(0, slowFrames - 1);
            stableFrames = drawInterval <= interval * 1.35 ? stableFrames + 1 : 0;
          }
        } else {
          slowFrames = 0;
          stableFrames = 0;
        }
        if (slowFrames >= 20 && budgetScale > .6) {
          budgetScale = Math.max(.6, budgetScale * .85);
          resizePending = true;
          slowFrames = 0;
          stableFrames = 0;
        } else if (stableFrames >= 300) {
          if (budgetScale < 1) {
            budgetScale = Math.min(1, budgetScale + .1);
            resizePending = true;
          }
          stableFrames = 0;
        }
        if (!reduced && lastTime) elapsed += Math.min((now - lastTime) / 1000, .1);
        lastTime = reduced ? 0 : now;
        lastDraw = now;
        draw(elapsed);
      }
      if (!reduced) frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!frame && program && !lost && visible && !document.hidden && !disposed) frame = requestAnimationFrame(tick);
    };
    const sceneChanged = () => {
      if (wrapper.dataset.renderer === 'fallback') paintFallback();
      else wake();
    };
    const resize = () => { resizePending = true; wake(); };
    const resetTiming = () => {
      lastTime = 0;
      lastDraw = 0;
      slowFrames = 0;
      stableFrames = 0;
    };
    const pause = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      resetTiming();
    };
    const visibilityChanged = () => {
      if (document.hidden) pause();
      else wake();
    };
    const contextLost = event => {
      event.preventDefault();
      lost = true;
      pause();
      fallback();
    };
    const contextRestored = () => {
      lost = false;
      program = null;
      buffer = null;
      resetTiming();
      if (setup()) wake();
    };

    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    document.addEventListener('visibilitychange', visibilityChanged);
    // HomePage dispatches this after mutating the shared scroll state. It also
    // redraws reduced-motion scenes without running an idle animation loop.
    const scene = wrapper.closest('.scroll-scene');
    scene?.addEventListener('ocean-frame', sceneChanged);
    window.addEventListener('resize', resize);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(wrapper);
    const intersection = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) wake();
      else pause();
    }) : null;
    intersection?.observe(wrapper);
    if (setup()) wake();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      intersection?.disconnect();
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      document.removeEventListener('visibilitychange', visibilityChanged);
      scene?.removeEventListener('ocean-frame', sceneChanged);
      window.removeEventListener('resize', resize);
      if (!lost) {
        if (buffer) gl?.deleteBuffer(buffer);
        if (program) gl?.deleteProgram(program);
      }
    };
  }, [stateRef]);

  return <div ref={wrapperRef} className="ocean-scene" aria-hidden="true"><canvas ref={canvasRef} className="ocean-canvas" /></div>;
}
