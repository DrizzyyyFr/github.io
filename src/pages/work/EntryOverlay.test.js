import { act, fireEvent, render, screen, within } from '@testing-library/react';
import EntryOverlay from './EntryOverlay';
import { resolvePage } from '../../config/navigation';
import { ease, targetRect, transitionAt } from './entryTransition';

const destinationWidth = () => targetRect().width;

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

test('a project of several pages opens once, and its page bar turns pages inside the same pane', () => {
  const page = id => resolvePage(`#/technical-animation/procedural-systems/procedural-systems-${id}`);
  const view = render(<EntryOverlay route={page('lookat-concept-and-introduction')} origin={origin} />);
  act(() => jest.advanceTimersByTime(800));
  const pane = screen.getByRole('dialog');
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('LookAt');
  expect(document.title).toBe('Concept and Introduction · LookAt | Andre Matthiessen');
  const bar = screen.getByRole('navigation', { name: 'LookAt pages' });
  const tabs = within(bar).getAllByRole('link');
  expect(tabs.map(tab => tab.textContent)).toEqual(['01Concept and Introduction', '02Getting Started', '03State Machine Setup', '04Showcase']);
  expect(tabs[0]).toHaveAttribute('aria-current', 'page');
  expect(tabs[2]).toHaveAttribute('href', '#/technical-animation/procedural-systems/procedural-systems-lookat-documentation-state-machine-setup');
  expect(bar.style.opacity).toBe('1');
  expect(parseFloat(document.querySelector('.entry-scroll').style.top)).toBeGreaterThan(parseFloat(bar.style.top));
  // The end of a page leads on to the next one.
  expect(screen.getByRole('link', { name: /Next: Getting Started/ })).toHaveAttribute('href', tabs[1].getAttribute('href'));
  const scroll = document.querySelector('.entry-scroll');
  scroll.scrollTop = 400;
  view.rerender(<EntryOverlay route={page('lookat-documentation-getting-started')} origin={origin} />);
  // The pane stays open around the new page, which starts from its top.
  expect(screen.getByRole('dialog')).toBe(pane);
  expect(pane.style.width).toBe(`${destinationWidth()}px`);
  expect(scroll.scrollTop).toBe(0);
  expect(within(bar).getAllByRole('link')[1]).toHaveAttribute('aria-current', 'page');
  expect(document.title).toBe('Getting Started · LookAt | Andre Matthiessen');
  view.rerender(<EntryOverlay route={page('lookat-showcase')} origin={origin} />);
  expect(screen.queryByRole('link', { name: /^Next:/ })).toBeNull();
  view.unmount();
  expect(document.title).not.toContain('LookAt');
});

test('a project of one page has no page bar', () => {
  render(<EntryOverlay route={resolvePage(entryPath)} origin={origin} />);
  expect(screen.queryByRole('navigation')).toBeNull();
  expect(screen.queryByRole('link', { name: /^Next:/ })).toBeNull();
  expect(document.title).toBe('8-Directional Chair State Animations | Andre Matthiessen');
});

test('the preview card grows into the pane, hands over its glass, updates on resize, and cleans up the retreat', () => {
  const fixture = document.createElement('div');
  fixture.className = 'site-layout';
  fixture.innerHTML = '<header class="site-header"></header><div class="scroll-scene"><button class="work-row"></button><button class="work-row"></button><section class="work-preview" data-project-id="interactions-8-directional-chair-state-animations"><h3 data-morph-title>Entry</h3></section></div>';
  document.body.appendChild(fixture);
  const pane = fixture.querySelector('.work-preview');
  pane.getBoundingClientRect = () => ({ left: 200, top: 200, width: 240, height: 100 });
  const previousWidth = window.innerWidth;
  const view = render(<EntryOverlay route={resolvePage(entryPath)} origin={origin} />);
  const dialog = screen.getByRole('dialog');
  expect(dialog.style.width).toBe('240px');
  expect(pane).toHaveClass('is-entry-source');
  expect(pane.style.opacity).toBe('1');
  expect(dialog.style.getPropertyValue('--surface-opacity')).toBe('0');
  act(() => jest.advanceTimersByTime(800));
  expect(pane.style.opacity).toBe('0');
  expect(dialog.style.getPropertyValue('--surface-opacity')).toBe('1');
  // The retreat is written on the elements that read it, never on the page's root, which would
  // restyle the whole page on every frame; rows move by their own transform.
  expect(fixture.querySelector('.site-header').style.getPropertyValue('--entry-retreat')).toBe('1');
  expect(fixture.style.getPropertyValue('--entry-retreat')).toBe('');
  expect(fixture.querySelector('.scroll-scene').getAttribute('style')).toBeNull();
  expect(fixture.querySelectorAll('.work-row')[1].style.transform).toBe('translateX(-100vw) scale(0.88)');
  window.innerWidth = 420;
  fireEvent.resize(window);
  expect(dialog.style.width).toBe('400px');
  view.unmount();
  expect(pane).not.toHaveClass('is-entry-source');
  expect(pane.style.opacity).toBe('');
  expect(fixture.querySelector('.site-header').style.getPropertyValue('--entry-retreat')).toBe('');
  expect(fixture.querySelectorAll('.work-row')[1].style.transform).toBe('');
  window.innerWidth = previousWidth;
  fixture.remove();
});
