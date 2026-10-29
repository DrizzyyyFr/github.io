import { act, fireEvent, render, screen } from '@testing-library/react';
import EntryOverlay from './EntryOverlay';
import { resolvePage } from '../../config/navigation';
import { ease, transitionAt } from './entryTransition';

const entryPath = '#/animation/interactions/interactions-8-directional-chair-state-animations';
const source = { left: 800, top: 300, width: 300, height: 120 };
const destination = { left: 50, top: 40, width: 1184, height: 632 };
let origin;
beforeEach(() => {
  jest.useFakeTimers();
  window.matchMedia = () => ({ matches: false });
  origin = { current: { rect: source } };
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { jest.useRealTimers(); });

test('reference timeline expands bounds first and reveals content late', () => {
  expect(transitionAt(.1, source, destination).rect).toEqual(source);
  const middle = transitionAt(.5, source, destination);
  expect(middle.rect.width).toBeGreaterThan(source.width);
  expect(middle.rect.width).toBeLessThan(destination.width);
  expect(middle.reveal).toBe(0);
  expect(transitionAt(.84, source, destination).rect).toEqual(destination);
  expect(transitionAt(.84, source, destination).reveal).toBeGreaterThan(0);
  expect(transitionAt(1, source, destination).reveal).toBe(1);
  expect(ease(.3, 0, .52)).toBeGreaterThan(ease(.3, .11, .59));
});

test('entry content lives inside the resized pane without scaled text', () => {
  render(<EntryOverlay route={resolvePage(entryPath)} origin={origin} />);
  const pane = screen.getByRole('dialog');
  expect(pane).toHaveAttribute('open');
  expect(pane.style.width).toBe('300px');
  expect(pane.style.transform).toBe('');
  expect(screen.getByLabelText('Chair_InEngine.mp4')).toBeInTheDocument();
  expect(document.body.style.overflow).toBe('hidden');
  act(() => jest.advanceTimersByTime(320));
  expect(parseFloat(pane.style.width)).toBeGreaterThan(300);
  expect(document.querySelector('.entry-scroll').style.height).toBe('0px');
  expect(screen.getByRole('button', { name: 'Close entry' })).toBeDisabled();
  act(() => jest.advanceTimersByTime(500));
  expect(parseFloat(document.querySelector('.entry-scroll').style.height)).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Close entry' })).toBeEnabled();
});

test('closing halfway reverses the same timeline without a geometry jump', () => {
  const view = render(<EntryOverlay route={resolvePage(entryPath)} origin={origin} />);
  act(() => jest.advanceTimersByTime(300));
  const pane = screen.getByRole('dialog');
  const intermediate = pane.style.width;
  view.rerender(<EntryOverlay route={resolvePage('#/animation/interactions')} origin={origin} />);
  expect(pane.style.width).toBe(intermediate);
  act(() => jest.advanceTimersByTime(80));
  expect(parseFloat(pane.style.width)).toBeLessThan(parseFloat(intermediate));
  const reversed = pane.style.width;
  view.rerender(<EntryOverlay route={resolvePage(entryPath)} origin={origin} />);
  expect(pane.style.width).toBe(reversed);
  act(() => jest.advanceTimersByTime(800));
  expect(screen.getByRole('dialog')).toHaveAttribute('open');
  expect(screen.getByRole('button', { name: 'Close entry' })).toBeEnabled();
});

test('completed close restores focus and scene properties', () => {
  const focus = document.createElement('button');
  document.body.appendChild(focus);
  origin.current.focus = focus;
  const view = render(<EntryOverlay route={resolvePage(entryPath)} origin={origin} />);
  act(() => jest.advanceTimersByTime(800));
  fireEvent.click(screen.getByRole('button', { name: 'Close entry' }));
  expect(window.location.hash).toBe('#/animation/interactions');
  view.rerender(<EntryOverlay route={resolvePage(window.location.hash)} origin={origin} />);
  act(() => jest.advanceTimersByTime(800));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('');
  expect(focus).toHaveFocus();
  focus.remove();
});

test('Escape remains available during the reveal and reduced motion settles immediately', () => {
  window.matchMedia = () => ({ matches: true });
  const view = render(<EntryOverlay route={resolvePage(entryPath)} origin={origin} />);
  expect(screen.getByRole('button', { name: 'Close entry' })).toBeEnabled();
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(window.location.hash).toBe('#/animation/interactions');
  view.rerender(<EntryOverlay route={resolvePage(window.location.hash)} origin={origin} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('an immediate close cancels the pending frame and restores body state', () => {
  const view = render(<EntryOverlay route={resolvePage(entryPath)} origin={origin} />);
  view.rerender(<EntryOverlay route={resolvePage('#/animation/interactions')} origin={origin} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('');
  expect(jest.getTimerCount()).toBe(0);
});

test('a new note uses its own shard geometry, updates on resize, and cleans scene retreat', () => {
  const fixture = document.createElement('div');
  fixture.className = 'site-layout';
  fixture.innerHTML = '<div class="scroll-scene"><div role="listbox"><div class="glass-option" data-entry-id="interactions-8-directional-chair-state-animations"><span class="shard-label">Entry</span></div><div class="glass-option"></div></div></div>';
  document.body.appendChild(fixture);
  const pane = fixture.querySelector('.glass-option');
  pane.getBoundingClientRect = () => ({ left: 200, top: 200, width: 240, height: 100 });
  const previousWidth = window.innerWidth;
  const view = render(<EntryOverlay route={resolvePage(entryPath)} origin={origin} />);
  expect(screen.getByRole('dialog').style.width).toBe('240px');
  expect(pane).toHaveClass('is-entry-source');
  act(() => jest.advanceTimersByTime(800));
  expect(fixture.style.getPropertyValue('--entry-retreat')).toBe('1');
  expect(fixture.querySelectorAll('.glass-option')[1].style.getPropertyValue('--entry-pane-retreat')).toBe('1');
  window.innerWidth = 420;
  fireEvent.resize(window);
  expect(screen.getByRole('dialog').style.width).toBe('400px');
  view.unmount();
  expect(pane).not.toHaveClass('is-entry-source');
  expect(fixture.style.getPropertyValue('--entry-retreat')).toBe('');
  expect(fixture.querySelector('.scroll-scene').style.getPropertyValue('--entry-travel')).toBe('');
  window.innerWidth = previousWidth;
  fixture.remove();
});
