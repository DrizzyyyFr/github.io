import { act, fireEvent, render, screen } from '@testing-library/react';
import App from '../../App';
import OceanScene from './OceanScene';

jest.mock('./OceanScene', () => jest.fn(() => <div data-testid="ocean-renderer" />));

beforeEach(() => {
  jest.useFakeTimers();
  OceanScene.mockImplementation(() => <div data-testid="ocean-renderer" />);
  window.history.replaceState(null, '', '/');
  window.matchMedia = () => ({ matches: false });
  window.scrollTo = jest.fn();
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000, writable: true });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { jest.useRealTimers(); });

function renderScene() {
  render(<App />);
  const scene = document.querySelector('.scroll-scene');
  Object.defineProperty(scene, 'offsetHeight', { configurable: true, value: 4000 });
  scene.getBoundingClientRect = () => ({ top: -window.scrollY });
  const state = OceanScene.mock.calls[0][0].stateRef;
  const scroll = (progress, settle = 800) => {
    window.scrollY = progress * 3000;
    fireEvent.scroll(window);
    if (settle) act(() => jest.advanceTimersByTime(settle));
  };
  return { scene, state, scroll };
}

test('four scroll poses reveal the name across the horizon before the underwater menu', () => {
  const { scene, state, scroll } = renderScene();
  const renderer = screen.getByTestId('ocean-renderer');
  expect(scene).toHaveAttribute('data-phase', 'sunrise');
  expect(parseFloat(scene.style.getPropertyValue('--waterline'))).toBeGreaterThan(100);
  expect(state.current.horizon).toBe(.5);
  expect(screen.queryByRole('heading', { name: 'Andre Matthiessen' })).not.toBeInTheDocument();
  expect(document.querySelector('.work-section')).toHaveAttribute('inert');

  scroll(1 / 3);
  expect(scene).toHaveAttribute('data-phase', 'about');
  expect(screen.getByRole('heading', { name: 'Andre Matthiessen' })).toBeInTheDocument();
  expect(document.querySelector('.intro-first')).toHaveTextContent('Andre');
  expect(document.querySelector('.intro-last')).toHaveTextContent('Matthiessen');
  expect(scene.style.getPropertyValue('--intro-x')).toBe('0vw');
  expect(parseFloat(scene.style.getPropertyValue('--waterline'))).toBeGreaterThan(100);
  expect(state.current.horizon).toBe(.5);
  expect(state.current.sunElevation).toBe(1);
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

  scroll(2 / 3);
  expect(scene).toHaveAttribute('data-phase', 'sunset');
  expect(state.current.sunElevation).toBe(0);
  expect(state.current.sunset).toBe(1);
  expect(screen.queryByRole('heading', { name: 'Andre Matthiessen' })).not.toBeInTheDocument();
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

  scroll(1);
  expect(scene).toHaveAttribute('data-phase', 'underwater');
  expect(state.current.submerge).toBe(1);
  expect(parseFloat(scene.style.getPropertyValue('--waterline'))).toBeLessThan(0);
  expect(screen.getByRole('tablist', { name: 'Work categories' })).toBeInTheDocument();
  expect(document.querySelector('.work-section')).not.toHaveAttribute('inert');
  expect(screen.getByTestId('ocean-renderer')).toBe(renderer);

  scroll(1 / 3);
  expect(scene).toHaveAttribute('data-phase', 'about');
  expect(screen.getByRole('heading', { name: 'Andre Matthiessen' })).toBeInTheDocument();
  expect(document.querySelector('.work-section')).toHaveAttribute('inert');
  scroll(0);
  expect(scene).toHaveAttribute('data-phase', 'sunrise');
  expect(parseFloat(scene.style.getPropertyValue('--waterline'))).toBeGreaterThan(100);
  expect(state.current.horizon).toBe(.5);
  expect(state.current.submerge).toBe(0);
  expect(screen.getByRole('link', { name: 'Scroll to introduction' })).toHaveAttribute('tabindex', '0');
});

