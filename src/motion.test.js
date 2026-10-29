import { solveIK, springStep, footPosition } from './motion';
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test.each([{ x: 150, y: 100 }, { x: 600, y: 300 }, { x: 0, y: 0 }, { x: 1, y: 0 }])('IK preserves lengths for reachable and clamped targets: %o', target => {
  const root = { x: 0, y: 0 };
  for (const lengths of [[140, 115], [100, 100], [70, 175]]) {
    for (const bend of [-1, 1]) {
      const result = solveIK(root, target, ...lengths, bend);
      expect(distance(root, result.joint)).toBeCloseTo(lengths[0], 6);
      expect(distance(result.joint, result.end)).toBeCloseTo(lengths[1], 6);
      if (result.reachable) expect(distance(result.end, target)).toBeCloseTo(0, 6);
    }
  }
});

test('bend selects opposite solutions', () => {
  const root = { x: 0, y: 0 }, target = { x: 100, y: 0 };
  expect(solveIK(root, target, 100, 100, 1).joint.y).toBeCloseTo(-solveIK(root, target, 100, 100, -1).joint.y);
});

test.each([1 / 30, 1 / 60, 1 / 144])('spring converges and remains finite across frame rates (%s)', dt => {
  let state = { x: 0, y: 0, vx: 0, vy: 0 };
  for (let time = 0; time < 10; time += dt) state = springStep(state, { x: 300, y: 150 }, 4, 0.35, dt);
  expect(state.x).toBeCloseTo(300, 3); expect(state.y).toBeCloseTo(150, 3);
});

test('foot trajectory is continuous, grounded in stance, and lifted in swing', () => {
  expect(footPosition(0.25, 140, 60).y).toBe(340);
  expect(footPosition(0.75, 140, 60).y).toBe(280);
  expect(distance(footPosition(0.5 - 1e-8, 140, 60), footPosition(0.5 + 1e-8, 140, 60))).toBeLessThan(0.001);
  expect(distance(footPosition(1 - 1e-8, 140, 60), footPosition(1e-8, 140, 60))).toBeLessThan(0.001);
});

test('gait keeps foot targets reachable at the maximum stride and lift', () => {
  for (let phase = 0; phase < 1; phase += 0.01) {
    const hip = { x: 320, y: 173 + Math.cos(phase * Math.PI * 4) * 5 };
    for (const offset of [0, 0.5]) {
      const foot = footPosition(phase + offset, 160, 90);
      expect(solveIK(hip, foot, 100, 100, 1).reachable).toBe(true);
    }
  }
});
