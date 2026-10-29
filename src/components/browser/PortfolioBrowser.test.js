import { act, fireEvent, render, screen, within } from '@testing-library/react';
import PortfolioBrowser from './PortfolioBrowser';
import WheelPicker from './WheelPicker';
import { navigation, resolvePage } from '../../config/navigation';

beforeEach(() => {
  window.matchMedia = () => ({ matches: false });
  window.history.replaceState(null, '', '/');
  jest.useFakeTimers();
});
afterEach(() => { jest.useRealTimers(); });

test('navigation starts with categories and progressively reveals clicked branches', () => {
  const view = render(<PortfolioBrowser />);
  expect(screen.getAllByRole('listbox')).toHaveLength(1);
  expect(within(screen.getByRole('listbox', { name: 'Category' })).getAllByRole('option')).toHaveLength(2);
  expect(screen.queryByRole('option', { name: /about/i })).not.toBeInTheDocument();
  expect(navigation.some(item => /about/i.test(item.label))).toBe(false);
  fireEvent.click(screen.getByRole('option', { name: 'Animation', exact: true }));
  expect(window.location.hash).toBe('#/animation');
  view.rerender(<PortfolioBrowser categoryId="animation" />);
  act(() => jest.advanceTimersByTime(180));
  expect(screen.getAllByRole('listbox')).toHaveLength(2);
  fireEvent.click(screen.getByRole('option', { name: 'Interactions' }));
  expect(window.location.hash).toBe('#/animation/interactions');
  view.rerender(<PortfolioBrowser categoryId="animation" subcategoryId="interactions" />);
  act(() => jest.advanceTimersByTime(180));
  expect(screen.getAllByRole('listbox')).toHaveLength(3);
  expect(screen.queryByText('Explore entry')).not.toBeInTheDocument();
});

