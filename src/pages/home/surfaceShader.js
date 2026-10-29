import { waveProfilesShader } from './waveProfiles';

export const surfaceShader = `
${waveProfilesShader}
float paintStroke(float distance, float width, float pixel) {
  return 1.0 - smoothstep(width, width + pixel, abs(distance));
}

vec3 renderSurface(vec2 uv, float aspect, vec3 sun) {
  float depth = max(.5 - uv.y, 0.0);
  float x = (uv.x - .5) * aspect;
  float pixel = 1.4 / u_resolution.y;
  float near = smoothstep(.0, .60, depth);
  vec3 farBlue = mix(vec3(.30, .48, .61), vec3(.28, .57, .68), u_daylight);
  farBlue = mix(farBlue, vec3(.40, .43, .58), u_sunset * .58);
  vec3 blue = mix(vec3(.095, .36, .51), vec3(.10, .45, .59), u_daylight);
  vec3 cyan = mix(vec3(.29, .61, .70), vec3(.35, .72, .77), u_daylight);
  vec3 pearl = mix(vec3(.85, .91, .88), vec3(.91, .95, .90), u_daylight);
  vec3 gold = mix(vec3(.97, .71, .54), vec3(.97, .88, .71), u_daylight);
  vec3 color = mix(farBlue, blue, smoothstep(.005, .42, depth));

  // The quiet water between breakers is shaded with broad interleaving ripples.
  float perspective = 1.0 / max(depth + .035, .035);
  vec2 water = vec2(x, 1.1) * perspective;
  float wash = oceanNoise(water * vec2(.75, 1.5) + vec2(u_time * .04, -u_time * .11));
  float small = oceanNoise(water * vec2(3.0, 3.3) + vec2(0., -u_time * .18));
  color += vec3(.035, .055, .055) * (wash - .5) * (1.0 - near * .3);
  float ripplePhase = water.y * 8.0 + sin(water.x * 3.8 + u_time * .12) + u_time * .65;
  float ripple = smoothstep(.87, .99, sin(ripplePhase));
  float ripplePatch = smoothstep(.55, .77, oceanNoise(water * vec2(4.0, .9) + vec2(u_time * .03, 0.)));
  float rippleVisibility = smoothstep(.025, .09, depth) * .17;
  color = mix(color, cyan, ripple * ripplePatch * rippleVisibility);
  float sunOffset = (uv.x - u_sunX) * aspect;
  float reflectionWidth = .025 + depth * .45;
  float reflected = sunOffset / reflectionWidth;
  float sunPath = exp(-reflected * reflected);
  float flicker = smoothstep(.53, .78, wash * .65 + small * .35);
  color = mix(color, gold, sunPath * (.10 + flicker * .46));

  // Finite, overlapping curved breakers are composited from far to near.
  // A new front enters at zero size; the oldest leaves below the viewport.
  float travel = u_time * .060;
  float cycle = floor(travel);
  float advance = fract(travel);
  for (int i = 0; i < 9; i++) {
    float q = (float(i) + advance) / 8.0;
    float scale = q * q;
    float identity = float(i) - cycle;
    float row = .5 - scale * .82;
    if (q > .045 && row > -.35) {
      for (int j = 0; j < 2; j++) {
        WaveProfile profile = sampleWaveProfile(x, aspect, q, identity, float(j));
        float id = profile.id;
        float sx = profile.sx;
        float envelope = profile.envelope;
        float head = profile.head;
        float shoulder = profile.shoulder;
        float crest = profile.crest;
        float d = crest - uv.y;
        float faceHeight = profile.faceHeight;
        float v = d / max(faceHeight, .004);
        float area = envelope * smoothstep(-pixel, pixel, d)
          * (1.0 - smoothstep(.68, 1.60, v));
        float visibility = smoothstep(.07, .30, q);
        if (envelope > .005 && v > -.24 && v < 1.7) {
          float local = profile.local;
          float sheen = (.32 * shoulder + .68 * head) * (1.0 - smoothstep(.0, .75, v));
          vec3 face = mix(cyan, blue * .83, smoothstep(.03, 1.18, max(v, 0.0)));
          face += vec3(.04, .07, .065) * sheen;
          float foldOffset = (v - .39 - .08 * sin(sx * 3.1 + id)) / .19;
          float foldShadow = exp(-foldOffset * foldOffset) * head;
          face *= 1.0 - foldShadow * .16;
          float crossRipple = sin(local * 7.7 + v * 16.0 + id)
            * sin(local * 2.3 - v * 7.0 + id * .37);
          face += vec3(.018, .035, .038) * crossRipple * smoothstep(.08, .38, v)
            * (1.0 - smoothstep(.65, 1.4, v)) * smoothstep(.22, .65, q);
          face = mix(face, gold, sunPath * (.10 + sheen * .20));
          face = mix(farBlue, face, smoothstep(.08, .64, q));
          color = mix(color, face, area * visibility * .94);

          float breakPattern = .5 + .26 * sin(local * 4.7 + id)
            + .17 * sin(local * 9.3 - id * .7);
          float breaking = smoothstep(.24, .64, breakPattern) * envelope * (.32 + head * .68);
          float cap = .0006 + faceHeight * (.075 + .035 * sin(local * 12.0 + id));
          float scallop = cap * (.60 * sin(local * 17.0 + id)
            + .30 * sin(local * 31.0 + id * 2.3));
          float lip = paintStroke(d + scallop, cap, pixel);
          float shadow = paintStroke(d - cap * 2.7 + scallop, cap * .8, pixel);
          color = mix(color, blue * .72, shadow * breaking * visibility * .32);
          vec3 foamColor = mix(pearl, gold, sunPath * .38 + u_sunset * .12);
          color = mix(color, foamColor, lip * breaking * visibility);

          // A few positive tapered foam strokes trail down the wave face.
          float strokeBend = .27 + .12 * sin(local * 6.0 + id);
          float trail = paintStroke(v - strokeBend, .015 + q * .012, pixel / max(faceHeight, .004));
          float fragments = smoothstep(.57, .85, sin(local * 13.0 + .8 * sin(local * 4.1) + id));
          float brush = sin(local * 28.0 + .9 * sin(v * 19.0 + id))
            * sin(v * 37.0 + .8 * sin(local * 9.0 - id));
          float froth = smoothstep(.50, .82, brush) * (1.0 - smoothstep(.05, .42, v))
            * smoothstep(-.02, .08, v);
          float foam = (trail * fragments * .42 + froth * .45) * breaking * visibility;
          color = mix(color, foamColor, foam);
        }
      }
    }
  }

  vec3 horizonLight = atmosphere(normalize(vec3(x, 0.0, 1.0)), sun);
  return mix(color, horizonLight, exp(-depth * 180.0));
}
`;
