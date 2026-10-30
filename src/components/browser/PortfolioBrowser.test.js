import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import PortfolioBrowser from './PortfolioBrowser';
import { projectPreview } from './projectPreview';
import { navigation } from '../../config/navigation';

const stacked = '(max-width: 850px) and (orientation: portrait)';
const row = name => screen.getByRole('button', { name: new RegExp(name) });
const topicRow = name => screen.getByText(name, { selector: '.is-topic .work-row-title' }).closest('button');

// A category change hands over: the old list leaves for 160ms before the new one arrives.
const handOver = () => act(() => jest.advanceTimersByTime(180));
// A project change crossfades: the outgoing media and title stay for 520ms before they are dropped.
const fadeOut = () => act(() => jest.advanceTimersByTime(600));
const shownTopics = () => [...document.querySelectorAll('.work-row.is-topic')].map(item => item.textContent);
const shownProjects = () => [...document.querySelectorAll('.work-row.is-project')].map(item => item.textContent);

beforeEach(() => {
  jest.useFakeTimers();
  window.matchMedia = () => ({ matches: false });
  window.history.replaceState(null, '', '/');
});
afterEach(() => { jest.useRealTimers(); });

test('the two categories are tabs, and the selected one lists its topics with the open topic\'s projects', () => {
  const view = render(<PortfolioBrowser />);
  const tabs = within(screen.getByRole('tablist', { name: 'Work categories' })).getAllByRole('tab');
  expect(tabs.map(tab => tab.textContent)).toEqual(['Animation', 'Technical Animation']);
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByRole('tab', { name: /all work/i })).not.toBeInTheDocument();
  expect(navigation.some(item => /about/i.test(item.label))).toBe(false);
  expect(shownTopics()).toEqual(['01Interactions']);
  expect(topicRow('Interactions')).toHaveAttribute('aria-expanded', 'true');
  expect(shownProjects()).toEqual(['8-Directional Chair State Animations', 'Vehicular Interaction Animations']);
  expect(row('8-Directional Chair State Animations')).toHaveAttribute('aria-pressed', 'true');
  // A row names its project only, with no topic path.
  expect(screen.queryByText('Animation / Interactions', { selector: '.work-row *' })).toBeNull();
  fireEvent.click(tabs[1]);
  expect(window.location.hash).toBe('#/technical-animation');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" />);
  handOver();
  expect(shownTopics().map(item => item.slice(2))).toEqual(['Animation Systems', 'Automation', 'Optimization and Profiling', 'Physical Systems', 'Procedural Systems', 'Downloads']);
  expect(topicRow('Animation Systems')).toHaveAttribute('aria-expanded', 'true');
  expect(topicRow('Procedural Systems')).toHaveAttribute('aria-expanded', 'false');
  expect(shownProjects()).toEqual(['Parametric Point Cloud Blend Space']);
  expect(screen.getByRole('tab', { name: 'Technical Animation' })).toHaveAttribute('aria-selected', 'true');
});

test('clicking a row previews it in place, and View opens that exact entry from the card', () => {
  const open = jest.fn();
  render(<PortfolioBrowser categoryId="animation" onOpen={open} />);
  fireEvent.click(row('Vehicular Interaction Animations'));
  expect(window.location.hash).toBe('');
  expect(row('Vehicular Interaction Animations')).toHaveAttribute('aria-pressed', 'true');
  expect(row('8-Directional Chair State Animations')).toHaveAttribute('aria-pressed', 'false');
  const card = screen.getByRole('region', { name: 'Vehicular Interaction Animations preview' });
  expect(card).toHaveAttribute('data-project-id', 'interactions-vehicular-interaction-animations');
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
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="optimization-and-profiling-profiling-animation-graphs" />);
  handOver();
  expect(document.querySelector('.work-preview video').getAttribute('src')).toContain('2026-03-01-18-18-26');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="automation-phase-and-footsteps-foot-contact-and-phase-automation" />);
  fadeOut();
  expect(within(screen.getByRole('region', { name: /preview/ })).getByRole('img', { name: 'Screenshot 2026-02-19 215431' })).toBeInTheDocument();
  // A project of several pages previews the first video found across them, even on a later page.
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="procedural-systems-lookat-concept-and-introduction" />);
  fadeOut();
  expect(document.querySelector('.work-preview-layer:last-child video').getAttribute('src')).toContain('2026-01-26-05-59-20');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="procedural-animation-toolkit" />);
  fadeOut();
  const card = screen.getByRole('region', { name: 'Procedural Animation Toolkit preview' });
  expect(card.querySelector('.work-preview-stage')).toHaveClass('is-empty');
  expect(card.querySelector('.work-preview-layer')).toBeNull();
  expect(card).not.toHaveTextContent('Look-At Solver');
  expect(within(card).getByRole('button', { name: 'View' })).toBeInTheDocument();
});