test('changing category fades out the old family before replacing subcategories and entries', () => {
  const view = render(<PortfolioBrowser categoryId="animation" subcategoryId="interactions" />);
  view.rerender(<PortfolioBrowser categoryId="technical-animation" />);
  expect(document.querySelectorAll('.is-leaving')).toHaveLength(2);
  expect(screen.getByRole('option', { name: 'Interactions' })).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(180));
  expect(within(screen.getByRole('listbox', { name: 'Subcategory' })).getByRole('option', { name: 'Animation Systems' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /8 Directional Chair/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('listbox', { name: 'Entry' })).not.toBeInTheDocument();
});

test('rapid category reversal cancels the stale family replacement', () => {
  const view = render(<PortfolioBrowser categoryId="animation" subcategoryId="interactions" />);
  view.rerender(<PortfolioBrowser categoryId="technical-animation" />);
  act(() => jest.advanceTimersByTime(80));
  view.rerender(<PortfolioBrowser categoryId="animation" subcategoryId="interactions" />);
  act(() => jest.advanceTimersByTime(900));
  expect(screen.getByRole('option', { name: /8 Directional Chair/ })).toBeInTheDocument();
  expect(document.querySelector('.is-leaving')).not.toBeInTheDocument();
});

test('clicking the final shard opens its exact entry from that element', () => {
  const open = jest.fn();
  const view = render(<PortfolioBrowser categoryId="animation" subcategoryId="interactions" onOpen={open} />);
  const shard = screen.getByRole('option', { name: 'Vehicular Interaction Animations' });
  fireEvent.click(shard);
  expect(open).toHaveBeenCalledWith(shard);
  expect(window.location.hash).toBe('#/animation/interactions/interactions-vehicular-interaction-animations');
  view.rerender(<PortfolioBrowser categoryId="technical-animation" subcategoryId="procedural-systems" />);
  act(() => jest.advanceTimersByTime(180));
  expect(within(screen.getByRole('listbox', { name: 'Entry' })).getAllByRole('option')).toHaveLength(4);
  view.rerender(<PortfolioBrowser categoryId="technical-animation" subcategoryId="downloads" />);
  act(() => jest.advanceTimersByTime(180));
  expect(within(screen.getByRole('listbox', { name: 'Entry' })).getAllByRole('option')).toHaveLength(1);
  expect(screen.getByRole('option', { name: 'Download' })).toBeInTheDocument();
});

test('mobile stages slide forward on activation and the trail returns to a parent', () => {
  window.matchMedia = query => ({ matches: query === '(max-width: 850px)' });
  const view = render(<PortfolioBrowser />);
  fireEvent.click(screen.getByRole('option', { name: 'Animation', exact: true }));
  view.rerender(<PortfolioBrowser categoryId="animation" />);
  act(() => jest.advanceTimersByTime(180));
  act(() => jest.advanceTimersByTime(650));
  expect(document.querySelector('.browser-columns').style.getPropertyValue('--mobile-step')).toBe('1');
  expect(screen.getByRole('listbox', { name: 'Subcategory' })).toHaveFocus();
  expect(document.querySelector('.browser-column')).toHaveAttribute('inert');
  fireEvent.click(screen.getByRole('button', { name: '01 Animation' }));
  act(() => jest.advanceTimersByTime(800));
  expect(document.querySelector('.browser-columns').style.getPropertyValue('--mobile-step')).toBe('0');
  expect(screen.getByRole('listbox', { name: 'Category' })).toHaveFocus();
});

test('Enter activates the selected entry directly', () => {
  const open = jest.fn();
  render(<WheelPicker label="Entry" variant="entry" items={[{id: 'entry', title: 'My entry'}]} onChange={() => {}} onActivate={open} />);
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Enter' });
  expect(open).toHaveBeenCalledWith(0, screen.getByRole('option', { name: 'My entry' }));
});

const items = [{ id: 'a', label: 'First' }, { id: 'b', label: 'Second' }, { id: 'c', label: 'Third' }];
test('depth motion retains item nodes and glides through intermediate positions', () => {
  const change = jest.fn();
  const view = render(<WheelPicker label="Category" items={items} selectedIndex={0} onChange={change} />);
  const first = screen.getByRole('option', { name: 'First' });
  const initial = first.style.transform;
  view.rerender(<WheelPicker label="Category" items={items} selectedIndex={1} onChange={change} />);
  expect(screen.getByRole('option', { name: 'First' })).toBe(first);
  expect(first.style.transform).toBe(initial);
  act(() => jest.advanceTimersByTime(120));
  const intermediate = first.style.transform;
  expect(intermediate).not.toBe(initial);
  view.rerender(<WheelPicker label="Category" items={items} selectedIndex={0} onChange={change} />);
  expect(first.style.transform).toBe(intermediate);
  act(() => jest.advanceTimersByTime(1600));
  expect(first.style.transform).toBe(initial);
});

test('wheel input throttles inertia, preserves zoom, and releases page scroll at boundaries', () => {
  const change = jest.fn();
  render(<WheelPicker label="Category" items={items} selectedIndex={0} onChange={change} />);
  const list = screen.getByRole('listbox', { name: 'Category' });
  const boundary = new WheelEvent('wheel', { deltaY: -120, cancelable: true });
  fireEvent(list, boundary);
  expect(boundary.defaultPrevented).toBe(false);
  const event = new WheelEvent('wheel', { deltaY: 120, cancelable: true });
  fireEvent(list, event);
  expect(event.defaultPrevented).toBe(true);
  expect(change).toHaveBeenCalledWith(1);
  fireEvent.wheel(list, { deltaY: 120 });
  expect(change).toHaveBeenCalledTimes(1);
  const zoom = new WheelEvent('wheel', { deltaY: 120, ctrlKey: true, cancelable: true });
  fireEvent(list, zoom);
  expect(zoom.defaultPrevented).toBe(false);
  fireEvent.keyDown(list, { key: 'End' });
  expect(change).toHaveBeenLastCalledWith(2);
  fireEvent.keyDown(list, { key: 'ArrowUp' });
  expect(change).toHaveBeenLastCalledWith(0);
});

test('reduced motion jumps directly to the final depth position', () => {
  window.matchMedia = () => ({ matches: true });
  const view = render(<WheelPicker label="Category" items={items} selectedIndex={0} onChange={() => {}} />);
  view.rerender(<WheelPicker label="Category" items={items} selectedIndex={1} onChange={() => {}} />);
  expect(screen.getByRole('option', { name: 'Second' }).style.transform).toContain('translateZ(24px)');
});

test('entry URLs resolve the original content and invalid paths fall back safely', () => {
  const route = resolvePage('#/animation/interactions/interactions-8-directional-chair-state-animations');
  expect(route.entry.body).toContain('Chair_InEngine.mp4');
  expect(resolvePage('#/missing/topic').entry).toBeUndefined();
});
