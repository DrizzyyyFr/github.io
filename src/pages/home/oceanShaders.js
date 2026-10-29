import { surfaceShader } from './surfaceShader';
import { underwaterShader } from './underwaterShader';

export const oceanVertexShader = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const oceanFragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_elevation;
uniform float u_daylight;
uniform float u_sunset;
uniform float u_submerge;
uniform float u_horizon;
uniform float u_sunX;

const float PI = 3.14159265359;

float oceanHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float oceanNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(oceanHash(cell), oceanHash(cell + vec2(1., 0.)), f.x),
    mix(oceanHash(cell + vec2(0., 1.)), oceanHash(cell + vec2(1.)), f.x), f.y);
}
float cloudShape(vec2 p) {
  return oceanNoise(p) * .57 + oceanNoise(p * 2.03 + 6.7) * .28
    + oceanNoise(p * 4.13 + 3.1) * .15;
}

vec3 sunDirection(float aspect) {
  return normalize(vec3((u_sunX - .5) * aspect, .035 + u_elevation * .285, 1.0));
}

vec3 sunlight() {
  return mix(vec3(1.0, .62, .32), vec3(1.0, .91, .69), u_daylight);
}

vec3 atmosphere(vec3 ray, vec3 sun) {
  float height = max(ray.y, 0.0);
  vec3 zenith = mix(vec3(.24, .35, .58), vec3(.16, .46, .71), u_daylight);
  zenith = mix(zenith, vec3(.29, .27, .48), u_sunset);
  vec3 horizon = mix(vec3(.94, .65, .55), vec3(.64, .81, .86), u_daylight);
  horizon = mix(horizon, vec3(.96, .55, .42), u_sunset);
  vec3 color = mix(zenith, horizon, exp(-height * 5.8));
  float halo = exp(-length(ray - sun) * 5.5);
  return color + sunlight() * halo * mix(.14, .07, u_daylight);
}

vec3 solarColor(float vertical) {
  return mix(vec3(1.0, .70, .48), vec3(1.0, .94, .76), clamp(vertical, 0.0, 1.0));
}

vec3 sky(vec2 uv, vec3 ray, vec3 sun) {
  vec2 sunPosition = vec2(u_sunX, .5 + .035 + u_elevation * .285);
  float distanceToSun = length((uv - sunPosition) * vec2(u_resolution.x / u_resolution.y, 1.0));
  float solarRadius = mix(.060, .042, u_elevation);
  float edge = max(1.2 / u_resolution.y, .0007);
  float disc = 1.0 - smoothstep(solarRadius - edge, solarRadius + edge, distanceToSun);
  float vertical = (uv.y - sunPosition.y + solarRadius) / (solarRadius * 2.0);
  vec3 color = mix(atmosphere(ray, sun), solarColor(vertical), disc);
  vec2 cloudUV = vec2((uv.x - .5) * u_resolution.x / u_resolution.y, uv.y - .5);
  cloudUV = cloudUV * vec2(2.1, 7.0) + vec2(u_time * .007, .8);
  float cloud = cloudShape(cloudUV);
  float coverage = smoothstep(.53, .71, cloud) * smoothstep(.52, .61, uv.y);
  float sunClearing = smoothstep(.08, .26, distanceToSun);
  coverage *= .72 + sunClearing * .28;
  vec3 cloudShade = mix(vec3(.56, .57, .70), vec3(.60, .76, .83), u_daylight);
  cloudShade = mix(cloudShade, vec3(.64, .44, .57), u_sunset * .55);
  vec3 cloudLight = mix(vec3(.98, .79, .66), vec3(.94, .91, .80), u_daylight);
  float contour = (1.0 - smoothstep(.55, .69, cloud)) * .65 + .25;
  return mix(color, mix(cloudShade, cloudLight, contour), coverage * .74);
}


${surfaceShader}
${underwaterShader}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec3 sun = sunDirection(aspect);
  float waterline = -.08 + 1.16 * u_submerge;
  float push = max(waterline, 0.0) * .62;
  vec2 surfaceUV = vec2(uv.x, uv.y - push);
  vec3 ray = normalize(vec3((uv.x - .5) * aspect, surfaceUV.y - .5, 1.0));
  vec3 color;

  if (u_submerge > .995) {
    color = renderUnderwater(uv, aspect);
  } else {
    float envelope = sin(u_submerge * PI);
    float boundary = waterline;
    if (u_submerge > .001 && abs(uv.y - waterline) < envelope * .05 + .004) {
      float waveX = (uv.x - .5) * aspect;
      WaveProfile leftFront = sampleWaveProfile(waveX, aspect, .8, 3.0, 0.0);
      WaveProfile rightFront = sampleWaveProfile(waveX, aspect, .8, 3.0, 1.0);
      float leftShape = (leftFront.crest + .0248) * leftFront.envelope;
      float rightShape = (rightFront.crest + .0248) * rightFront.envelope;
      float wave = clamp(max(leftShape, rightShape) * .45 - .008, -.035, .035);
      boundary += envelope * wave;
    }
    float edgeWidth = max(1.5 / u_resolution.y, .001);
    float waterMask = u_submerge > .001
      ? 1.0 - smoothstep(boundary - edgeWidth, boundary + edgeWidth, uv.y) : 0.0;
    color = vec3(0.0);
    if (waterMask < .999) {
      color = surfaceUV.y >= .5 ? sky(surfaceUV, ray, sun) : renderSurface(surfaceUV, aspect, sun);
    }
    if (u_submerge > .001) {
      if (waterMask > .001) {
        vec2 refractedUV = uv;
        refractedUV.x += envelope * .005 * sin(uv.y * 13.0 + u_time * .4);
        vec3 submerged = renderUnderwater(refractedUV, aspect);
        float nearSurface = exp(-max(waterline - uv.y, 0.0) * 12.0) * envelope;
        submerged = mix(submerged, vec3(.21, .52, .65), nearSurface * .24);
        color = mix(color, submerged, waterMask);
      }

      float lipWidth = max(.001, envelope * .011);
      float lip = smoothstep(boundary - lipWidth * .5, boundary + .002, uv.y)
                * (1.0 - smoothstep(boundary + lipWidth * .35, boundary + lipWidth, uv.y));
      if (lip > .001) {
        float face = clamp((uv.y - boundary + lipWidth * .5) / (lipWidth * 1.5), 0.0, 1.0);
        vec3 lipColor = mix(vec3(.095, .36, .51), vec3(.29, .61, .70), face);
        float lightOffset = (uv.x - u_sunX) * aspect / .20;
        float sunLight = exp(-lightOffset * lightOffset);
        lipColor = mix(lipColor, vec3(.97, .71, .54), sunLight * .30);
        color = mix(color, lipColor, lip * envelope);
      }
      float rim = paintStroke(uv.y - boundary - lipWidth * .20, lipWidth * .07, edgeWidth) * envelope;
      float rimOffset = (uv.x - u_sunX) * aspect / .2;
      float sunRim = exp(-rimOffset * rimOffset);
      color = mix(color, mix(vec3(.49, .77, .84), vec3(.97, .78, .59), sunRim), rim * .48);
    }
  }
  color = color / (vec3(1.0) + max(color - .70, 0.0) * .35);
  gl_FragColor = vec4(clamp(color, 0.0, .94), 1.0);
}
`;
