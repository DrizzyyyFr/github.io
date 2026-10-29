// Framework-independent motion functions shared by the interactive studies.
export function solveIK(root, target, upper, lower, bend = 1) {
  const dx = target.x - root.x, dy = target.y - root.y;
  const distance = Math.hypot(dx, dy);
  const minimum = Math.abs(upper - lower), maximum = upper + lower;
  const reach = Math.max(minimum, Math.min(maximum, distance));
  const direction = Math.atan2(dy, dx);
  // At a coincident target with equal lengths, choose a deterministic folded pose.
  const cosine = reach < 1e-8 ? 0 : (upper * upper + reach * reach - lower * lower) / (2 * upper * reach);
  const angle = direction - bend * Math.acos(Math.max(-1, Math.min(1, cosine)));
  return {
    joint: { x: root.x + Math.cos(angle) * upper, y: root.y + Math.sin(angle) * upper },
    end: { x: root.x + Math.cos(direction) * reach, y: root.y + Math.sin(direction) * reach },
    reachable: distance >= minimum - 1e-8 && distance <= maximum + 1e-8,
  };
}

export function springStep(state, target, frequency, damping, dt) {
  const result = { x: state.x, y: state.y, vx: state.vx, vy: state.vy };
  const omega = 2 * Math.PI * frequency;
  const count = Math.max(1, Math.ceil(dt / (1 / 240)));
  const step = dt / count;
  for (let i = 0; i < count; i++) {
    result.vx += (omega * omega * (target.x - result.x) - 2 * damping * omega * result.vx) * step;
    result.vy += (omega * omega * (target.y - result.y) - 2 * damping * omega * result.vy) * step;
    result.x += result.vx * step; result.y += result.vy * step;
  }
  return result;
}

export function footPosition(phase, stride, lift) {
  const p = ((phase % 1) + 1) % 1;
  // Stance travels backwards on the ground; swing returns forwards in an arc.
  if (p < 0.5) return { x: 320 + stride / 2 - p * 2 * stride, y: 340 };
  const swing = (p - 0.5) * 2;
  return { x: 320 - stride / 2 + swing * stride, y: 340 - Math.sin(swing * Math.PI) * lift };
}
