import { StrictMode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import PortfolioBrowser from './PortfolioBrowser';
import { projectPreview } from './projectPreview';
import { navigation } from '../../config/navigation';

const stacked = '(max-width: 850px) and (orientation: portrait)';
const row = name => screen.getByRole('button', { name: new RegExp(name) });

// A category change hands over: the old list leaves for 160ms before the new one arrives.
const handOver = () => act(() => jest.advanceTimersByTime(180));
// A project change crossfades: the outgoing media and title stay for 520ms before they are dropped.
const fadeOut = () => act(() => jest.advanceTimersByTime(600));

beforeEach(() => {
  jest.useFakeTimers();
  window.matchMedia = () => ({ matches: false });
  window.history.replaceState(null, '', '/');
});
afterEach(() => { jest.useRealTimers(); });

test('the two categories are tabs and every project of the selected one is listed with its path', () => {
  const view = render(<PortfolioBrowser />);
  const tabs = within(screen.getByRole('tablist', { name: 'Work categories' })).getAllByRole('tab');
  expect(tabs.map(tab => tab.textContent)).toEqual(['Animation', 'Technical Animation']);
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByRole('tab', { name: /all work/i })).not.toBeInTheDocument();
  expect(navigation.some(item => /about/i.test(item.label))).toBe(false);
  expect(within(screen.getByRole('tabpanel')).getAllByRole('listitem')).toHaveLength(2);
  expect(row('8 Directional Chair State Animations\\s*Animation / Interactions')).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(tabs[1]);
  expect(window.location.hash).toBe('#/technical-animation');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" />);
  handOver();
  expect(within(screen.getByRole('tabpanel')).getAllByRole('listitem')).toHaveLength(9);
  expect(row('Getting Started\\s*Technical Animation / Procedural Systems')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Technical Animation' })).toHaveAttribute('aria-selected', 'true');
});

test('clicking a row previews it in place, and View opens that exact entry from the card', () => {
  const open = jest.fn();
  render(<PortfolioBrowser categoryId="animation" onOpen={open} />);
  fireEvent.click(row('Vehicular Interaction Animations'));
  expect(window.location.hash).toBe('');
  expect(row('Vehicular Interaction Animations')).toHaveAttribute('aria-pressed', 'true');
  expect(row('8 Directional Chair State Animations')).toHaveAttribute('aria-pressed', 'false');
  const card = screen.getByRole('region', { name: 'Vehicular Interaction Animations preview' });
  expect(card).toHaveAttribute('data-entry-id', 'interactions-vehicular-interaction-animations');
  expect(screen.queryByText(/preview(ing)?$/i)).not.toBeInTheDocument();
  fireEvent.click(within(card).getByRole('button', { name: 'View' }));
  expect(open).toHaveBeenCalledWith(card);
  expect(window.location.hash).toBe('#/animation/interactions/interactions-vehicular-interaction-animations');
});

test('the preview loops a muted video, shows an image, or shows no media and no text', () => {
  const view = render(<PortfolioBrowser categoryId="animation" />);
  const video = document.querySelector('.work-preview video');
  expect(video.getAttribute('src')).toContain('chair-inengine');
  expect(video.muted).toBe(true);
  expect(video).toHaveAttribute('loop');
  expect(video).toHaveAttribute('autoplay');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="optimization-and-profiling-profiling-anim-graphs" />);
  handOver();
  expect(document.querySelector('.work-preview video').getAttribute('src')).toContain('2026-03-01-18-18-26');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="procedural-systems-lookat-documentation-simple-state-machine" />);
  fadeOut();
  expect(within(screen.getByRole('region', { name: /preview/ })).getByRole('img', { name: 'Pasted image 20260301171057' })).toBeInTheDocument();
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="download" />);
  fadeOut();
  const card = screen.getByRole('region', { name: 'Download preview' });
  expect(card.querySelector('.work-preview-stage')).toHaveClass('is-empty');
  expect(card.querySelector('.work-preview-layer')).toBeNull();
  expect(card).not.toHaveTextContent('Procedural Animation Toolkit');
  expect(within(card).getByRole('button', { name: 'View' })).toBeInTheDocument();
});

