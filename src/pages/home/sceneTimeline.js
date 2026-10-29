const clamp = value => Math.max(0, Math.min(1, value));
export const easeBetween = (value, start, end) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

export function sceneAt(progress) {
  const p = clamp(progress);
  const rise = easeBetween(p, .05, .28);
  const fall = easeBetween(p, .43, .65);
  const enter = easeBetween(p, .17, .28);
  const leave = easeBetween(p, .43, .56);
  const submerge = easeBetween(p, .71, .94);
  return {
    sunElevation: rise * (1 - fall),
    daylight: rise * (1 - fall),
    sunset: fall,
    sunX: .72 + .06 * easeBetween(p, .43, .65),
    horizon: .5,
    waterline: -.08 + 1.16 * submerge,
    submerge,
    introOpacity: enter * (1 - leave),
    introOffset: -18 * (1 - enter + leave),
    navigation: easeBetween(p, .86, .97),
    cueOpacity: 1 - easeBetween(p, .10, .20),
  };
}
