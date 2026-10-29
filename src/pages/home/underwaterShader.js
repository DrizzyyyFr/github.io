export const underwaterShader = `
vec2 uwCaustics(vec2 p, float footprint) {
  float drift = u_time * .22;
  vec2 q = p * .92;
  q += .36 * vec2(sin(q.y * .71 + drift * .6), cos(q.x * .63 - drift * .5));
  vec4 phase = vec4(dot(q, vec2(1.45, .45)), dot(q, vec2(-.70, 1.60)),
                    dot(q, vec2(1.25, 1.40)), dot(q, vec2(-1.80, .65)));
  phase += drift * vec4(.83, -.67, 1.13, -.91) + vec4(.0, 1.7, 3.1, .8);
  vec4 curvature = sin(phase) * vec4(.46, .32, .20, .16);
  float xx = 1.0 - dot(curvature, vec4(2.1025, .49, 1.5625, 3.24));
  float yy = 1.0 - dot(curvature, vec4(.2025, 2.56, 1.96, .4225));
  float xy = -dot(curvature, vec4(.6525, -1.12, 1.75, -1.17));
  float focus = abs(xx * yy - xy * xy) / (.75 + .25 * (abs(xx) + abs(yy)));
  float variation = .5 + .5 * sin(q.x * .68 + .8 * sin(q.y * .54) + drift * .7);
  float width = .065 + variation * .045 + footprint * 1.1;
  float seamDistance = focus / width;
  float seam = exp(-seamDistance * seamDistance);
  float glow = exp(-seamDistance * seamDistance * .12);
  float continuity = mix(.12, 1.0, smoothstep(.18, .72, variation));
  return vec2(seam * continuity, glow * .8) * (.55 + .45 * variation);
}

float uwCeilingTop() {
  return clamp(-.08 + 1.16 * u_submerge, .0, 1.0);
}

float uwCeilingSpan(float top) {
  return mix(.10, .34, smoothstep(.0, .90, top));
}

vec3 uwNoiseGradient(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 derivative = 6.0 * f * (1.0 - f);
  float a = oceanHash(cell);
  float b = oceanHash(cell + vec2(1.0, .0));
  float c = oceanHash(cell + vec2(.0, 1.0));
  float d = oceanHash(cell + vec2(1.0));
  float crossTerm = a - b - c + d;
  return vec3(a + (b - a) * u.x + (c - a) * u.y + crossTerm * u.x * u.y,
    derivative.x * (b - a + crossTerm * u.y),
    derivative.y * (c - a + crossTerm * u.x));
}

float uwLightPool(vec2 uv, float aspect, float sourceX, float sourceY) {
  float depth = max(sourceY - uv.y, .0);
  float offset = (uv.x - sourceX) * aspect + depth * .38;
  float width = .36 + depth * .28;
  return exp(-offset * offset / (width * width));
}

vec3 uwLightRays(vec2 uv, float aspect, float sourceX, float sourceY) {
  float depth = sourceY - uv.y;
  if (depth <= 0.0) return vec3(0.0);
  float offset = (uv.x - sourceX) * aspect + depth * .38;
  float pool = uwLightPool(uv, aspect, sourceX, sourceY);
  float drift = u_time * .045;
  float broken = oceanNoise(vec2(offset * 22.0 + drift, 2.8 + u_time * .017));
  float fine = oceanNoise(vec2(offset * 47.0 - drift, 8.1 + u_time * .021));
  float strands = smoothstep(.36, .78, broken * .7 + fine * .3);
  float fade = exp(-depth * 1.4) * smoothstep(.0, .055, depth);
  vec3 light = mix(vec3(.39, .71, .79), vec3(.63, .76, .76), u_sunset * .3);
  return light * pool * (.055 + strands * .17) * fade;
}

vec3 uwSurface(vec2 uv, float aspect, float opening, vec3 waterColor) {
  float elevation = max(uv.y - .55, .025);
  float distance = .74 / elevation;
  float clarity = 1.0 - smoothstep(4.5, 11.0, distance);
  if (clarity < .001) return waterColor;
  vec2 plane = vec2((uv.x - .5) * aspect, 1.0) * distance * 4.2;
  mat2 rotate = mat2(.8, -.6, .6, .8);
  mat2 unrotate = mat2(.8, .6, -.6, .8);
  vec3 broad = uwNoiseGradient(plane + vec2(u_time * .045, -u_time * .12));
  vec3 small = uwNoiseGradient(rotate * plane * 1.93 + vec2(6.2, u_time * .09));
  float footprint = distance * distance * 6.0 / u_resolution.y;
  float fineFade = 1.0 - smoothstep(.12, .48, footprint);
  vec2 slope = broad.yz * .26 + unrotate * small.yz * (.21 * fineFade);
  vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 view = normalize(vec3((uv.x - .5) * aspect, elevation, 1.0));
  float grazing = pow(1.0 - max(dot(normal, view), .0), 3.0);
  vec3 sheet = mix(vec3(.18, .46, .58), vec3(.095, .34, .48), grazing);
  sheet += vec3(.035, .055, .055) * (broad.x - .5);

  float litSlope = dot(normal, normalize(vec3(-.5, .65, -.55)));
  float glint = smoothstep(.75, .96, litSlope) * smoothstep(.26, .70, small.x);
  sheet = mix(sheet, vec3(.45, .70, .75), glint * (.27 + opening * .4));
  vec2 windowUV = (uv - vec2(u_sunX, .91)) * vec2(aspect / .36, 1.0 / .12);
  windowUV += slope * vec2(.8, .65);
  float sunWindow = exp(-dot(windowUV, windowUV));
  float transmission = sunWindow * (.38 + broad.x * .23 + small.x * .18);
  sheet = mix(sheet, vec3(.68, .82, .80), transmission * .65);
  float ceilingFade = smoothstep(.61, .81, uv.y) * clarity;
  return mix(waterColor, sheet, ceilingFade);
}

vec3 renderUnderwater(vec2 uv, float aspect) {
  float sourceX = clamp(u_sunX, .55, .84);
  float ceilingTop = uwCeilingTop();
  float ceilingSpan = uwCeilingSpan(ceilingTop);
  float sourceY = ceilingTop - .20 * ceilingSpan;
  vec2 ceilingUV = vec2(uv.x, 1.0 - (ceilingTop - uv.y) * .45 / ceilingSpan);
  float lateral = (uv.x - .5) * aspect;
  float center = exp(-lateral * lateral * .6);
  vec3 deep = vec3(.040, .205, .34);
  vec3 shallow = vec3(.075, .38, .55);
  vec3 color = mix(deep, shallow, smoothstep(.32, 1.0, uv.y));
  color += vec3(.008, .025, .035) * center;

  float lightPool = uwLightPool(uv, aspect, sourceX, sourceY);
  color += vec3(.025, .085, .095) * lightPool * exp(-max(sourceY - uv.y, .0) * .65);
  vec2 openingUV = (uv - vec2(sourceX, sourceY))
    * vec2(aspect / .36, 1.0 / max(.04, ceilingSpan * .42));
  float opening = exp(-dot(openingUV, openingUV));
  color = mix(color, vec3(.40, .66, .73), opening * .32);

  if (ceilingUV.y > .56) {
    color = uwSurface(ceilingUV, aspect, opening, color);
  }

  if (uv.y < .36) {
    float below = max(.40 - uv.y, .02);
    float distance = 1.65 / below;
    vec2 p = vec2(lateral, .85) * distance;
    float clarity = exp(-distance * .065);
    float ripple = sin(p.y * 5.4 + .8 * sin(p.x * .68));
    float rippleLight = .5 + .5 * sin(p.y * 5.4 + .8 * sin(p.x * .68) + .6);
    vec3 floorColor = mix(vec3(.055, .26, .40), vec3(.21, .43, .56), clarity);
    floorColor += vec3(.04, .07, .075) * lightPool * clarity;
    floorColor += vec3(.018, .027, .030) * rippleLight * clarity;
    floorColor *= 1.0 + ripple * .025 * clarity;
    float detailFade = 1.0 - smoothstep(12.0, 24.0, distance);
    if (detailFade > .001) {
      float footprint = clamp(distance * distance * 1.9 / u_resolution.y, .0, .10);
      vec2 cells = uwCaustics(p * 3.4, footprint);
      float sunPool = lightPool;
      float illumination = .10 + .90 * sunPool;
      vec3 ribbon = mix(vec3(.51, .78, .85), vec3(.69, .80, .79), sunPool * .38);
      float nearSoftening = mix(.72, 1.0, smoothstep(4.0, 7.0, distance));
      floorColor = mix(floorColor, ribbon, cells.x * .26 * nearSoftening * illumination * detailFade);
      floorColor += vec3(.018, .036, .044) * cells.y * illumination * detailFade;
    }
    float floorFade = (1.0 - smoothstep(.16, .36, uv.y)) * exp(-max(distance - 8.0, 0.0) * .12);
    color = mix(color, floorColor, floorFade * smoothstep(.30, .72, ceilingTop));
  }

  color += uwLightRays(uv, aspect, sourceX, sourceY);
  return min(color, vec3(.87, .90, .91));
}
`;