test('the media area takes the shape of the media it shows, and remembers it', () => {
  const view = render(<PortfolioBrowser categoryId="technical-animation" entryId="automation-phase-and-footstep-s-1-foot-2-foot-bang-there-sound-there-lets-automate" />);
  const stage = () => document.querySelector('.work-preview-stage');
  const strip = screen.getByRole('img', { name: 'Screenshot 2026-02-19 215431' });
  expect(stage().style.getPropertyValue('--media-ratio')).toBe(String(16 / 9));
  Object.defineProperty(strip, 'naturalWidth', { value: 1187 });
  Object.defineProperty(strip, 'naturalHeight', { value: 98 });
  fireEvent.load(strip);
  expect(parseFloat(stage().style.getPropertyValue('--media-ratio'))).toBeCloseTo(1187 / 98);
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="procedural-systems-lookat-documentation-simple-state-machine" />);
  fadeOut();
  // Until the new image reports its size, the area keeps its present shape instead of snapping.
  expect(parseFloat(stage().style.getPropertyValue('--media-ratio'))).toBeCloseTo(1187 / 98);
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="automation-phase-and-footstep-s-1-foot-2-foot-bang-there-sound-there-lets-automate" />);
  fadeOut();
  expect(parseFloat(stage().style.getPropertyValue('--media-ratio'))).toBeCloseTo(1187 / 98);
});

test('switching projects crossfades the card instead of cutting to the next one', () => {
  render(<PortfolioBrowser categoryId="animation" />);
  const card = screen.getByRole('region', { name: '8 Directional Chair State Animations preview' });
  fireEvent.click(row('Vehicular Interaction Animations'));
  // The same card stays on screen, holding the outgoing media and title while the new ones arrive.
  expect(screen.getByRole('region', { name: 'Vehicular Interaction Animations preview' })).toBe(card);
  expect(card.querySelectorAll('.work-preview-layer')).toHaveLength(2);
  expect(card.querySelector('.work-preview-label.is-leaving')).toHaveTextContent('8 Directional Chair State Animations');
  expect(card.querySelector('.work-preview-label.is-leaving')).toHaveAttribute('aria-hidden', 'true');
  expect(card.querySelector('[data-morph-title]')).toHaveTextContent('Vehicular Interaction Animations');
  // Until the new video can play, it waits unseen and the outgoing one stays in full, even past the fade.
  const [outgoing, incoming] = card.querySelectorAll('.work-preview-layer');
  expect(outgoing.querySelector('video').getAttribute('src')).toContain('chair-inengine');
  expect(incoming).toHaveClass('is-waiting');
  fadeOut();
  expect(outgoing).not.toHaveClass('is-leaving');
  expect(card.querySelectorAll('.work-preview-layer')).toHaveLength(2);
  fireEvent.canPlay(incoming.querySelector('video'));
  expect(incoming).not.toHaveClass('is-waiting');
  expect(outgoing).toHaveClass('is-leaving');
  fadeOut();
  expect(card.querySelectorAll('.work-preview-layer')).toHaveLength(1);
  expect(card.querySelectorAll('.work-preview-label')).toHaveLength(1);
  expect(card.querySelector('.work-preview-layer video').getAttribute('src')).toContain('2026-03-16-20-34-39');
});

test('media that never reports ready is shown anyway after a short wait', () => {
  render(<PortfolioBrowser categoryId="animation" />);
  fireEvent.click(row('Vehicular Interaction Animations'));
  act(() => jest.advanceTimersByTime(2600));
  expect(document.querySelector('.work-preview-layer.is-waiting')).toBeNull();
  fadeOut();
  expect(document.querySelectorAll('.work-preview-layer')).toHaveLength(1);
});

test('preview media only loads while the panel is on screen', () => {
  const view = render(<PortfolioBrowser categoryId="animation" active={false} />);
  expect(document.querySelector('.work-preview video')).toBeNull();
  expect(screen.getByRole('region', { name: '8 Directional Chair State Animations preview' })).toBeInTheDocument();
  view.rerender(<PortfolioBrowser categoryId="animation" active />);
  expect(document.querySelector('.work-preview video').getAttribute('src')).toContain('chair-inengine');
  view.rerender(<PortfolioBrowser categoryId="animation" active={false} />);
  expect(document.querySelector('.work-preview video')).toBeNull();
});

test('reduced motion keeps the preview video still', () => {
  window.matchMedia = query => ({ matches: query === '(prefers-reduced-motion: reduce)' });
  const view = render(<PortfolioBrowser categoryId="animation" />);
  const video = document.querySelector('.work-preview video');
  expect(video).not.toHaveAttribute('autoplay');
  // It still loads, so it shows a still first frame rather than an empty area.
  expect(video).toHaveAttribute('preload', 'auto');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="physical-systems-physia-framework-to-solve-procedural-active-ragdolls" />);
  handOver();
  expect(document.querySelector('.work-preview iframe').getAttribute('src')).toContain('autoplay=0');
});

