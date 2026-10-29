export const waveProfilesShader = `
struct WaveProfile {
  float id;
  float seed;
  float other;
  float sx;
  float envelope;
  float head;
  float shoulder;
  float crest;
  float faceHeight;
  float local;
};

WaveProfile sampleWaveProfile(float x, float aspect, float q, float identity, float lane) {
  float scale = q * q;
  float row = .5 - scale * .82;
  float id = identity * 3.7 + lane * 17.3;
  float seed = oceanHash(vec2(id, 8.2));
  float other = oceanHash(vec2(id, 33.8));
  float center = (lane * .80 - .40 + (seed - .5) * .55) * max(aspect, 1.0);
  float width = (.34 + other * .46) * (.56 + q * .76);
  float sx = (x - center) / width;
  float sx2 = sx * sx;
  float envelope = exp(-sx2 * sx2 * 1.5);
  float height = (q * .003 + scale * .17) * (.65 + seed * .55);
  float lean = (seed - .5) * 1.1;
  float headOffset = sx - lean;
  float head = exp(-headOffset * headOffset * 5.5);
  float shoulder = exp(-(sx + lean * .65) * (sx + lean * .65) * 1.4);
  float curl = .09 * sin(sx * 3.0 + seed * 5.0 + u_time * .16);
  float crest = row + height * (envelope * (.36 * shoulder + .52 * head + curl) - .10)
    + sx * scale * (other - .5) * .045;
  float faceHeight = height * (.62 + .45 * head);
  float local = (x - center) / max(q, .13);
  return WaveProfile(id, seed, other, sx, envelope, head, shoulder, crest, faceHeight, local);
}
`;
