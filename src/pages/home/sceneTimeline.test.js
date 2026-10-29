import { sceneAt } from './sceneTimeline';

test('the distant horizon stays centered through sunrise, introduction, sunset and immersion', () => {
  for (let step = 0; step <= 100; step++) {
    expect(sceneAt(step / 100).horizon).toBe(.5);
  }
  expect(sceneAt(0).sunElevation).toBe(0);
  expect(sceneAt(1 / 3).sunElevation).toBe(1);
  expect(sceneAt(2 / 3).sunElevation).toBe(0);
  expect(sceneAt(1 / 3).introOpacity).toBe(1);
  expect(sceneAt(2 / 3).introOpacity).toBe(0);
});

test('immersion enters below the bottom and travels continuously above the top', () => {
  expect(sceneAt(.71).waterline).toBeLessThan(0);
  expect(sceneAt(.72).waterline).toBeLessThan(0);
  expect(sceneAt(.825).waterline).toBeCloseTo(.5);
  expect(sceneAt(.94).waterline).toBeGreaterThan(1);

  let previous = sceneAt(.70).waterline;
  for (let step = 701; step <= 960; step++) {
    const current = sceneAt(step / 1000).waterline;
    expect(current).toBeGreaterThanOrEqual(previous);
    expect(current - previous).toBeLessThan(.01);
    previous = current;
  }
});

test('the menu stays hidden until most of the viewport is submerged', () => {
  for (let step = 0; step <= 860; step++) {
    expect(sceneAt(step / 1000).navigation).toBe(0);
  }
  expect(sceneAt(.86).waterline).toBeGreaterThan(.7);
  expect(sceneAt(.92).navigation).toBeGreaterThan(0);
  expect(sceneAt(.97).navigation).toBe(1);
});