test('a YouTube video in a note previews as a muted, looping autoplay that takes no input', () => {
  render(<PortfolioBrowser categoryId="technical-animation" entryId="physical-systems-physia-framework-to-solve-procedural-active-ragdolls" />);
  const player = document.querySelector('.work-preview iframe');
  const url = new URL(player.getAttribute('src'));
  expect(url.origin + url.pathname).toBe('https://www.youtube-nocookie.com/embed/vGiD6DGbWx0');
  expect(Object.fromEntries(url.searchParams)).toMatchObject({ autoplay: '1', mute: '1', loop: '1', playlist: 'vGiD6DGbWx0', controls: '0' });
  expect(player).toHaveAttribute('tabindex', '-1');
  expect(player).toHaveAttribute('aria-hidden', 'true');
  expect(player.getAttribute('allow')).toContain('autoplay');
  expect(document.querySelector('.work-preview-stage')).not.toHaveClass('is-empty');
  // A local video still wins over YouTube, and YouTube over an image.
  expect(projectPreview({ body: '![[Chair_InEngine.mp4]]\n<iframe src="https://www.youtube.com/embed/YPJ0_ISq-yg"></iframe>' }).kind).toBe('video');
  expect(projectPreview({ body: '![[Pasted image 20260301171057.png]]\nhttps://youtu.be/YPJ0_ISq-yg' }).kind).toBe('youtube');
});

test('a routed entry is previewed, kept after the route returns to its topic, and remembered per category', () => {
  const view = render(<PortfolioBrowser categoryId="technical-animation" subcategoryId="procedural-systems" entryId="procedural-systems-lookat-l-a-slides" />);
  expect(row('L-A Slides')).toHaveAttribute('aria-pressed', 'true');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" subcategoryId="procedural-systems" />);
  handOver();
  expect(row('L-A Slides')).toHaveAttribute('aria-pressed', 'true');
  view.rerender(<PortfolioBrowser categoryId="animation" />);
  handOver();
  expect(row('8 Directional Chair State Animations')).toHaveAttribute('aria-pressed', 'true');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" />);
  handOver();
  expect(row('L-A Slides')).toHaveAttribute('aria-pressed', 'true');
  view.unmount();
  render(<PortfolioBrowser categoryId="technical-animation" subcategoryId="automation" />);
  expect(row('1 foot, 2 foot')).toHaveAttribute('aria-pressed', 'true');
});

test('arrow keys move through the rows and across the category tabs', () => {
  render(<PortfolioBrowser categoryId="animation" />);
  row('8 Directional Chair State Animations').focus();
  fireEvent.keyDown(row('8 Directional Chair State Animations'), { key: 'ArrowDown' });
  expect(row('Vehicular Interaction Animations')).toHaveFocus();
  expect(row('Vehicular Interaction Animations')).toHaveAttribute('aria-pressed', 'true');
  fireEvent.keyDown(row('Vehicular Interaction Animations'), { key: 'ArrowDown' });
  expect(row('Vehicular Interaction Animations')).toHaveFocus();
  const tab = screen.getByRole('tab', { name: 'Animation' });
  tab.focus();
  fireEvent.keyDown(tab, { key: 'ArrowRight' });
  expect(window.location.hash).toBe('#/technical-animation');
  expect(screen.getByRole('tab', { name: 'Technical Animation' })).toHaveFocus();
});

test('portrait phones open the selected row in place with its preview', () => {
  window.matchMedia = query => ({ matches: query === stacked });
  render(<PortfolioBrowser categoryId="animation" />);
  const first = row('8 Directional Chair State Animations').closest('li');
  expect(within(first).getByRole('region', { name: '8 Directional Chair State Animations preview' })).toBeInTheDocument();
  fireEvent.click(row('Vehicular Interaction Animations'));
  const second = row('Vehicular Interaction Animations').closest('li');
  expect(within(second).getByRole('region', { name: 'Vehicular Interaction Animations preview' })).toBeInTheDocument();
  // The previous row's preview folds away before it is removed.
  expect(first.querySelector('.work-inline')).toHaveClass('is-closing');
  expect(first.querySelector('.work-inline')).toHaveAttribute('inert');
  fadeOut();
  expect(first.querySelector('.work-inline')).toBeNull();
  expect(screen.getAllByRole('region')).toHaveLength(1);
  expect(document.querySelector('.portfolio-browser')).toHaveClass('is-stacked');
});

// npm start runs under StrictMode, which mounts every effect twice; selection must still work there.
test('a click selects a row under StrictMode, and hovering a row never changes the selection', () => {
  render(<StrictMode><PortfolioBrowser categoryId="animation" /></StrictMode>);
  fireEvent.mouseEnter(row('Vehicular Interaction Animations'));
  fireEvent.mouseMove(row('Vehicular Interaction Animations'), { clientX: 20, clientY: 30 });
  expect(row('8 Directional Chair State Animations')).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(row('Vehicular Interaction Animations'));
  expect(row('Vehicular Interaction Animations')).toHaveAttribute('aria-pressed', 'true');
  expect(row('8 Directional Chair State Animations')).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('region', { name: 'Vehicular Interaction Animations preview' })).toBeInTheDocument();
});
