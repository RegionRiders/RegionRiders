'use client';

import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MapLibreMap,
} from 'maplibre-gl';
import { MAP_LAYER_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import {
  FLOATS_PER_PACKED_SEGMENT,
  lngLatToMercator,
  PackedHeatmapGeometry,
  packTracksForHeatmap,
  splitFloat64,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapGeometryPacker';
import {
  buildHeatmapColorLut,
  clampHeatmapIntensity,
  clampHeatmapZoomAttenuation,
  DEFAULT_HEATMAP_INTENSITY,
  DEFAULT_HEATMAP_ZOOM_ATTENUATION,
  getHeatmapBrushRadiusCssPx,
  getHeatmapGamma,
  HeatmapLutData,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapLutBuilder';
import { computeActivityFboResolution } from '@/components/ActivityMap/hooks/activity/utils/activityFboResolution';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';

const logger = createComponentLogger('WebGL2HeatmapLayer');
const MEDIUM_ZOOM_LOD_THRESHOLD = 9.0;
const LOW_ZOOM_LOD_THRESHOLD = 6.0;
const RGBA8_DENSITY_SCALE = 32.0;

/** Stage 1 analytic Gaussian hairline standard deviation in FBO pixels. */
export const SIGMA_0_PX = 0.85;

/** Maximum bilinear tap pairs per separable blur pass (supports thickness=10 at dpr=2). */
export const MAX_BLUR_PAIRS = 24;

const STAGE1_PAD_PX = 4.5 * SIGMA_0_PX;

export interface GaussianBlurTaps {
  centerWeight: number;
  pairCount: number;
  tapWeights: Float32Array;
  tapOffsets: Float32Array;
}

/**
 * Abramowitz & Stegun 7.1.26 rational approximation of erfc(z) (max error ~1.5e-7).
 */
export function erfcApprox(z: number): number {
  if (z < 0) {
    return 2 - erfcApprox(-z);
  }
  const t = 1 / (1 + 0.3275911 * z);
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return poly * Math.exp(-(z * z));
}

/**
 * Computes the sub-kernel 2D Gaussian dilution compensation factor `1 / erf(extentPx / (2*sqrt(2)*sigmaTot))`.
 * - For large tracks (extentPx >> sigmaTot), returns 1.000 (no effect on long routes).
 * - For small-area tracks at low zoom (extentPx << sigmaTot), converges to sqrt(2*pi)*sigmaTot / extentPx
 *   so a single activity remains a crisp 1.0-peak dot and multi-loop city walks preserve cumulative heat.
 */
export function computeLowZoomTrackBoost(extentPx: number, sigmaTot: number): number {
  if (!Number.isFinite(extentPx) || !Number.isFinite(sigmaTot) || extentPx <= 0 || sigmaTot <= 0) {
    return 1;
  }
  const uExt = extentPx / (2 * Math.SQRT2 * sigmaTot);
  if (uExt < 0.05) {
    return 0.886226925452758 / Math.max(1e-6, uExt * (1 - (uExt * uExt) / 3));
  }
  if (uExt < 4.5) {
    const erfExt = 1 - erfcApprox(uExt);
    return 1 / Math.max(1e-4, erfExt);
  }
  return 1;
}

/**
 * Computes normalized 1D Gaussian bilinear-paired taps for GPU separable convolution.
 */
export function computeGaussianBlurTaps(sigma1: number): GaussianBlurTaps {
  const tapWeights = new Float32Array(MAX_BLUR_PAIRS);
  const tapOffsets = new Float32Array(MAX_BLUR_PAIRS);

  if (!Number.isFinite(sigma1) || sigma1 <= 0) {
    return {
      centerWeight: 1,
      pairCount: 0,
      tapWeights,
      tapOffsets,
    };
  }

  let halfWidth = Math.max(2, Math.ceil(3.5 * sigma1));
  if (halfWidth % 2 !== 0) {
    halfWidth += 1;
  }
  halfWidth = Math.min(2 * MAX_BLUR_PAIRS, halfWidth);

  const pairCount = halfWidth / 2;
  const rawWeights = new Float64Array(halfWidth + 1);
  const invTwoSigmaSq = 1 / (2 * sigma1 * sigma1);

  rawWeights[0] = 1;
  let weightSum = 1;
  for (let k = 1; k <= halfWidth; k++) {
    const w = Math.exp(-(k * k) * invTwoSigmaSq);
    rawWeights[k] = w;
    weightSum += 2 * w;
  }

  const centerWeight = rawWeights[0] / weightSum;
  for (let m = 0; m < pairCount; m++) {
    const k1 = 2 * m + 1;
    const k2 = 2 * m + 2;
    const w1 = rawWeights[k1] / weightSum;
    const w2 = rawWeights[k2] / weightSum;
    const pairWeight = w1 + w2;
    tapWeights[m] = pairWeight;
    tapOffsets[m] = pairWeight > 0 ? k1 + w2 / pairWeight : k1;
  }

  return {
    centerWeight,
    pairCount,
    tapWeights,
    tapOffsets,
  };
}

export interface WebGL2HeatmapOptions {
  lineThickness: number;
  layerTransparency: number;
  heatmapDensity?: number;
  heatmapIntensity?: number;
  heatmapZoomAttenuation?: number;
  colorThresholds?: ColorThreshold[];
  edgeStyle?: 'crisp' | 'glow';
}

const HAIRLINE_VERTEX_SHADER = `#version 300 es
precision highp float;

// Per-vertex quad corner: x in {-1 (start), +1 (end)}, y in {-1 (right), +1 (left)}
layout(location = 0) in vec2 a_corner;
// Per-instance Double-Single Mercator segment: Hi [x0Hi, y0Hi, x1Hi, y1Hi] and Lo [x0Lo, y0Lo, x1Lo, y1Lo]
layout(location = 1) in vec4 a_segmentHi;
layout(location = 2) in vec4 a_segmentLo;
// Per-instance metadata: [segArcMerc, trackExtentMerc]
layout(location = 3) in vec2 a_segmentMeta;

uniform mat4 u_matrix;
uniform vec2 u_camCenterHi;
uniform vec2 u_camCenterLo;
uniform vec2 u_viewport;
uniform vec2 u_fboSize;
uniform float u_gutterPx;
uniform float u_padPx;
uniform float u_pxPerMerc;
uniform float u_sigmaTot;
uniform float u_sigma0;

out float v_alongPx;
out float v_acrossPx;
flat out float v_halfLenPx;
flat out float v_isPoint;
flat out float v_segWeight;
flat out float v_segArcPx;

float vsErfcApprox(float z) {
  float x = max(z, 0.0);
  float t = 1.0 / (1.0 + 0.3275911 * x);
  float poly = t * (
    0.254829592 +
    t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))
  );
  return poly * exp(-(x * x));
}

void main() {
  // Double-Single Relative-To-Center (RTC) subtraction eliminates float32 jitter at high zoom
  vec2 rel0 = (a_segmentHi.xy - u_camCenterHi) + (a_segmentLo.xy - u_camCenterLo);
  vec2 rel1 = (a_segmentHi.zw - u_camCenterHi) + (a_segmentLo.zw - u_camCenterLo);

  vec4 clip0 = u_matrix * vec4(rel0, 0.0, 1.0);
  vec4 clip1 = u_matrix * vec4(rel1, 0.0, 1.0);

  if (clip0.w <= 0.0 || clip1.w <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_alongPx = 0.0;
    v_acrossPx = 0.0;
    v_halfLenPx = 0.0;
    v_isPoint = 0.0;
    v_segWeight = 0.0;
    v_segArcPx = 0.0;
    return;
  }

  vec2 ndc0 = clip0.xy / clip0.w;
  vec2 ndc1 = clip1.xy / clip1.w;
  vec2 safeViewport = max(u_viewport, vec2(1.0));
  vec2 safeFboSize = max(u_fboSize, vec2(1.0));
  vec2 padNdc = (2.0 * (u_padPx + u_gutterPx)) / safeViewport + 0.05;

  if (
    (ndc0.x < -1.0 - padNdc.x && ndc1.x < -1.0 - padNdc.x) ||
    (ndc0.x >  1.0 + padNdc.x && ndc1.x >  1.0 + padNdc.x) ||
    (ndc0.y < -1.0 - padNdc.y && ndc1.y < -1.0 - padNdc.y) ||
    (ndc0.y >  1.0 + padNdc.y && ndc1.y >  1.0 + padNdc.y)
  ) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_alongPx = 0.0;
    v_acrossPx = 0.0;
    v_halfLenPx = 0.0;
    v_isPoint = 0.0;
    v_segWeight = 0.0;
    v_segArcPx = 0.0;
    return;
  }

  bool isSinglePoint =
    all(equal(a_segmentHi.xy, a_segmentHi.zw)) &&
    all(equal(a_segmentLo.xy, a_segmentLo.zw));

  vec2 p0 = (ndc0 * 0.5 + 0.5) * u_viewport;
  vec2 p1 = (ndc1 * 0.5 + 0.5) * u_viewport;
  vec2 delta = p1 - p0;
  float segLen = isSinglePoint ? 0.0 : length(delta);
  vec2 dir = segLen > 1e-6 ? (delta / segLen) : vec2(1.0, 0.0);
  vec2 normal = vec2(-dir.y, dir.x);

  float halfLen = segLen * 0.5;
  vec2 mid = (p0 + p1) * 0.5;
  vec2 localPx = vec2(a_corner.x * (halfLen + u_padPx), a_corner.y * u_padPx);
  vec2 posPx = mid + dir * localPx.x + normal * localPx.y;

  float segArcMerc = a_segmentMeta.x;
  float trackExtentMerc = a_segmentMeta.y;
  float trackBoost = 1.0;
  if (trackExtentMerc > 0.0) {
    float extentPx = trackExtentMerc * u_pxPerMerc;
    float uExt = extentPx / (2.82842712475 * max(u_sigmaTot, 1e-4));
    if (uExt < 0.05) {
      trackBoost = 0.88622692545 / max(1e-6, uExt * (1.0 - (uExt * uExt) / 3.0));
    } else if (uExt < 4.5) {
      float erfExt = 1.0 - vsErfcApprox(uExt);
      trackBoost = 1.0 / max(1e-4, erfExt);
    }
  }

  float segArcPx = segArcMerc * u_pxPerMerc;
  bool useShortLimit = !isSinglePoint && halfLen < 0.05 * max(u_sigma0, 1e-4);
  float arcScale = (!isSinglePoint && !useShortLimit && segArcPx > 0.0)
    ? max(1.0, segArcPx / max(segLen, 1e-4))
    : 1.0;

  gl_Position = vec4(((posPx + u_gutterPx) / safeFboSize) * 2.0 - 1.0, 0.0, 1.0);
  v_alongPx = localPx.x;
  v_acrossPx = localPx.y;
  v_halfLenPx = halfLen;
  v_isPoint = isSinglePoint ? 1.0 : 0.0;
  v_segWeight = trackBoost * arcScale;
  v_segArcPx = segArcPx;
}
`;

const HAIRLINE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float v_alongPx;
in float v_acrossPx;
flat in float v_halfLenPx;
flat in float v_isPoint;
flat in float v_segWeight;
flat in float v_segArcPx;

uniform float u_sigma0;
uniform float u_hitWeight;
uniform float u_pointScale;

out vec4 outColor;

const float INV_SQRT_2PI = 0.3989422804014327;
const float INV_2PI = 0.15915494309189535;
const float INV_SQRT_2 = 0.7071067811865476;

float erfcApprox(float z) {
  float x = max(z, 0.0);
  float t = 1.0 / (1.0 + 0.3275911 * x);
  float poly = t * (
    0.254829592 +
    t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))
  );
  return poly * exp(-(x * x));
}

void main() {
  float sigma0 = max(u_sigma0, 1e-4);
  float invTwoSigma0Sq = 1.0 / (2.0 * sigma0 * sigma0);
  float density = 0.0;

  if (v_isPoint > 0.5) {
    float rSq = v_alongPx * v_alongPx + v_acrossPx * v_acrossPx;
    if (v_segArcPx > 0.0) {
      // Collapsed small-area loop from medium/low LOD preserving full track mass
      density = v_segWeight * (v_segArcPx * INV_2PI / (sigma0 * sigma0)) * exp(-rSq * invTwoSigma0Sq);
    } else {
      // Single-point #165 track scaled by u_pointScale = sigmaTot / sigma0 so peak = 1.000 after 2D blur
      density = u_pointScale * (INV_SQRT_2PI / sigma0) * exp(-rSq * invTwoSigma0Sq);
    }
  } else if (v_halfLenPx < 0.05 * sigma0) {
    // Cancellation-free short-segment limit (L < 0.1 * sigma0) using exact Mercator arc length
    float rSq = v_alongPx * v_alongPx + v_acrossPx * v_acrossPx;
    float segLen = v_segArcPx > 0.0 ? v_segArcPx : (2.0 * v_halfLenPx);
    density = v_segWeight * (segLen * INV_2PI / (sigma0 * sigma0)) * exp(-rSq * invTwoSigma0Sq);
  } else {
    // Sign-split analytic Gaussian segment integral along u in [u0, u1]
    float invSqrt2Sigma0 = INV_SQRT_2 / sigma0;
    float u0 = (v_alongPx - v_halfLenPx) * invSqrt2Sigma0;
    float u1 = (v_alongPx + v_halfLenPx) * invSqrt2Sigma0;
    float erfDiff = 0.0;
    if (u0 > 0.0) {
      erfDiff = erfcApprox(u0) - erfcApprox(u1);
    } else if (u1 < 0.0) {
      erfDiff = erfcApprox(-u1) - erfcApprox(-u0);
    } else {
      erfDiff = (1.0 - erfcApprox(u1)) + (1.0 - erfcApprox(-u0));
    }
    density =
      v_segWeight *
      0.5 *
      max(0.0, erfDiff) *
      (INV_SQRT_2PI / sigma0) *
      exp(-(v_acrossPx * v_acrossPx) * invTwoSigma0Sq);
  }

  float contribution = u_hitWeight * density;
  if (contribution <= 0.0) {
    discard;
  }

  // .r accumulates additive KDE density; .g/.b/.a reserved for future metric channels
  outColor = vec4(contribution, 0.0, 0.0, 0.0);
}
`;

const COMPOSITE_VERTEX_SHADER = `#version 300 es
precision highp float;

const vec2 POSITIONS[4] = vec2[4](
  vec2(-1.0, -1.0),
  vec2( 1.0, -1.0),
  vec2(-1.0,  1.0),
  vec2( 1.0,  1.0)
);

out vec2 v_uv;

void main() {
  vec2 pos = POSITIONS[gl_VertexID];
  v_uv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

const BLUR_FRAGMENT_SHADER = `#version 300 es
precision highp float;

const int MAX_BLUR_PAIRS = ${MAX_BLUR_PAIRS};

in vec2 v_uv;

uniform sampler2D u_srcTex;
uniform vec2 u_texelStep;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_centerWeight;
uniform int u_pairCount;
uniform float u_tapWeights[MAX_BLUR_PAIRS];
uniform float u_tapOffsets[MAX_BLUR_PAIRS];
uniform float u_outputScale;

out vec4 outColor;

void main() {
  vec2 baseUv = v_uv * u_uvScale + u_uvOffset;
  float accum = texture(u_srcTex, baseUv).r * u_centerWeight;
  for (int i = 0; i < MAX_BLUR_PAIRS; i++) {
    if (i >= u_pairCount) {
      break;
    }
    vec2 offset = u_texelStep * u_tapOffsets[i];
    float pairSum = texture(u_srcTex, baseUv + offset).r + texture(u_srcTex, baseUv - offset).r;
    accum += pairSum * u_tapWeights[i];
  }
  outColor = vec4(accum * u_outputScale, 0.0, 0.0, 0.0);
}
`;

const COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_densityTex;
uniform sampler2D u_lutTex;
uniform float u_densityScale;
uniform float u_intensity;
uniform float u_gamma;
uniform float u_logMaxThreshold;
uniform float u_transparency;
uniform float u_edgeLow;
uniform float u_edgeHigh;

out vec4 outColor;

void main() {
  float rawDensity = texture(u_densityTex, v_uv).r * u_densityScale;
  if (rawDensity <= 0.002) {
    discard;
  }

  // Apply user intensity gain and physical ground-footprint power-law compression (gamma = 1 at street zoom)
  float adjusted = rawDensity * u_intensity;
  float uniqueActivities = adjusted <= 1.0
    ? adjusted
    : pow(adjusted, u_gamma);

  float u = clamp(log(1.0 + uniqueActivities) / max(0.0001, u_logMaxThreshold), 1.0 / 511.0, 1.0);
  vec4 lutColor = texture(u_lutTex, vec2(u, 0.5));

  float edgeAa = smoothstep(u_edgeLow, u_edgeHigh, rawDensity);
  float alpha = lutColor.a * u_transparency * edgeAa;
  if (alpha <= 0.0) {
    discard;
  }

  // MapLibre custom layer render() expects premultiplied alpha
  outColor = vec4(lutColor.rgb * alpha, alpha);
}
`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    logger.error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) {
    if (vs) {
      gl.deleteShader(vs);
    }
    if (fs) {
      gl.deleteShader(fs);
    }
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    logger.error(`Program link error: ${gl.getProgramInfoLog(program)}`);
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

/**
 * 2-stage GPU KDE WebGL2 heatmap layer for MapLibre GL JS (Approach A).
 *
 * Stage 1 renders each track as a 1px analytic Gaussian hairline (`sigma0 = 0.85 FBO px`) via
 * sign-split `erfc` integration (plus cancellation-free short-segment limit and `#165` point scaling)
 * into `rawDensityFbo` using additive `FUNC_ADD` blending.
 *
 * Stage 2 conditionally runs a 2-pass separable Gaussian blur (`sigma1 = sqrt(sigmaTot^2 - sigma0^2)`)
 * using hardware bilinear tap pairing and `sqrt(2*PI)*sigmaTot` normalization when `sigmaTot > sigma0`,
 * yielding C^infinity smooth curves with exact `1.000` centerline density and zero miter/cusp streaks.
 */
export class WebGL2HeatmapLayer implements CustomLayerInterface {
  readonly id = MAP_LAYER_IDS.ACTIVITIES_HEATMAP;
  readonly type = 'custom' as const;
  readonly renderingMode = '2d' as const;

  private map: MapLibreMap | null = null;
  private gl: WebGL2RenderingContext | null = null;

  private hairlineProgram: WebGLProgram | null = null;
  private blurProgram: WebGLProgram | null = null;
  private compositeProgram: WebGLProgram | null = null;

  private quadVbo: WebGLBuffer | null = null;
  private fullSegmentVbo: WebGLBuffer | null = null;
  private mediumZoomSegmentVbo: WebGLBuffer | null = null;
  private lowZoomSegmentVbo: WebGLBuffer | null = null;
  private fullVao: WebGLVertexArrayObject | null = null;
  private mediumZoomVao: WebGLVertexArrayObject | null = null;
  private lowZoomVao: WebGLVertexArrayObject | null = null;
  private compositeVao: WebGLVertexArrayObject | null = null;

  private rawDensityFbo: WebGLFramebuffer | null = null;
  private rawDensityTex: WebGLTexture | null = null;
  private blurTempFbo: WebGLFramebuffer | null = null;
  private blurTempTex: WebGLTexture | null = null;
  private densityFbo: WebGLFramebuffer | null = null;
  private densityTex: WebGLTexture | null = null;

  private rawFboWidth = 0;
  private rawFboHeight = 0;
  private rawFboFloat = false;
  private blurFboWidth = 0;
  private blurFboHeight = 0;
  private blurFboFloat = false;
  private usesFloatFbo = false;

  private lastRenderUsedBlur = false;
  private lastRadiusFboPx = SIGMA_0_PX;
  private lastSigmaTotRaw = SIGMA_0_PX;
  private lastSigmaTot = SIGMA_0_PX;

  private lutTex: WebGLTexture | null = null;
  private lutData: HeatmapLutData;

  private packedGeometry: PackedHeatmapGeometry;
  private geometryDirty = true;
  private lutDirty = true;
  private readonly matrixF32 = new Float32Array(16);

  private options: WebGL2HeatmapOptions;

  constructor(tracks: Map<string, GPXTrack>, options: WebGL2HeatmapOptions) {
    this.options = { ...options };
    this.packedGeometry = packTracksForHeatmap(tracks);
    this.lutData = buildHeatmapColorLut(options.colorThresholds);
  }

  updateTracks(tracks: Map<string, GPXTrack>): void {
    this.packedGeometry = packTracksForHeatmap(tracks);
    this.geometryDirty = true;
    this.map?.triggerRepaint();
  }

  updateOptions(nextOptions: WebGL2HeatmapOptions): void {
    const thresholdsChanged =
      JSON.stringify(this.options.colorThresholds) !== JSON.stringify(nextOptions.colorThresholds);
    this.options = { ...nextOptions };

    if (thresholdsChanged) {
      this.lutData = buildHeatmapColorLut(nextOptions.colorThresholds);
      this.lutDirty = true;
    }

    this.map?.triggerRepaint();
  }

  onAdd(map: MapLibreMap, gl: WebGL2RenderingContext): void {
    this.map = map;
    this.gl = gl;
    this.geometryDirty = true;
    this.lutDirty = true;
    this.rawFboWidth = 0;
    this.rawFboHeight = 0;
    this.rawFboFloat = false;
    this.blurFboWidth = 0;
    this.blurFboHeight = 0;
    this.blurFboFloat = false;
    this.lastRenderUsedBlur = false;

    this.hairlineProgram = createProgram(gl, HAIRLINE_VERTEX_SHADER, HAIRLINE_FRAGMENT_SHADER);
    this.blurProgram = createProgram(gl, COMPOSITE_VERTEX_SHADER, BLUR_FRAGMENT_SHADER);
    this.compositeProgram = createProgram(gl, COMPOSITE_VERTEX_SHADER, COMPOSITE_FRAGMENT_SHADER);

    if (!this.hairlineProgram || !this.blurProgram || !this.compositeProgram) {
      if (this.hairlineProgram) {
        gl.deleteProgram(this.hairlineProgram);
        this.hairlineProgram = null;
      }
      if (this.blurProgram) {
        gl.deleteProgram(this.blurProgram);
        this.blurProgram = null;
      }
      if (this.compositeProgram) {
        gl.deleteProgram(this.compositeProgram);
        this.compositeProgram = null;
      }
      logger.error('Failed to initialize WebGL2 heatmap shader programs');
      return;
    }

    // RGBA16F is unconditionally linear-filterable in core WebGL2; extension gates color-renderability only
    const floatExt =
      gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
    this.usesFloatFbo = Boolean(floatExt);

    this.quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.fullSegmentVbo = gl.createBuffer();
    this.mediumZoomSegmentVbo = gl.createBuffer();
    this.lowZoomSegmentVbo = gl.createBuffer();

    this.fullVao = this.createInstancedVao(gl, this.fullSegmentVbo);
    this.mediumZoomVao = this.createInstancedVao(gl, this.mediumZoomSegmentVbo);
    this.lowZoomVao = this.createInstancedVao(gl, this.lowZoomSegmentVbo);
    this.compositeVao = gl.createVertexArray();

    this.rawDensityFbo = gl.createFramebuffer();
    this.rawDensityTex = gl.createTexture();
    this.lutTex = gl.createTexture();

    this.uploadGeometryIfNeeded(gl);
    this.uploadLutIfNeeded(gl);
    gl.bindVertexArray(null);
  }

  private createInstancedVao(
    gl: WebGL2RenderingContext,
    segmentVbo: WebGLBuffer | null
  ): WebGLVertexArrayObject | null {
    const vao = gl.createVertexArray();
    if (!vao || !this.quadVbo || !segmentVbo) {
      return vao;
    }

    const strideBytes = FLOATS_PER_PACKED_SEGMENT * 4; // 40 bytes per instance

    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, segmentVbo);
    // location 1: a_segmentHi [x0Hi, y0Hi, x1Hi, y1Hi]
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, strideBytes, 0);
    gl.vertexAttribDivisor(1, 1);

    // location 2: a_segmentLo [x0Lo, y0Lo, x1Lo, y1Lo]
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, strideBytes, 16);
    gl.vertexAttribDivisor(2, 1);

    // location 3: a_segmentMeta [segArcMerc, trackExtentMerc]
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, strideBytes, 32);
    gl.vertexAttribDivisor(3, 1);

    gl.bindVertexArray(null);
    return vao;
  }

  private uploadGeometryIfNeeded(gl: WebGL2RenderingContext): void {
    if (
      !this.geometryDirty ||
      !this.fullSegmentVbo ||
      !this.mediumZoomSegmentVbo ||
      !this.lowZoomSegmentVbo
    ) {
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.fullSegmentVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.packedGeometry.fullSegments, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mediumZoomSegmentVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.packedGeometry.mediumZoomSegments, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.lowZoomSegmentVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.packedGeometry.lowZoomSegments, gl.STATIC_DRAW);

    this.geometryDirty = false;
  }

  private uploadLutIfNeeded(gl: WebGL2RenderingContext): void {
    if (!this.lutDirty || !this.lutTex) {
      return;
    }

    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.lutData.width,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.lutData.data
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.lutDirty = false;
  }

  private configureFboTexture(
    gl: WebGL2RenderingContext,
    fbo: WebGLFramebuffer,
    tex: WebGLTexture,
    width: number,
    height: number,
    restoreFbo: WebGLFramebuffer | null
  ): boolean {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    if (this.usesFloatFbo) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    } else {
      const rgbaInternalFormat = typeof gl.RGBA8 === 'number' ? gl.RGBA8 : gl.RGBA;
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        rgbaInternalFormat,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, restoreFbo);
    gl.bindTexture(gl.TEXTURE_2D, null);

    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      if (!this.usesFloatFbo) {
        logger.error(`Density FBO incomplete: status=${status}`);
      }
      return false;
    }

    return true;
  }

  private ensureFbosForFrame(
    gl: WebGL2RenderingContext,
    rawW: number,
    rawH: number,
    destW: number,
    destH: number,
    needsBlur: boolean,
    restoreFbo: WebGLFramebuffer | null
  ): boolean {
    const rawReady =
      this.rawFboWidth === rawW &&
      this.rawFboHeight === rawH &&
      this.rawFboFloat === this.usesFloatFbo;

    if (!rawReady) {
      if (!this.rawDensityFbo || !this.rawDensityTex) {
        return false;
      }

      if (
        !this.configureFboTexture(
          gl,
          this.rawDensityFbo,
          this.rawDensityTex,
          rawW,
          rawH,
          restoreFbo
        )
      ) {
        if (this.usesFloatFbo) {
          this.usesFloatFbo = false;
          this.rawFboWidth = 0;
          this.rawFboHeight = 0;
          this.blurFboWidth = 0;
          this.blurFboHeight = 0;
          return this.ensureFbosForFrame(gl, rawW, rawH, destW, destH, needsBlur, restoreFbo);
        }
        return false;
      }

      this.rawFboWidth = rawW;
      this.rawFboHeight = rawH;
      this.rawFboFloat = this.usesFloatFbo;
    }

    if (needsBlur) {
      if (!this.blurTempFbo) {
        this.blurTempFbo = gl.createFramebuffer();
      }
      if (!this.blurTempTex) {
        this.blurTempTex = gl.createTexture();
      }
      if (!this.densityFbo) {
        this.densityFbo = gl.createFramebuffer();
      }
      if (!this.densityTex) {
        this.densityTex = gl.createTexture();
      }
      if (!this.blurTempFbo || !this.blurTempTex || !this.densityFbo || !this.densityTex) {
        return false;
      }

      const blurReady =
        this.blurFboWidth === destW &&
        this.blurFboHeight === destH &&
        this.blurFboFloat === this.usesFloatFbo &&
        rawReady;

      if (!blurReady) {
        const tempOk = this.configureFboTexture(
          gl,
          this.blurTempFbo,
          this.blurTempTex,
          rawW,
          rawH,
          restoreFbo
        );
        const destOk = tempOk
          ? this.configureFboTexture(gl, this.densityFbo, this.densityTex, destW, destH, restoreFbo)
          : false;

        if (!tempOk || !destOk) {
          if (this.usesFloatFbo) {
            this.usesFloatFbo = false;
            this.rawFboWidth = 0;
            this.rawFboHeight = 0;
            this.blurFboWidth = 0;
            this.blurFboHeight = 0;
            return this.ensureFbosForFrame(gl, rawW, rawH, destW, destH, needsBlur, restoreFbo);
          }
          return false;
        }

        this.blurFboWidth = destW;
        this.blurFboHeight = destH;
        this.blurFboFloat = this.usesFloatFbo;
      }
    }

    return true;
  }

  private resetFixedPipelineState(gl: WebGL2RenderingContext): void {
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    if (typeof gl.SCISSOR_TEST === 'number') {
      gl.disable(gl.SCISSOR_TEST);
    }
    gl.colorMask(true, true, true, true);
  }

  prerender(gl: WebGL2RenderingContext, options: CustomRenderMethodInput): void {
    if (!this.map || !this.hairlineProgram || this.packedGeometry.fullSegmentCount === 0) {
      return;
    }

    this.uploadGeometryIfNeeded(gl);
    this.uploadLutIfNeeded(gl);

    const canvas = this.map.getCanvas();
    const cssW = canvas.clientWidth > 0 ? canvas.clientWidth : canvas.width;
    const cssH = canvas.clientHeight > 0 ? canvas.clientHeight : canvas.height;
    const glMaxTexSize = (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) || 0;
    const {
      width: clampedW,
      height: clampedH,
      effectiveScale: effectiveRenderScale,
      maxTextureDim: maxTexSize,
    } = computeActivityFboResolution(cssW, cssH, glMaxTexSize, 'heatmap');
    const radiusCssPx = getHeatmapBrushRadiusCssPx(this.options.lineThickness);
    const radiusFboPx = radiusCssPx * effectiveRenderScale;
    const edgeDivisor = this.options.edgeStyle === 'glow' ? 1.8 : 1.55;
    const sigmaTotRaw = radiusFboPx / edgeDivisor;
    const needsBlur = Boolean(this.blurProgram) && sigmaTotRaw > SIGMA_0_PX + 1e-3;
    const sigmaTot = Math.max(SIGMA_0_PX, sigmaTotRaw);
    const sigma1 = needsBlur
      ? Math.sqrt(Math.max(0, sigmaTot * sigmaTot - SIGMA_0_PX * SIGMA_0_PX))
      : 0;
    const maxAllowedGutter = Math.max(
      0,
      Math.floor((maxTexSize - Math.max(clampedW, clampedH)) / 2)
    );
    const gutterPx = needsBlur ? Math.min(maxAllowedGutter, Math.ceil(3.5 * sigma1)) : 0;
    const rawW = clampedW + 2 * gutterPx;
    const rawH = clampedH + 2 * gutterPx;

    const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const prevViewport = gl.getParameter(gl.VIEWPORT) as Int32Array | number[] | null;

    if (!this.ensureFbosForFrame(gl, rawW, rawH, clampedW, clampedH, needsBlur, prevFbo)) {
      return;
    }

    // Stage 1: Analytic 1px Gaussian hairline accumulation -> rawDensityFbo
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.rawDensityFbo);
    gl.viewport(0, 0, this.rawFboWidth, this.rawFboHeight);
    this.resetFixedPipelineState(gl);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);

    // Compute 64-bit Relative-To-Center (RTC) projection matrix on CPU around map center
    const center = this.map.getCenter();
    const [camX, camY] = lngLatToMercator(center.lng, center.lat);
    const [camXHi, camXLo] = splitFloat64(camX);
    const [camYHi, camYLo] = splitFloat64(camY);

    const rawMatrix =
      options.defaultProjectionData?.mainMatrix ?? options.modelViewProjectionMatrix;
    const m0 = Number(rawMatrix[0] ?? 0);
    const m1 = Number(rawMatrix[1] ?? 0);
    const m2 = Number(rawMatrix[2] ?? 0);
    const m3 = Number(rawMatrix[3] ?? 0);
    const m4 = Number(rawMatrix[4] ?? 0);
    const m5 = Number(rawMatrix[5] ?? 0);
    const m6 = Number(rawMatrix[6] ?? 0);
    const m7 = Number(rawMatrix[7] ?? 0);

    for (let i = 0; i < 12; i++) {
      this.matrixF32[i] = Number(rawMatrix[i] ?? 0);
    }
    this.matrixF32[12] = m0 * camX + m4 * camY + Number(rawMatrix[12] ?? 0);
    this.matrixF32[13] = m1 * camX + m5 * camY + Number(rawMatrix[13] ?? 0);
    this.matrixF32[14] = m2 * camX + m6 * camY + Number(rawMatrix[14] ?? 0);
    this.matrixF32[15] = m3 * camX + m7 * camY + Number(rawMatrix[15] ?? 0);

    gl.useProgram(this.hairlineProgram);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.hairlineProgram, 'u_matrix'),
      false,
      this.matrixF32
    );
    gl.uniform2f(gl.getUniformLocation(this.hairlineProgram, 'u_camCenterHi'), camXHi, camYHi);
    gl.uniform2f(gl.getUniformLocation(this.hairlineProgram, 'u_camCenterLo'), camXLo, camYLo);
    gl.uniform2f(gl.getUniformLocation(this.hairlineProgram, 'u_viewport'), clampedW, clampedH);
    gl.uniform2f(
      gl.getUniformLocation(this.hairlineProgram, 'u_fboSize'),
      this.rawFboWidth,
      this.rawFboHeight
    );
    gl.uniform1f(gl.getUniformLocation(this.hairlineProgram, 'u_gutterPx'), gutterPx);
    gl.uniform1f(gl.getUniformLocation(this.hairlineProgram, 'u_sigma0'), SIGMA_0_PX);
    gl.uniform1f(gl.getUniformLocation(this.hairlineProgram, 'u_padPx'), STAGE1_PAD_PX);

    const wCenter = this.matrixF32[15] || 1;
    const invWSq = 1 / (wCenter * wCenter);
    const dNdcX = (m0 * wCenter - this.matrixF32[12] * m3) * invWSq;
    const dNdcY = (m1 * wCenter - this.matrixF32[13] * m3) * invWSq;
    const pxPerMerc = Math.max(1e-6, Math.hypot(dNdcX * 0.5 * clampedW, dNdcY * 0.5 * clampedH));
    gl.uniform1f(gl.getUniformLocation(this.hairlineProgram, 'u_pxPerMerc'), pxPerMerc);
    gl.uniform1f(gl.getUniformLocation(this.hairlineProgram, 'u_sigmaTot'), sigmaTot);

    const hitWeight = this.usesFloatFbo
      ? 1.0
      : (Math.sqrt(2 * Math.PI) * SIGMA_0_PX) / RGBA8_DENSITY_SCALE;
    const pointScale = needsBlur ? sigmaTot / SIGMA_0_PX : 1.0;

    gl.uniform1f(gl.getUniformLocation(this.hairlineProgram, 'u_hitWeight'), hitWeight);
    gl.uniform1f(gl.getUniformLocation(this.hairlineProgram, 'u_pointScale'), pointScale);

    const currentZoom = this.map.getZoom();
    let vao = this.fullVao;
    let count = this.packedGeometry.fullSegmentCount;
    if (currentZoom < LOW_ZOOM_LOD_THRESHOLD) {
      vao = this.lowZoomVao;
      count = this.packedGeometry.lowZoomSegmentCount;
    } else if (currentZoom < MEDIUM_ZOOM_LOD_THRESHOLD) {
      vao = this.mediumZoomVao;
      count = this.packedGeometry.mediumZoomSegmentCount;
    }

    if (vao && count > 0) {
      gl.bindVertexArray(vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      gl.bindVertexArray(null);
    }

    // Stage 2: Conditional 2-pass separable Gaussian blur (Pass 2a X -> blurTempFbo, Pass 2b Y -> densityFbo)
    if (
      needsBlur &&
      this.blurProgram &&
      this.blurTempFbo &&
      this.blurTempTex &&
      this.densityFbo &&
      this.rawDensityTex &&
      this.compositeVao
    ) {
      const taps = computeGaussianBlurTaps(sigma1);
      const perPassScale = this.usesFloatFbo ? 1.0 : Math.sqrt(sigmaTot / SIGMA_0_PX);
      const finalPassScale = this.usesFloatFbo ? Math.sqrt(2 * Math.PI) * sigmaTot : perPassScale;

      gl.disable(gl.BLEND);
      gl.useProgram(this.blurProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(gl.getUniformLocation(this.blurProgram, 'u_srcTex'), 0);
      gl.uniform1f(gl.getUniformLocation(this.blurProgram, 'u_centerWeight'), taps.centerWeight);
      gl.uniform1i(gl.getUniformLocation(this.blurProgram, 'u_pairCount'), taps.pairCount);
      gl.uniform1fv(gl.getUniformLocation(this.blurProgram, 'u_tapWeights'), taps.tapWeights);
      gl.uniform1fv(gl.getUniformLocation(this.blurProgram, 'u_tapOffsets'), taps.tapOffsets);

      gl.bindVertexArray(this.compositeVao);

      // Pass 2a: Horizontal blur (rawDensityTex -> blurTempFbo, keeping gutter)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurTempFbo);
      gl.viewport(0, 0, this.rawFboWidth, this.rawFboHeight);
      gl.bindTexture(gl.TEXTURE_2D, this.rawDensityTex);
      gl.uniform2f(gl.getUniformLocation(this.blurProgram, 'u_texelStep'), 1 / this.rawFboWidth, 0);
      gl.uniform2f(gl.getUniformLocation(this.blurProgram, 'u_uvScale'), 1, 1);
      gl.uniform2f(gl.getUniformLocation(this.blurProgram, 'u_uvOffset'), 0, 0);
      gl.uniform1f(gl.getUniformLocation(this.blurProgram, 'u_outputScale'), perPassScale);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Pass 2b: Vertical blur + final normalization + crop gutter (blurTempTex -> densityFbo)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityFbo);
      gl.viewport(0, 0, this.blurFboWidth, this.blurFboHeight);
      gl.bindTexture(gl.TEXTURE_2D, this.blurTempTex);
      gl.uniform2f(
        gl.getUniformLocation(this.blurProgram, 'u_texelStep'),
        0,
        1 / this.rawFboHeight
      );
      gl.uniform2f(
        gl.getUniformLocation(this.blurProgram, 'u_uvScale'),
        this.blurFboWidth / this.rawFboWidth,
        this.blurFboHeight / this.rawFboHeight
      );
      gl.uniform2f(
        gl.getUniformLocation(this.blurProgram, 'u_uvOffset'),
        gutterPx / this.rawFboWidth,
        gutterPx / this.rawFboHeight
      );
      gl.uniform1f(gl.getUniformLocation(this.blurProgram, 'u_outputScale'), finalPassScale);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.bindVertexArray(null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    this.lastRenderUsedBlur = needsBlur;
    this.lastRadiusFboPx = radiusFboPx;
    this.lastSigmaTotRaw = sigmaTotRaw;
    this.lastSigmaTot = sigmaTot;

    gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);
    if (prevViewport && prevViewport.length >= 4) {
      gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
    }
  }

  render(gl: WebGL2RenderingContext): void {
    const activeDensityTex = this.lastRenderUsedBlur ? this.densityTex : this.rawDensityTex;
    if (
      !this.map ||
      !this.compositeProgram ||
      !activeDensityTex ||
      !this.lutTex ||
      this.packedGeometry.fullSegmentCount === 0 ||
      this.rawFboWidth === 0
    ) {
      return;
    }

    this.resetFixedPipelineState(gl);

    gl.useProgram(this.compositeProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, activeDensityTex);
    gl.uniform1i(gl.getUniformLocation(this.compositeProgram, 'u_densityTex'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.uniform1i(gl.getUniformLocation(this.compositeProgram, 'u_lutTex'), 1);

    let densityScale = RGBA8_DENSITY_SCALE;
    if (this.usesFloatFbo) {
      densityScale = this.lastRenderUsedBlur ? 1.0 : Math.sqrt(2 * Math.PI) * SIGMA_0_PX;
    }

    let edgeLow = 0.18;
    let edgeHigh = 0.42;
    if (this.options.edgeStyle === 'glow') {
      edgeLow = 0.0;
      edgeHigh = 0.88;
    } else if (this.lastSigmaTotRaw < SIGMA_0_PX) {
      // Smoothly adapt isocontour only when sigmaTot was floored at SIGMA_0_PX (e.g. thickness=1, dpr=1)
      const isoAtRadius = Math.exp(
        -(this.lastRadiusFboPx * this.lastRadiusFboPx) / (2 * this.lastSigmaTot * this.lastSigmaTot)
      );
      const clampT = Math.min(1, Math.max(0, (isoAtRadius - 0.3) / (0.6065 - 0.3)));
      edgeLow = 0.18 + 0.24 * clampT;
      edgeHigh = 0.42 + 0.36 * clampT;
    }

    const intensity = clampHeatmapIntensity(
      this.options.heatmapIntensity ?? DEFAULT_HEATMAP_INTENSITY
    );
    const gamma = getHeatmapGamma(
      this.map.getZoom(),
      this.options.lineThickness,
      clampHeatmapZoomAttenuation(
        this.options.heatmapZoomAttenuation ?? DEFAULT_HEATMAP_ZOOM_ATTENUATION
      )
    );
    const transparency = Math.max(0, Math.min(1, this.options.layerTransparency ?? 1));

    gl.uniform1f(gl.getUniformLocation(this.compositeProgram, 'u_densityScale'), densityScale);
    gl.uniform1f(gl.getUniformLocation(this.compositeProgram, 'u_intensity'), intensity);
    gl.uniform1f(gl.getUniformLocation(this.compositeProgram, 'u_gamma'), gamma);
    gl.uniform1f(
      gl.getUniformLocation(this.compositeProgram, 'u_logMaxThreshold'),
      Math.log1p(this.lutData.maxThreshold)
    );
    gl.uniform1f(gl.getUniformLocation(this.compositeProgram, 'u_transparency'), transparency);
    gl.uniform1f(gl.getUniformLocation(this.compositeProgram, 'u_edgeLow'), edgeLow);
    gl.uniform1f(gl.getUniformLocation(this.compositeProgram, 'u_edgeHigh'), edgeHigh);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindVertexArray(this.compositeVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  onRemove(_map: MapLibreMap, gl: WebGL2RenderingContext): void {
    if (this.hairlineProgram) {
      gl.deleteProgram(this.hairlineProgram);
    }
    if (this.blurProgram) {
      gl.deleteProgram(this.blurProgram);
    }
    if (this.compositeProgram) {
      gl.deleteProgram(this.compositeProgram);
    }
    if (this.quadVbo) {
      gl.deleteBuffer(this.quadVbo);
    }
    if (this.fullSegmentVbo) {
      gl.deleteBuffer(this.fullSegmentVbo);
    }
    if (this.mediumZoomSegmentVbo) {
      gl.deleteBuffer(this.mediumZoomSegmentVbo);
    }
    if (this.lowZoomSegmentVbo) {
      gl.deleteBuffer(this.lowZoomSegmentVbo);
    }
    if (this.fullVao) {
      gl.deleteVertexArray(this.fullVao);
    }
    if (this.mediumZoomVao) {
      gl.deleteVertexArray(this.mediumZoomVao);
    }
    if (this.lowZoomVao) {
      gl.deleteVertexArray(this.lowZoomVao);
    }
    if (this.compositeVao) {
      gl.deleteVertexArray(this.compositeVao);
    }
    if (this.rawDensityFbo) {
      gl.deleteFramebuffer(this.rawDensityFbo);
    }
    if (this.blurTempFbo) {
      gl.deleteFramebuffer(this.blurTempFbo);
    }
    if (this.densityFbo) {
      gl.deleteFramebuffer(this.densityFbo);
    }
    if (this.rawDensityTex) {
      gl.deleteTexture(this.rawDensityTex);
    }
    if (this.blurTempTex) {
      gl.deleteTexture(this.blurTempTex);
    }
    if (this.densityTex) {
      gl.deleteTexture(this.densityTex);
    }
    if (this.lutTex) {
      gl.deleteTexture(this.lutTex);
    }

    this.hairlineProgram = null;
    this.blurProgram = null;
    this.compositeProgram = null;
    this.quadVbo = null;
    this.fullSegmentVbo = null;
    this.mediumZoomSegmentVbo = null;
    this.lowZoomSegmentVbo = null;
    this.fullVao = null;
    this.mediumZoomVao = null;
    this.lowZoomVao = null;
    this.compositeVao = null;
    this.rawDensityFbo = null;
    this.blurTempFbo = null;
    this.densityFbo = null;
    this.rawDensityTex = null;
    this.blurTempTex = null;
    this.densityTex = null;
    this.lutTex = null;
    this.rawFboWidth = 0;
    this.rawFboHeight = 0;
    this.rawFboFloat = false;
    this.blurFboWidth = 0;
    this.blurFboHeight = 0;
    this.blurFboFloat = false;
    this.usesFloatFbo = false;
    this.lastRenderUsedBlur = false;
    this.lastRadiusFboPx = SIGMA_0_PX;
    this.lastSigmaTotRaw = SIGMA_0_PX;
    this.lastSigmaTot = SIGMA_0_PX;
    this.geometryDirty = true;
    this.lutDirty = true;
    this.map = null;
    this.gl = null;
  }
}