test('the name fades in from the left, exits left, and reverses without snapping', () => {
  const { scene, scroll } = renderScene();
  scroll(.22);
  const enteringOpacity = Number(scene.style.getPropertyValue('--intro-opacity'));
  const enteringX = parseFloat(scene.style.getPropertyValue('--intro-x'));
  expect(enteringOpacity).toBeGreaterThan(0);
  expect(enteringOpacity).toBeLessThan(1);
  expect(enteringX).toBeLessThan(0);
  scroll(1 / 3);
  expect(scene.style.getPropertyValue('--intro-opacity')).toBe('1');
  scroll(.49, 16);
  expect(parseFloat(scene.style.getPropertyValue('--intro-x'))).toBeGreaterThan(-18);
  scroll(.49);
  const leavingX = parseFloat(scene.style.getPropertyValue('--intro-x'));
  expect(leavingX).toBeLessThan(0);
  expect(Number(scene.style.getPropertyValue('--intro-opacity'))).toBeLessThan(1);
  scroll(1 / 3, 16);
  expect(parseFloat(scene.style.getPropertyValue('--intro-x'))).toBeGreaterThan(leavingX);
  expect(parseFloat(scene.style.getPropertyValue('--intro-x'))).toBeLessThan(0);
  scroll(1 / 3);
  expect(scene.style.getPropertyValue('--intro-x')).toBe('0vw');
});

test('reduced motion updates the scene immediately and disables water drift', () => {
  window.matchMedia = query => ({ matches: query === '(prefers-reduced-motion: reduce)' });
  const { scene, state, scroll } = renderScene();
  scroll(1 / 3, 0);
  expect(scene.style.getPropertyValue('--intro-opacity')).toBe('1');
  expect(state.current.sunElevation).toBe(1);
  expect(state.current.reducedMotion).toBe(true);
  scroll(1, 0);
  expect(screen.getByRole('tablist', { name: 'Work categories' })).toBeInTheDocument();
  expect(state.current.submerge).toBe(1);
});

test('the introduction cue and Work route target their scroll poses, then keyboard navigation works', () => {
  const { scroll } = renderScene();
  const cue = screen.getByRole('link', { name: 'Scroll to introduction' });
  expect(cue).toHaveAttribute('href', '#about');
  cue.focus();
  expect(cue).toHaveFocus();
  window.history.replaceState(null, '', '#about');
  fireEvent(window, new Event('hashchange'));
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 1000, behavior: 'smooth' });
  scroll(1 / 3);
  expect(cue).toHaveAttribute('tabindex', '-1');

  expect(screen.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '#work');
  window.history.replaceState(null, '', '#work');
  fireEvent(window, new Event('hashchange'));
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 3000, behavior: 'smooth' });
  scroll(1);
  const category = screen.getByRole('tab', { name: 'Animation' });
  category.focus();
  fireEvent.keyDown(category, { key: 'ArrowRight' });
  fireEvent(window, new Event('hashchange'));
  expect(window.location.hash).toBe('#/technical-animation');
  expect(screen.getByRole('tab', { name: 'Technical Animation' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('button', { name: /Parametric Point Cloud Blend Space/ })).toHaveAttribute('aria-pressed', 'true');
});

test('the full click path opens content without replacing the underwater scene, then returns to its shard', () => {
  const { scene, scroll } = renderScene();
  scroll(1);
  fireEvent.click(screen.getByRole('tab', { name: 'Animation' }));
  fireEvent(window, new Event('hashchange'));
  fireEvent.click(screen.getByRole('button', { name: /Vehicular Interaction Animations/ }));
  fireEvent.click(screen.getByRole('button', { name: /View project/ }));
  fireEvent(window, new Event('hashchange'));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(document.querySelector('.scroll-scene')).toBe(scene);
  expect(screen.getByLabelText('Veh_InEngine.mp4')).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(800));
  fireEvent.click(screen.getByRole('button', { name: 'Close entry' }));
  fireEvent(window, new Event('hashchange'));
  act(() => jest.advanceTimersByTime(800));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.querySelector('.scroll-scene')).toBe(scene);
  expect(scene).toHaveAttribute('data-phase', 'underwater');
  expect(screen.getByRole('button', { name: /Vehicular Interaction Animations/ })).toHaveAttribute('aria-pressed', 'true');
});
