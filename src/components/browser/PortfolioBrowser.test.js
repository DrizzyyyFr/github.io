import { fireEvent, render, screen, within } from '@testing-library/react';
import PortfolioBrowser from './PortfolioBrowser';
import { navigation } from '../../config/navigation';

const stacked = '(max-width: 850px) and (orientation: portrait)';
const row = name => screen.getByRole('button', { name: new RegExp(name) });

beforeEach(() => {
  window.matchMedia = () => ({ matches: false });
  window.history.replaceState(null, '', '/');
});

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
  expect(within(screen.getByRole('tabpanel')).getAllByRole('listitem')).toHaveLength(9);
  expect(row('Getting Started\\s*Technical Animation / Procedural Systems')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Technical Animation' })).toHaveAttribute('aria-selected', 'true');
});

test('clicking a row previews it in place, and View project opens that exact entry from the card', () => {
  const open = jest.fn();
  render(<PortfolioBrowser categoryId="animation" onOpen={open} />);
  fireEvent.click(row('Vehicular Interaction Animations'));
  expect(window.location.hash).toBe('');
  expect(row('Vehicular Interaction Animations')).toHaveAttribute('aria-pressed', 'true');
  expect(row('8 Directional Chair State Animations')).toHaveAttribute('aria-pressed', 'false');
  const card = screen.getByRole('region', { name: 'Vehicular Interaction Animations preview' });
  expect(card).toHaveAttribute('data-entry-id', 'interactions-vehicular-interaction-animations');
  expect(screen.queryByText(/preview(ing)?$/i)).not.toBeInTheDocument();
  fireEvent.click(within(card).getByRole('button', { name: /View project/ }));
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
  expect(document.querySelector('.work-preview video').getAttribute('src')).toContain('2026-03-01-18-18-26');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="procedural-systems-lookat-documentation-simple-state-machine" />);
  expect(within(screen.getByRole('region', { name: /preview/ })).getByRole('img', { name: 'Pasted image 20260301171057' })).toBeInTheDocument();
  view.rerender(<PortfolioBrowser categoryId="technical-animation" entryId="download" />);
  const card = screen.getByRole('region', { name: 'Download preview' });
  expect(card.querySelector('.work-preview-media')).toBeNull();
  expect(card).not.toHaveTextContent('Procedural Animation Toolkit');
  expect(within(card).getByRole('button', { name: /View project/ })).toBeInTheDocument();
});

test('reduced motion keeps the preview video still', () => {
  window.matchMedia = query => ({ matches: query === '(prefers-reduced-motion: reduce)' });
  render(<PortfolioBrowser categoryId="animation" />);
  const video = document.querySelector('.work-preview video');
  expect(video).not.toHaveAttribute('autoplay');
  expect(video).toHaveAttribute('preload', 'metadata');
});

test('a routed entry is previewed, kept after the route returns to its topic, and remembered per category', () => {
  const view = render(<PortfolioBrowser categoryId="technical-animation" subcategoryId="procedural-systems" entryId="procedural-systems-lookat-l-a-slides" />);
  expect(row('L-A Slides')).toHaveAttribute('aria-pressed', 'true');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" subcategoryId="procedural-systems" />);
  expect(row('L-A Slides')).toHaveAttribute('aria-pressed', 'true');
  view.rerender(<PortfolioBrowser categoryId="animation" />);
  expect(row('8 Directional Chair State Animations')).toHaveAttribute('aria-pressed', 'true');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" />);
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
  expect(screen.getAllByRole('region')).toHaveLength(1);
  expect(document.querySelector('.portfolio-browser')).toHaveClass('is-stacked');
});
