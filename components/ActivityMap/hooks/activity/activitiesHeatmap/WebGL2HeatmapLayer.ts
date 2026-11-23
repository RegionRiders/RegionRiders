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
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';

const logger = createComponentLogger('WebGL2HeatmapLayer');
const MEDIUM_ZOOM_LOD_THRESHOLD = 10.5;
const LOW_ZOOM_LOD_THRESHOLD = 7.5;
const MAX_MOBILE_SAFE_FBO_DIM = 2560;

export interface WebGL2HeatmapOptions {
  lineThickness: number;
  layerTransparency: number;
  heatmapDensity: number;
  heatmapIntensity?: number;
  heatmapZoomAttenuation?: number;
  colorThresholds?: ColorThreshold[];
}

const RIBBON_VERTEX_SHADER = `#version 300 es
precision highp float;

// Per-vertex quad corner: x in {-1 (start), +1 (end)}, y in {-1 (right), +1 (left)}
layout(location = 0) in vec2 a_corner;
// Per-instance Double-Single Mercator segment: Hi [x0Hi, y0Hi, x1Hi, y1Hi] and Lo [x0Lo, y0Lo, x1Lo, y1Lo]
layout(location = 1) in vec4 a_segmentHi;
layout(location = 2) in vec4 a_segmentLo;
// Per-instance Mercator adjacent directions: [prevDx, prevDy, nextDx, nextDy] ((0,0) = open round cap)
layout(location = 3) in vec4 a_adjDirs;

uniform mat4 u_matrix;
uniform vec2 u_camCenterHi;
uniform vec2 u_camCenterLo;
uniform vec2 u_viewport;
uniform float u_radiusPx;
uniform float u_aaPaddingPx;

out float v_alongPx;
out float v_acrossPx;
out float v_halfLenPx;
out float v_radiusPx;
flat out vec2 v_capFlags; // x = hasStartCap, y = hasEndCap

// Analytically projects a Mercator direction vector to a unit screen-space direction at clipPos
vec2 projectMercatorDir(vec4 clipPos, vec2 mercDir) {
  vec4 dClip = u_matrix * vec4(mercDir, 0.0, 0.0);
  vec2 dNdc = (dClip.xy * clipPos.w - clipPos.xy * dClip.w) / (clipPos.w * clipPos.w);
  vec2 dPx = dNdc * (0.5 * u_viewport);
  float len = length(dPx);
  return len > 1e-6 ? (dPx / len) : vec2(0.0);
}

// Computes the symmetric miter offset vector shared by adjacent ribbon segments at a join
vec2 computeMiterOffset(vec2 dPrev, vec2 dNext, float padRadius) {
  vec2 nPrev = vec2(-dPrev.y, dPrev.x);
  vec2 nNext = vec2(-dNext.y, dNext.x);
  vec2 sumN = nPrev + nNext;
  float sumLen = length(sumN);
  if (sumLen < 1e-4) {
    return nNext * padRadius;
  }
  vec2 miterDir = sumN / sumLen;
  // Clamp miter length to 1.6x padRadius on sharp bends to prevent spikes while keeping
  // seamless shared edges across all normal curves with zero circular end-caps.
  float cosHalf = max(dot(miterDir, nNext), 0.625);
  return miterDir * (padRadius / cosHalf);
}

void main() {
  // Double-single Relative-To-Center (RTC) subtraction eliminates float32 jitter at high zoom
  vec2 rel0 = (a_segmentHi.xy - u_camCenterHi) + (a_segmentLo.xy - u_camCenterLo);
  vec2 rel1 = (a_segmentHi.zw - u_camCenterHi) + (a_segmentLo.zw - u_camCenterLo);

  vec4 clip0 = u_matrix * vec4(rel0, 0.0, 1.0);
  vec4 clip1 = u_matrix * vec4(rel1, 0.0, 1.0);

  // Guard against degenerate perspective w
  if (clip0.w <= 0.0 || clip1.w <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_alongPx = 0.0;
    v_acrossPx = 0.0;
    v_halfLenPx = 0.0;
    v_radiusPx = u_radiusPx;
    v_capFlags = vec2(0.0);
    return;
  }

  vec2 ndc0 = clip0.xy / clip0.w;
  vec2 ndc1 = clip1.xy / clip1.w;

  // Quick offscreen frustum reject when both endpoints are outside NDC [-1.2..1.2]
  if (
    (ndc0.x < -1.2 && ndc1.x < -1.2) ||
    (ndc0.x >  1.2 && ndc1.x >  1.2) ||
    (ndc0.y < -1.2 && ndc1.y < -1.2) ||
    (ndc0.y >  1.2 && ndc1.y >  1.2)
  ) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_alongPx = 0.0;
    v_acrossPx = 0.0;
    v_halfLenPx = 0.0;
    v_radiusPx = u_radiusPx;
    v_capFlags = vec2(0.0);
    return;
  }

  vec2 p0 = (ndc0 * 0.5 + 0.5) * u_viewport;
  vec2 p1 = (ndc1 * 0.5 + 0.5) * u_viewport;

  vec2 delta = p1 - p0;
  float segLen = length(delta);
  vec2 dir = segLen > 1e-4 ? (delta / segLen) : vec2(1.0, 0.0);
  vec2 normal = vec2(-dir.y, dir.x);

  float halfLen = segLen * 0.5;
  float padRadius = u_radiusPx + u_aaPaddingPx;
  vec2 mid = (p0 + p1) * 0.5;

  bool hasPrevJoin = length(a_adjDirs.xy) > 0.5;
  bool hasNextJoin = length(a_adjDirs.zw) > 0.5;

  vec2 posPx;
  if (a_corner.x < 0.0) {
    if (hasPrevJoin && segLen > 1e-4) {
      vec2 dPrev = projectMercatorDir(clip0, a_adjDirs.xy);
      vec2 miter = length(dPrev) > 0.5 ? computeMiterOffset(dPrev, dir, padRadius) : (normal * padRadius);
      vec2 offset = miter * a_corner.y;
      // Prevent bow-tie self-intersection on very short curved segments at high thickness
      float alongShift = dot(offset, dir);
      if (alongShift > halfLen) {
        offset -= dir * (alongShift - halfLen);
      }
      posPx = p0 + offset;
    } else {
      // Open round start cap (track start or single-point dot)
      posPx = p0 - dir * padRadius + normal * (a_corner.y * padRadius);
    }
  } else {
    if (hasNextJoin && segLen > 1e-4) {
      vec2 dNext = projectMercatorDir(clip1, a_adjDirs.zw);
      vec2 miter = length(dNext) > 0.5 ? computeMiterOffset(dir, dNext, padRadius) : (normal * padRadius);
      vec2 offset = miter * a_corner.y;
      // Prevent bow-tie self-intersection on very short curved segments at high thickness
      float alongShift = dot(offset, dir);
      if (alongShift < -halfLen) {
        offset -= dir * (alongShift + halfLen);
      }
      posPx = p1 + offset;
    } else {
      // Open round end cap (track end, U-turn tip, or single-point dot)
      posPx = p1 + dir * padRadius + normal * (a_corner.y * padRadius);
    }
  }

  vec2 ndc = (posPx / u_viewport) * 2.0 - 1.0;

  gl_Position = vec4(ndc, 0.0, 1.0);
  v_alongPx = dot(posPx - mid, dir);
  v_acrossPx = dot(posPx - mid, normal);
  v_halfLenPx = halfLen;
  v_radiusPx = u_radiusPx;
  v_capFlags = vec2(
    (!hasPrevJoin || segLen <= 1e-4) ? 1.0 : 0.0,
    (!hasNextJoin || segLen <= 1e-4) ? 1.0 : 0.0
  );
}
`;