test('the media area takes the shape of the media it shows, and remembers it', () => {
  const view = render(<PortfolioBrowser categoryId="technical-animation" entryId="automation-phase-and-footsteps-foot-contact-and-phase-automation" />);
  const stage = () => document.querySelector('.work-preview-stage');
  const strip = screen.getByRole('img', { name: 'Screenshot 2026-02-19 215431' });
  expect(stage().style.getPropertyValue('--media-ratio')).toBe(String(16 / 9));
  Object.defineProperty(strip, 'naturalWidth', { value: 1187 });
  Object.defineProperty(strip, 'naturalHeight', { value: 98 });
  fireEvent.load(strip);
  expect(parseFloat(stage().style.getPropertyValue('--media-ratio'))).toBeCloseTo(1187 / 98);
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="procedural-systems-lookat-documentation-state-machine-setup" />);
  fadeOut();
  // Until the new media reports its size, the area keeps its present shape instead of snapping.
  expect(parseFloat(stage().style.getPropertyValue('--media-ratio'))).toBeCloseTo(1187 / 98);
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="automation-phase-and-footsteps-foot-contact-and-phase-automation" />);
  fadeOut();
  expect(parseFloat(stage().style.getPropertyValue('--media-ratio'))).toBeCloseTo(1187 / 98);
});

test('switching projects crossfades the card instead of cutting to the next one', () => {
  render(<PortfolioBrowser categoryId="animation" />);
  const card = screen.getByRole('region', { name: '8-Directional Chair State Animations preview' });
  fireEvent.click(row('Vehicular Interaction Animations'));
  // The same card stays on screen, holding the outgoing media and title while the new ones arrive.
  expect(screen.getByRole('region', { name: 'Vehicular Interaction Animations preview' })).toBe(card);
  expect(card.querySelectorAll('.work-preview-layer')).toHaveLength(2);
  expect(card.querySelector('.work-preview-label.is-leaving')).toHaveTextContent('8-Directional Chair State Animations');
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
  expect(screen.getByRole('region', { name: '8-Directional Chair State Animations preview' })).toBeInTheDocument();
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
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="physical-systems-physia-procedural-active-ragdoll-framework" />);
  handOver();
  expect(document.querySelector('.work-preview iframe').getAttribute('src')).toContain('autoplay=0');
});

