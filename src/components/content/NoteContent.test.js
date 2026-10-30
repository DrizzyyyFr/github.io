import { render } from '@testing-library/react';
import NoteContent from './NoteContent';

test('numbered steps keep their numbers, and bullets that follow make a list of their own', () => {
  const { container } = render(<NoteContent body={'1. Bind the pin\n2. Promote it\n- Fallbacks can be ignored'} />);
  expect([...container.querySelectorAll('ol > li')].map(item => item.textContent)).toEqual(['Bind the pin', 'Promote it']);
  expect([...container.querySelectorAll('ul > li')].map(item => item.textContent)).toEqual(['Fallbacks can be ignored']);
});

test('a slide deck\'s vertical breaks draw nothing, while its slide breaks stay dividers', () => {
  const { container } = render(<NoteContent body={'First\n--\nSecond\n\n---\n\nThird'} />);
  expect([...container.querySelectorAll('p')].map(item => item.textContent)).toEqual(['First', 'Second', 'Third']);
  expect(container.querySelectorAll('hr')).toHaveLength(1);
});
