import { act, fireEvent, render } from '@testing-library/react';
import OceanScene from './OceanScene';

let gl;
let callbacks;
let requestId;
let context;
let hidden;
let intersectionCallback;
let resizeCallback;
let intersectionDisconnect;
let resizeDisconnect;

const createGL = () => ({
  VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
  ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, DEPTH_TEST: 8, BLEND: 9, TRIANGLES: 10,
  createShader: jest.fn(() => ({})), shaderSource: jest.fn(), compileShader: jest.fn(),
  getShaderParameter: jest.fn(() => true), deleteShader: jest.fn(),
  createProgram: jest.fn(() => ({})), attachShader: jest.fn(), linkProgram: jest.fn(),
  getProgramParameter: jest.fn(() => true), useProgram: jest.fn(), deleteProgram: jest.fn(),
  createBuffer: jest.fn(() => ({})), bindBuffer: jest.fn(), bufferData: jest.fn(), deleteBuffer: jest.fn(),
  getAttribLocation: jest.fn(() => 0), enableVertexAttribArray: jest.fn(), vertexAttribPointer: jest.fn(),
  getUniformLocation: jest.fn((program, name) => name), disable: jest.fn(),
  uniform1f: jest.fn(), uniform2f: jest.fn(), viewport: jest.fn(), drawArrays: jest.fn(),
});

beforeEach(() => {
  gl = createGL();
  callbacks = new Map();
  requestId = 0;
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    callbacks.set(++requestId, callback);
    return requestId;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => callbacks.delete(id));
  context = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => gl);
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: 3840, height: 2160 }));
  hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  window.matchMedia = jest.fn(() => ({ matches: false }));
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });
  intersectionDisconnect = jest.fn();
  resizeDisconnect = jest.fn();
  window.IntersectionObserver = jest.fn(callback => {
    intersectionCallback = callback;
    return { observe: jest.fn(), disconnect: intersectionDisconnect };
  });
  window.ResizeObserver = jest.fn(callback => {
    resizeCallback = callback;
    return { observe: jest.fn(), disconnect: resizeDisconnect };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  delete window.IntersectionObserver;
  delete window.ResizeObserver;
});

function frame(time = 20) {
  act(() => {
    const current = [...callbacks.values()];
    callbacks.clear();
    current.forEach(callback => callback(time));
  });
}

function mount(initial = {}) {
  const stateRef = { current: { horizon: .5, submerge: 0, ...initial } };
  const result = render(<div className="scroll-scene"><OceanScene stateRef={stateRef} /></div>);
  return {
    ...result, stateRef,
    canvas: result.container.querySelector('canvas'),
    ocean: result.container.querySelector('.ocean-scene'),
    scene: result.container.querySelector('.scroll-scene'),
  };
}

test('caps a widescreen drawing buffer and releases GPU resources and observers on unmount', () => {
  const { canvas, ocean, unmount } = mount();
  frame();
  expect(ocean).toHaveAttribute('data-renderer', 'webgl');
  expect(canvas.width * canvas.height).toBeLessThanOrEqual(1503000);
  expect(canvas.width / canvas.height).toBeCloseTo(3840 / 2160, 2);
  expect(gl.drawArrays).toHaveBeenCalledTimes(1);
  expect(callbacks.size).toBe(1);
  unmount();
  expect(callbacks.size).toBe(0);
  expect(gl.deleteBuffer).toHaveBeenCalledTimes(1);
  expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
  expect(intersectionDisconnect).toHaveBeenCalledTimes(1);
  expect(resizeDisconnect).toHaveBeenCalledTimes(1);
});

test('reduced motion draws once and redraws scroll state on demand without an idle loop', () => {
  const { scene, stateRef } = mount({ reducedMotion: true });
  frame();
  expect(callbacks.size).toBe(0);
  expect(gl.uniform1f).toHaveBeenCalledWith('u_time', 0);
  stateRef.current = { reducedMotion: true, horizon: 1.15, submerge: 1 };
  fireEvent(scene, new Event('ocean-frame'));
  frame(40);
  expect(gl.drawArrays).toHaveBeenCalledTimes(2);
  expect(gl.uniform1f).toHaveBeenCalledWith('u_submerge', 1);
  expect(gl.uniform1f).toHaveBeenCalledWith('u_horizon', 1.15);
  expect(callbacks.size).toBe(0);
});

test('pauses when hidden or outside the viewport and resumes when visible', () => {
  mount();
  frame();
  hidden.mockReturnValue(true);
  fireEvent(document, new Event('visibilitychange'));
  expect(callbacks.size).toBe(0);
  hidden.mockReturnValue(false);
  fireEvent(document, new Event('visibilitychange'));
  frame(1000);
  expect(gl.drawArrays).toHaveBeenCalledTimes(2);
  act(() => intersectionCallback([{ isIntersecting: false }]));
  expect(callbacks.size).toBe(0);
  act(() => intersectionCallback([{ isIntersecting: true }]));
  frame(2000);
  expect(gl.drawArrays).toHaveBeenCalledTimes(3);
});