test('a YouTube video in a note previews as a muted, looping autoplay that takes no input', () => {
  render(<PortfolioBrowser categoryId="technical-animation" entryId="physical-systems-physia-procedural-active-ragdoll-framework" />);
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

test('a routed page opens its topic and previews its project, kept after the route returns to its topic and remembered per category', () => {
  const view = render(<PortfolioBrowser categoryId="technical-animation" subcategoryId="procedural-systems" entryId="procedural-systems-lookat-showcase" />);
  expect(topicRow('Procedural Systems')).toHaveAttribute('aria-expanded', 'true');
  expect(row('LookAt')).toHaveAttribute('aria-pressed', 'true');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" subcategoryId="procedural-systems" />);
  handOver();
  expect(row('LookAt')).toHaveAttribute('aria-pressed', 'true');
  view.rerender(<PortfolioBrowser categoryId="animation" />);
  handOver();
  expect(row('8-Directional Chair State Animations')).toHaveAttribute('aria-pressed', 'true');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" />);
  handOver();
  expect(topicRow('Procedural Systems')).toHaveAttribute('aria-expanded', 'true');
  expect(row('LookAt')).toHaveAttribute('aria-pressed', 'true');
  view.unmount();
  render(<PortfolioBrowser categoryId="technical-animation" subcategoryId="automation" />);
  expect(topicRow('Automation')).toHaveAttribute('aria-expanded', 'true');
  expect(row('Foot Contact and Phase Automation')).toHaveAttribute('aria-pressed', 'true');
});

test('a topic unfolds its projects and previews the first, while the topic it replaces folds away', () => {
  render(<PortfolioBrowser categoryId="technical-animation" />);
  const first = topicRow('Animation Systems').closest('li');
  fireEvent.click(topicRow('Procedural Systems'));
  expect(window.location.hash).toBe('');
  expect(topicRow('Procedural Systems')).toHaveAttribute('aria-expanded', 'true');
  expect(topicRow('Animation Systems')).toHaveAttribute('aria-expanded', 'false');
  // The four LookAt notes are one project, named by their folder.
  expect(row('LookAt')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('button', { name: /Getting Started|Showcase/ })).toBeNull();
  expect(screen.getByRole('region', { name: 'LookAt preview' })).toHaveAttribute('data-project-id', 'procedural-systems--lookat');
  // The old topic's projects fold shut and take no input before they are removed.
  const closing = first.querySelector('.work-topic-projects');
  expect(closing).toHaveClass('is-closing');
  expect(closing).toHaveAttribute('inert');
  // The new fold clips its rows only while it opens.
  const opening = topicRow('Procedural Systems').closest('li').querySelector('.work-topic-projects');
  expect(opening).not.toHaveClass('is-settled');
  fadeOut();
  expect(first.querySelector('.work-topic-projects')).toBeNull();
  expect(opening).toHaveClass('is-settled');
  // Clicking the open topic again leaves it open, with its selection as it was.
  fireEvent.click(topicRow('Procedural Systems'));
  expect(topicRow('Procedural Systems')).toHaveAttribute('aria-expanded', 'true');
  expect(row('LookAt')).toHaveAttribute('aria-pressed', 'true');
});

test('View opens a project of several pages on its first page', () => {
  render(<PortfolioBrowser categoryId="technical-animation" subcategoryId="procedural-systems" />);
  fireEvent.click(within(screen.getByRole('region', { name: 'LookAt preview' })).getByRole('button', { name: 'View' }));
  expect(window.location.hash).toBe('#/technical-animation/procedural-systems/procedural-systems-lookat-concept-and-introduction');
});

test('arrow keys move through the rows, previewing projects but leaving topics shut, and across the category tabs', () => {
  render(<PortfolioBrowser categoryId="technical-animation" />);
  topicRow('Animation Systems').focus();
  fireEvent.keyDown(topicRow('Animation Systems'), { key: 'ArrowDown' });
  expect(row('Parametric Point Cloud Blend Space')).toHaveFocus();
  fireEvent.keyDown(row('Parametric Point Cloud Blend Space'), { key: 'ArrowDown' });
  expect(topicRow('Automation')).toHaveFocus();
  expect(topicRow('Automation')).toHaveAttribute('aria-expanded', 'false');
  expect(row('Parametric Point Cloud Blend Space')).toHaveAttribute('aria-pressed', 'true');
  cleanup();
  render(<PortfolioBrowser categoryId="animation" />);
  row('8-Directional Chair State Animations').focus();
  fireEvent.keyDown(row('8-Directional Chair State Animations'), { key: 'ArrowDown' });
  expect(row('Vehicular Interaction Animations')).toHaveFocus();
  expect(row('Vehicular Interaction Animations')).toHaveAttribute('aria-pressed', 'true');
  fireEvent.keyDown(row('Vehicular Interaction Animations'), { key: 'ArrowDown' });
  expect(row('Vehicular Interaction Animations')).toHaveFocus();
  fireEvent.keyDown(row('Vehicular Interaction Animations'), { key: 'Home' });
  expect(topicRow('Interactions')).toHaveFocus();
  expect(row('Vehicular Interaction Animations')).toHaveAttribute('aria-pressed', 'true');
  const tab = screen.getByRole('tab', { name: 'Animation' });
  tab.focus();
  fireEvent.keyDown(tab, { key: 'ArrowRight' });
  expect(window.location.hash).toBe('#/technical-animation');
  expect(screen.getByRole('tab', { name: 'Technical Animation' })).toHaveFocus();
});

test('portrait phones open the selected row in place with its preview', () => {
  window.matchMedia = query => ({ matches: query === stacked });
  render(<PortfolioBrowser categoryId="animation" />);
  const first = row('8-Directional Chair State Animations').closest('li');
  expect(within(first).getByRole('region', { name: '8-Directional Chair State Animations preview' })).toBeInTheDocument();
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
  // Opening another topic opens its first project in place too.
  cleanup();
  render(<PortfolioBrowser categoryId="technical-animation" />);
  fireEvent.click(topicRow('Physical Systems'));
  const physia = row('Physia').closest('li');
  expect(within(physia).getByRole('region', { name: /^Physia .* preview$/ })).toBeInTheDocument();
});

// npm start runs under StrictMode, which mounts every effect twice; selection must still work there.
test('a click selects a row under StrictMode, and hovering a row never changes the selection', () => {
  render(<StrictMode><PortfolioBrowser categoryId="animation" /></StrictMode>);
  fireEvent.mouseEnter(row('Vehicular Interaction Animations'));
  fireEvent.mouseMove(row('Vehicular Interaction Animations'), { clientX: 20, clientY: 30 });
  expect(row('8-Directional Chair State Animations')).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(row('Vehicular Interaction Animations'));
  expect(row('Vehicular Interaction Animations')).toHaveAttribute('aria-pressed', 'true');
  expect(row('8-Directional Chair State Animations')).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('region', { name: 'Vehicular Interaction Animations preview' })).toBeInTheDocument();
});
