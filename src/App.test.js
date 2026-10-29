import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  window.matchMedia = () => ({ matches: true });
  global.IntersectionObserver = class { observe() {} disconnect() {} };
});

test('switching experiments exposes the appropriate adjustable parameters', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /a little code/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /02.*spring dynamics/i }));
  expect(screen.getByRole('slider', { name: /frequency/i })).toBeInTheDocument();
  expect(screen.queryByRole('slider', { name: /upper bone/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /03.*procedural locomotion/i }));
  expect(screen.getByRole('slider', { name: /stride/i })).toBeInTheDocument();
  expect(window.location.search).toContain('demo=gait');
});

test('reset restores parameters and reduced-motion visitors start paused', () => {
  window.history.replaceState({}, '', '/?demo=ik');
  render(<App />);
  expect(screen.getByRole('button', { name: 'Play simulation' })).toBeInTheDocument();
  const upper = screen.getByRole('slider', { name: /upper bone/i });
  fireEvent.change(upper, { target: { value: '170' } });
  expect(upper).toHaveValue('170');
  fireEvent.click(screen.getByRole('button', { name: /reset/i }));
  expect(upper).toHaveValue('140');
});
