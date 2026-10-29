import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WheelPicker from './WheelPicker';

const items = Array.from({ length: 6 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }));
function ControlledPicker({ initial = 1 }) {
  const [selected, setSelected] = useState(initial);
  return <WheelPicker label="Category" items={items} selectedIndex={selected} onChange={setSelected} />;
}
beforeEach(() => {
  jest.useFakeTimers();
  window.matchMedia = () => ({ matches: false });
});
afterEach(() => jest.useRealTimers());
const wheel = deltaY => fireEvent.wheel(screen.getByRole('listbox'), { deltaY });
const selected = index => expect(screen.getByRole('option', { name: `Item ${index}` })).toHaveAttribute('aria-selected', 'true');

test('separate mouse notches are accepted while the previous movement is still settling', () => {
  render(<ControlledPicker />);
  wheel(120);
  selected(2);
  act(() => jest.advanceTimersByTime(40));
  wheel(120);
  selected(3);
  act(() => jest.advanceTimersByTime(40));
  wheel(120);
  selected(4);
});

test('direction changes respond immediately instead of waiting for a cooldown', () => {
  render(<ControlledPicker />);
  wheel(120);
  selected(2);
  act(() => jest.advanceTimersByTime(16));
  wheel(-30);
  selected(1);
});

test('a gentle first trackpad gesture accumulates intent even while its deltas decline', () => {
  render(<ControlledPicker />);
  wheel(8);
  selected(1);
  act(() => jest.advanceTimersByTime(16));
  wheel(7);
  selected(2);
  act(() => jest.advanceTimersByTime(16));
  wheel(6);
  selected(2);
});

test('a declining trackpad tail does not advance through more entries', () => {
  render(<ControlledPicker />);
  wheel(32);
  selected(2);
  for (const delta of [30, 28, 26, 24, 20, 17, 14, 11, 7, 4, 2]) {
    act(() => jest.advanceTimersByTime(16));
    wheel(delta);
  }
  selected(2);
  act(() => jest.advanceTimersByTime(120));
  wheel(14);
  selected(3);
});

test('sustained deliberate trackpad motion continues to navigate', () => {
  render(<ControlledPicker />);
  wheel(20);
  selected(2);
  for (let tick = 0; tick < 6; tick += 1) {
    act(() => jest.advanceTimersByTime(16));
    wheel(20);
  }
  selected(3);
});

test('the page receives outward wheel input immediately at the last item', () => {
  render(<ControlledPicker initial={4} />);
  wheel(120);
  selected(5);
  const event = new WheelEvent('wheel', { deltaY: 60, cancelable: true });
  fireEvent(screen.getByRole('listbox'), event);
  expect(event.defaultPrevented).toBe(false);
});