const RIBBON_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float v_alongPx;
in float v_acrossPx;
in float v_halfLenPx;
in float v_radiusPx;
flat in vec2 v_capFlags;

uniform float u_hitWeight;
uniform float u_aaPaddingPx;

out vec4 outColor;

void main() {
  // Continuous polyline ribbon distance:
  // - Between joined vertices: exact perpendicular distance abs(v_acrossPx) (no circular caps!)
  // - At open track start/end caps (or single-point dots): exact round cap distance
  float dist = abs(v_acrossPx);
  if (v_capFlags.x > 0.5 && v_alongPx < -v_halfLenPx) {
    dist = length(vec2(v_alongPx + v_halfLenPx, v_acrossPx));
  } else if (v_capFlags.y > 0.5 && v_alongPx > v_halfLenPx) {
    dist = length(vec2(v_alongPx - v_halfLenPx, v_acrossPx));
  }

  // Smooth Hermite antialiasing profile across the outer radial stroke edge
  float innerEdge = max(0.0, v_radiusPx - u_aaPaddingPx * 0.75);
  float outerEdge = v_radiusPx + u_aaPaddingPx * 0.85;
  float coverage = 1.0 - smoothstep(innerEdge, outerEdge, dist);
  if (coverage <= 0.001) {
    discard;
  }

  // densityFbo is RGBA16F: .r accumulates additive heat; .g/.b/.a are reserved
  // for future per-segment metric aggregations (average/max speed, temperature, etc.).
  outColor = vec4(u_hitWeight * coverage, 0.0, 0.0, 0.0);
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

  // Smoothly feather alpha along the outer antialiased fringe of strokes (0 < rawDensity < 0.88)
  float edgeAa = smoothstep(0.0, 0.88, rawDensity);
  float alpha = lutColor.a * u_transparency * edgeAa;

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
 * High-performance single-pass WebGL2 additive polyline-ribbon heatmap layer for MapLibre GL JS.
 *
 * Features:
 * - Continuous GPU-extruded polyline ribbon with miter/bevel joins and RDP simplification:
 *   eliminates circular end-cap overlap arcs/loops on bends while preserving full additive
 *   accumulation for same-activity loops, ski runs, walking in one area, and out-and-back rides.
 * - Double-Single Relative-To-Center (RTC) projection for zero jitter at high zoom.
 * - Physical ground-footprint power-law zoom calibration with user intensity & attenuation controls.
 * - `RGBA16F` density FBO ready for future per-segment metric overlays (speed, temperature).
 */
export class WebGL2HeatmapLayer implements CustomLayerInterface {
  readonly id = MAP_LAYER_IDS.ACTIVITIES_HEATMAP;
  readonly type = 'custom' as const;
  readonly renderingMode = '2d' as const;

  private map: MapLibreMap | null = null;
  private gl: WebGL2RenderingContext | null = null;

  private ribbonProgram: WebGLProgram | null = null;
  private compositeProgram: WebGLProgram | null = null;

  private quadVbo: WebGLBuffer | null = null;
  private fullSegmentVbo: WebGLBuffer | null = null;
  private mediumZoomSegmentVbo: WebGLBuffer | null = null;
  private lowZoomSegmentVbo: WebGLBuffer | null = null;
  private fullVao: WebGLVertexArrayObject | null = null;
  private mediumZoomVao: WebGLVertexArrayObject | null = null;
  private lowZoomVao: WebGLVertexArrayObject | null = null;
  private compositeVao: WebGLVertexArrayObject | null = null;

  private densityFbo: WebGLFramebuffer | null = null;
  private densityTex: WebGLTexture | null = null;
  private fboWidth = 0;
  private fboHeight = 0;
  private usesFloatFbo = false;
  private hasFloatLinear = false;

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

    this.ribbonProgram = createProgram(gl, RIBBON_VERTEX_SHADER, RIBBON_FRAGMENT_SHADER);
    this.compositeProgram = createProgram(gl, COMPOSITE_VERTEX_SHADER, COMPOSITE_FRAGMENT_SHADER);

    if (!this.ribbonProgram || !this.compositeProgram) {
      logger.error('Failed to initialize WebGL2 heatmap shader programs');
      return;
    }

    const floatExt =
      gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
    const floatLinearExt =
      gl.getExtension('OES_texture_float_linear') ||
      gl.getExtension('OES_texture_half_float_linear');
    this.usesFloatFbo = Boolean(floatExt);
    this.hasFloatLinear = Boolean(floatLinearExt);

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

    this.densityFbo = gl.createFramebuffer();
    this.densityTex = gl.createTexture();
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

    const strideBytes = FLOATS_PER_PACKED_SEGMENT * 4; // 48 bytes per instance

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

    // location 3: a_adjDirs [prevDx, prevDy, nextDx, nextDy]
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, strideBytes, 32);
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

  private ensureDensityFbo(gl: WebGL2RenderingContext, width: number, height: number): boolean {
    if (!this.densityFbo || !this.densityTex) {
      return false;
    }

    const maxTexSize = Math.min(
      MAX_MOBILE_SAFE_FBO_DIM,
      (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) || MAX_MOBILE_SAFE_FBO_DIM
    );
    const clampedW = Math.max(1, Math.min(maxTexSize, Math.round(width)));
    const clampedH = Math.max(1, Math.min(maxTexSize, Math.round(height)));

    if (clampedW === this.fboWidth && clampedH === this.fboHeight) {
      return true;
    }

    const filter = !this.usesFloatFbo || this.hasFloatLinear ? gl.LINEAR : gl.NEAREST;

    gl.bindTexture(gl.TEXTURE_2D, this.densityTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    if (this.usesFloatFbo) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        clampedW,
        clampedH,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        clampedW,
        clampedH,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityFbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.densityTex,
      0
    );

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      if (this.usesFloatFbo) {
        this.usesFloatFbo = false;
        this.fboWidth = 0;
        this.fboHeight = 0;
        return this.ensureDensityFbo(gl, width, height);
      }
      logger.error(`Density FBO incomplete: status=${status}`);
      return false;
    }

    this.fboWidth = clampedW;
    this.fboHeight = clampedH;
    return true;
  }

  prerender(gl: WebGL2RenderingContext, options: CustomRenderMethodInput): void {
    if (!this.map || !this.ribbonProgram || this.packedGeometry.fullSegmentCount === 0) {
      return;
    }

    this.uploadGeometryIfNeeded(gl);
    this.uploadLutIfNeeded(gl);

    const canvas = this.map.getCanvas();
    const dpr =
      typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio)
        ? Math.min(Math.max(window.devicePixelRatio, 1), 2)
        : 1;
    const normalizedDensity = Math.max(0.25, Math.min(3, this.options.heatmapDensity || 0.75));
    const resolutionScale = Math.min(2.0, dpr * Math.sqrt(normalizedDensity / 0.75));

    const cssW = canvas.clientWidth > 0 ? canvas.clientWidth : canvas.width;
    const cssH = canvas.clientHeight > 0 ? canvas.clientHeight : canvas.height;
    const targetW = cssW * resolutionScale;
    const targetH = cssH * resolutionScale;

    if (!this.ensureDensityFbo(gl, targetW, targetH)) {
      return;
    }

    const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const prevViewport = gl.getParameter(gl.VIEWPORT) as Int32Array;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityFbo);
    gl.viewport(0, 0, this.fboWidth, this.fboHeight);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);

    // Compute 64-bit Relative-To-Center (RTC) projection matrix on the CPU around the current map center
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

    gl.useProgram(this.ribbonProgram);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.ribbonProgram, 'u_matrix'),
      false,
      this.matrixF32
    );
    gl.uniform2f(gl.getUniformLocation(this.ribbonProgram, 'u_camCenterHi'), camXHi, camYHi);
    gl.uniform2f(gl.getUniformLocation(this.ribbonProgram, 'u_camCenterLo'), camXLo, camYLo);
    gl.uniform2f(
      gl.getUniformLocation(this.ribbonProgram, 'u_viewport'),
      this.fboWidth,
      this.fboHeight
    );

    const effectiveRenderScale = cssW > 0 ? this.fboWidth / cssW : resolutionScale;
    const baseRadiusCssPx = getHeatmapBrushRadiusCssPx(this.options.lineThickness);
    gl.uniform1f(
      gl.getUniformLocation(this.ribbonProgram, 'u_radiusPx'),
      baseRadiusCssPx * effectiveRenderScale
    );
    gl.uniform1f(
      gl.getUniformLocation(this.ribbonProgram, 'u_aaPaddingPx'),
      1.15 * effectiveRenderScale
    );

    const hitWeight = this.usesFloatFbo ? 1.0 : 1.0 / 255.0;
    gl.uniform1f(gl.getUniformLocation(this.ribbonProgram, 'u_hitWeight'), hitWeight);

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

    gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);
    gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
  }

  render(gl: WebGL2RenderingContext): void {
    if (
      !this.map ||
      !this.compositeProgram ||
      !this.densityTex ||
      !this.lutTex ||
      this.packedGeometry.fullSegmentCount === 0 ||
      this.fboWidth === 0
    ) {
      return;
    }

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);

    gl.useProgram(this.compositeProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.densityTex);
    gl.uniform1i(gl.getUniformLocation(this.compositeProgram, 'u_densityTex'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.uniform1i(gl.getUniformLocation(this.compositeProgram, 'u_lutTex'), 1);

    const densityScale = this.usesFloatFbo ? 1.0 : 255.0;
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
    if (this.ribbonProgram) {
      gl.deleteProgram(this.ribbonProgram);
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
    if (this.densityFbo) {
      gl.deleteFramebuffer(this.densityFbo);
    }
    if (this.densityTex) {
      gl.deleteTexture(this.densityTex);
    }
    if (this.lutTex) {
      gl.deleteTexture(this.lutTex);
    }

    this.ribbonProgram = null;
    this.compositeProgram = null;
    this.quadVbo = null;
    this.fullSegmentVbo = null;
    this.mediumZoomSegmentVbo = null;
    this.lowZoomSegmentVbo = null;
    this.fullVao = null;
    this.mediumZoomVao = null;
    this.lowZoomVao = null;
    this.compositeVao = null;
    this.densityFbo = null;
    this.densityTex = null;
    this.lutTex = null;
    this.fboWidth = 0;
    this.fboHeight = 0;
    this.map = null;
    this.gl = null;
  }
}