test('rebuilds the GPU program after context loss and keeps fallback aligned to underwater state', () => {
  const { canvas, ocean, scene, stateRef } = mount();
  frame();
  const event = new Event('webglcontextlost', { cancelable: true });
  fireEvent(canvas, event);
  expect(event.defaultPrevented).toBe(true);
  expect(ocean).toHaveAttribute('data-renderer', 'fallback');
  expect(callbacks.size).toBe(0);
  expect(parseFloat(ocean.style.getPropertyValue('--fallback-immersion-line'))).toBeCloseTo(108);
  stateRef.current = { horizon: 1.15, submerge: 1 };
  fireEvent(scene, new Event('ocean-frame'));
  expect(ocean.style.getPropertyValue('--fallback-depth')).toBe('1');
  expect(parseFloat(ocean.style.getPropertyValue('--fallback-waterline'))).toBeCloseTo(-15);
  expect(parseFloat(ocean.style.getPropertyValue('--fallback-immersion-line'))).toBeCloseTo(-8);
  expect(callbacks.size).toBe(0);
  fireEvent(canvas, new Event('webglcontextrestored'));
  frame(40);
  expect(ocean).toHaveAttribute('data-renderer', 'webgl');
  expect(gl.createProgram).toHaveBeenCalledTimes(2);
  expect(gl.drawArrays).toHaveBeenCalledTimes(2);
});

test('unsupported WebGL follows scene changes in a static fallback without scheduling frames', () => {
  context.mockReturnValue(null);
  const { ocean, scene, stateRef } = mount();
  expect(ocean).toHaveAttribute('data-renderer', 'fallback');
  expect(ocean.style.getPropertyValue('--fallback-waterline')).toBe('50%');
  expect(parseFloat(ocean.style.getPropertyValue('--fallback-immersion-line'))).toBeCloseTo(108);
  expect(callbacks.size).toBe(0);
  stateRef.current = { horizon: 1.15, submerge: 1, sunset: 1 };
  fireEvent(scene, new Event('ocean-frame'));
  expect(ocean.style.getPropertyValue('--fallback-depth')).toBe('1');
  expect(parseFloat(ocean.style.getPropertyValue('--fallback-immersion-line'))).toBeCloseTo(-8);
  expect(callbacks.size).toBe(0);
  expect(gl.drawArrays).not.toHaveBeenCalled();
});

test('failed shader compilation releases its shader and uses the fallback without an animation loop', () => {
  gl.getShaderParameter.mockReturnValue(false);
  const { ocean } = mount();
  expect(ocean).toHaveAttribute('data-renderer', 'fallback');
  expect(gl.deleteShader).toHaveBeenCalledTimes(1);
  expect(callbacks.size).toBe(0);
});

test('coarse pointers use a smaller buffer and throttle decorative animation to 30 fps', () => {
  window.matchMedia.mockReturnValue({ matches: true });
  const { canvas } = mount();
  frame(20);
  expect(canvas.width * canvas.height).toBeLessThanOrEqual(852000);
  frame(36);
  expect(gl.drawArrays).toHaveBeenCalledTimes(1);
  frame(54);
  expect(gl.drawArrays).toHaveBeenCalledTimes(2);
  act(() => resizeCallback());
  frame(70);
  expect(gl.drawArrays).toHaveBeenCalledTimes(3);
});

test('context restoration resumes the same wave time without charging the lost-context gap', () => {
  const { canvas } = mount();
  const waveTime = () => gl.uniform1f.mock.calls.filter(([name]) => name === 'u_time').at(-1)[1];
  frame(20);
  frame(40);
  expect(waveTime()).toBeCloseTo(.02);

  fireEvent(canvas, new Event('webglcontextlost', { cancelable: true }));
  fireEvent(canvas, new Event('webglcontextrestored'));
  frame(10000);
  expect(waveTime()).toBeCloseTo(.02);
  expect(gl.drawArrays).toHaveBeenCalledTimes(3);
  frame(10020);
  expect(waveTime()).toBeCloseTo(.04);
});

test('temporary load reduces the buffer, then sustained unpaused frames restore sharpness within the cap', () => {
  const { canvas } = mount();
  const pixels = () => canvas.width * canvas.height;
  let now = 20;
  frame(now);
  const original = pixels();
  for (let i = 0; i < 20; i++) frame(now += 40);
  const reduced = pixels();
  expect(reduced).toBeLessThan(original);

  for (let i = 0; i < 250; i++) frame(now += 17);
  expect(pixels()).toBe(reduced);
  hidden.mockReturnValue(true);
  fireEvent(document, new Event('visibilitychange'));
  hidden.mockReturnValue(false);
  fireEvent(document, new Event('visibilitychange'));
  frame(now += 10000);
  for (let i = 0; i < 100; i++) frame(now += 17);
  expect(pixels()).toBe(reduced);
  for (let i = 0; i < 200; i++) frame(now += 17);
  expect(pixels()).toBeGreaterThan(reduced);
  expect(pixels()).toBeLessThan(original);
  for (let i = 0; i < 300; i++) frame(now += 17);
  expect(pixels()).toBe(original);
  expect(pixels()).toBeLessThanOrEqual(1503000);
});
