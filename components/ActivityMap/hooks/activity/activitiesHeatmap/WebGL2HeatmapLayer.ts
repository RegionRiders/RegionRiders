'use client';

import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MapLibreMap,
} from 'maplibre-gl';
import { MAP_LAYER_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import {
  PackedHeatmapGeometry,
  packTracksForHeatmap,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapGeometryPacker';
import {
  buildHeatmapColorLut,
  getHeatmapZoomScale,
  HeatmapLutData,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapLutBuilder';
import { getActivityLineRadiusFromControl } from '@/components/ActivityMap/hooks/activity/utils/activityThickness';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';

const logger = createComponentLogger('WebGL2HeatmapLayer');
const LOW_ZOOM_LOD_THRESHOLD = 7.5;

export interface WebGL2HeatmapOptions {
  lineThickness: number;
  layerTransparency: number;
  heatmapDensity: number;
  colorThresholds?: ColorThreshold[];
}

const CAPSULE_VERTEX_SHADER = `#version 300 es
precision highp float;

// Per-vertex quad corner: x in [-1, 1] along segment, y in [-1, 1] across segment
layout(location = 0) in vec2 a_corner;
// Per-instance Mercator segment [x0, y0, x1, y1]
layout(location = 1) in vec4 a_segment;

uniform mat4 u_matrix;
uniform vec2 u_viewport;
uniform float u_radiusPx;

out vec2 v_localPx;
out float v_halfLenPx;
out float v_radiusPx;

void main() {
  vec4 clip0 = u_matrix * vec4(a_segment.xy, 0.0, 1.0);
  vec4 clip1 = u_matrix * vec4(a_segment.zw, 0.0, 1.0);

  // Guard against degenerate perspective w
  if (clip0.w <= 0.0 || clip1.w <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_localPx = vec2(0.0);
    v_halfLenPx = 0.0;
    v_radiusPx = u_radiusPx;
    return;
  }

  vec2 ndc0 = clip0.xy / clip0.w;
  vec2 ndc1 = clip1.xy / clip1.w;

  vec2 p0 = (ndc0 * 0.5 + 0.5) * u_viewport;
  vec2 p1 = (ndc1 * 0.5 + 0.5) * u_viewport;

  vec2 delta = p1 - p0;
  float segLen = length(delta);
  vec2 dir = segLen > 1e-4 ? (delta / segLen) : vec2(1.0, 0.0);
  vec2 normal = vec2(-dir.y, dir.x);

  float halfLen = segLen * 0.5;
  float padRadius = u_radiusPx + 1.0; // +1px AA fringe
  vec2 mid = (p0 + p1) * 0.5;

  float along = a_corner.x * (halfLen + padRadius);
  float across = a_corner.y * padRadius;

  vec2 posPx = mid + dir * along + normal * across;
  vec2 ndc = (posPx / u_viewport) * 2.0 - 1.0;

  gl_Position = vec4(ndc, 0.0, 1.0);
  v_localPx = vec2(along, across);
  v_halfLenPx = halfLen;
  v_radiusPx = u_radiusPx;
}
`;

const CAPSULE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_localPx;
in float v_halfLenPx;
in float v_radiusPx;

uniform float u_hitWeight;

out vec4 outColor;

void main() {
  // Signed distance to capsule centered at origin along X axis
  float clampedX = clamp(v_localPx.x, -v_halfLenPx, v_halfLenPx);
  float dist = length(v_localPx - vec2(clampedX, 0.0));
  // Smooth 1px edge antialiasing (replaces CPU smoothHeatmapEdges)
  float coverage = 1.0 - smoothstep(max(0.0, v_radiusPx - 0.65), v_radiusPx + 0.65, dist);
  if (coverage <= 0.001) {
    discard;
  }
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
uniform float u_zoomScale;
uniform float u_logMaxThreshold;
uniform float u_transparency;

out vec4 outColor;

void main() {
  float rawDensity = texture(u_densityTex, v_uv).r * u_densityScale;
  if (rawDensity <= 0.001) {
    discard;
  }

  float uniqueActivities = rawDensity * u_zoomScale;
  float u = clamp(log(1.0 + uniqueActivities) / max(0.0001, u_logMaxThreshold), 1.0 / 511.0, 1.0);
  vec4 lutColor = texture(u_lutTex, vec2(u, 0.5));
  float alpha = lutColor.a * u_transparency;
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
 * High-performance WebGL2 additive route heatmap layer for MapLibre GL JS.
 * Uses MapLibre's `prerender` hook for offscreen additive density accumulation
 * and `render` for logarithmic Color LUT compositing at 60 FPS during pan & zoom.
 */
export class WebGL2HeatmapLayer implements CustomLayerInterface {
  readonly id = MAP_LAYER_IDS.ACTIVITIES_HEATMAP;
  readonly type = 'custom' as const;
  readonly renderingMode = '2d' as const;

  private map: MapLibreMap | null = null;
  private gl: WebGL2RenderingContext | null = null;

  private capsuleProgram: WebGLProgram | null = null;
  private compositeProgram: WebGLProgram | null = null;

  private quadVbo: WebGLBuffer | null = null;
  private fullSegmentVbo: WebGLBuffer | null = null;
  private lowZoomSegmentVbo: WebGLBuffer | null = null;
  private fullVao: WebGLVertexArrayObject | null = null;
  private lowZoomVao: WebGLVertexArrayObject | null = null;
  private compositeVao: WebGLVertexArrayObject | null = null;

  private densityFbo: WebGLFramebuffer | null = null;
  private densityTex: WebGLTexture | null = null;
  private fboWidth = 0;
  private fboHeight = 0;
  private usesFloatFbo = false;

  private lutTex: WebGLTexture | null = null;
  private lutData: HeatmapLutData;

  private packedGeometry: PackedHeatmapGeometry;
  private geometryDirty = true;
  private lutDirty = true;

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

    this.capsuleProgram = createProgram(gl, CAPSULE_VERTEX_SHADER, CAPSULE_FRAGMENT_SHADER);
    this.compositeProgram = createProgram(gl, COMPOSITE_VERTEX_SHADER, COMPOSITE_FRAGMENT_SHADER);

    if (!this.capsuleProgram || !this.compositeProgram) {
      logger.error('Failed to initialize WebGL2 heatmap shader programs');
      return;
    }

    // Check float FBO support for high-dynamic-range additive density accumulation
    const floatExt =
      gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
    this.usesFloatFbo = Boolean(floatExt);

    this.quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.fullSegmentVbo = gl.createBuffer();
    this.lowZoomSegmentVbo = gl.createBuffer();

    this.fullVao = this.createInstancedVao(gl, this.fullSegmentVbo);
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

    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, segmentVbo);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);

    gl.bindVertexArray(null);
    return vao;
  }

  private uploadGeometryIfNeeded(gl: WebGL2RenderingContext): void {
    if (!this.geometryDirty || !this.fullSegmentVbo || !this.lowZoomSegmentVbo) {
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.fullSegmentVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.packedGeometry.fullSegments, gl.STATIC_DRAW);

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

    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const clampedW = Math.max(1, Math.min(maxTexSize, Math.round(width)));
    const clampedH = Math.max(1, Math.min(maxTexSize, Math.round(height)));

    if (clampedW === this.fboWidth && clampedH === this.fboHeight) {
      return true;
    }

    gl.bindTexture(gl.TEXTURE_2D, this.densityTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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
        // Fallback to RGBA8 if RGBA16F attachment is unsupported on this device
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
    if (!this.map || !this.capsuleProgram || this.packedGeometry.fullSegmentCount === 0) {
      return;
    }

    this.uploadGeometryIfNeeded(gl);
    this.uploadLutIfNeeded(gl);

    const canvas = this.map.getCanvas();
    const densityFactor = Math.max(0.25, Math.min(3, this.options.heatmapDensity || 1));
    const targetW = canvas.clientWidth > 0 ? canvas.clientWidth * densityFactor : canvas.width;
    const targetH = canvas.clientHeight > 0 ? canvas.clientHeight * densityFactor : canvas.height;

    if (!this.ensureDensityFbo(gl, targetW, targetH)) {
      return;
    }

    const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const prevViewport = gl.getParameter(gl.VIEWPORT) as Int32Array;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityFbo);
    gl.viewport(0, 0, this.fboWidth, this.fboHeight);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(this.capsuleProgram);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.capsuleProgram, 'u_matrix'),
      false,
      options.modelViewProjectionMatrix
    );
    gl.uniform2f(
      gl.getUniformLocation(this.capsuleProgram, 'u_viewport'),
      this.fboWidth,
      this.fboHeight
    );

    const baseRadiusPx = getActivityLineRadiusFromControl(this.options.lineThickness) + 0.5;
    gl.uniform1f(
      gl.getUniformLocation(this.capsuleProgram, 'u_radiusPx'),
      baseRadiusPx * densityFactor
    );

    // In RGBA8 fallback, scale each hit by 1/255 so up to 255 overlapping passes fit without clipping
    const hitWeight = this.usesFloatFbo ? 1.0 : 1.0 / 255.0;
    gl.uniform1f(gl.getUniformLocation(this.capsuleProgram, 'u_hitWeight'), hitWeight);

    const useLowZoom = this.map.getZoom() < LOW_ZOOM_LOD_THRESHOLD;
    const vao = useLowZoom ? this.lowZoomVao : this.fullVao;
    const count = useLowZoom
      ? this.packedGeometry.lowZoomSegmentCount
      : this.packedGeometry.fullSegmentCount;

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

    gl.useProgram(this.compositeProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.densityTex);
    gl.uniform1i(gl.getUniformLocation(this.compositeProgram, 'u_densityTex'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.uniform1i(gl.getUniformLocation(this.compositeProgram, 'u_lutTex'), 1);

    const densityScale = this.usesFloatFbo ? 1.0 : 255.0;
    const zoomScale = getHeatmapZoomScale(this.map.getZoom());
    const transparency = Math.max(0, Math.min(1, this.options.layerTransparency ?? 1));

    gl.uniform1f(gl.getUniformLocation(this.compositeProgram, 'u_densityScale'), densityScale);
    gl.uniform1f(gl.getUniformLocation(this.compositeProgram, 'u_zoomScale'), zoomScale);
    gl.uniform1f(
      gl.getUniformLocation(this.compositeProgram, 'u_logMaxThreshold'),
      Math.log1p(this.lutData.maxThreshold)
    );
    gl.uniform1f(gl.getUniformLocation(this.compositeProgram, 'u_transparency'), transparency);

    gl.enable(gl.BLEND);
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
    if (this.capsuleProgram) {
      gl.deleteProgram(this.capsuleProgram);
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
    if (this.lowZoomSegmentVbo) {
      gl.deleteBuffer(this.lowZoomSegmentVbo);
    }
    if (this.fullVao) {
      gl.deleteVertexArray(this.fullVao);
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

    this.capsuleProgram = null;
    this.compositeProgram = null;
    this.quadVbo = null;
    this.fullSegmentVbo = null;
    this.lowZoomSegmentVbo = null;
    this.fullVao = null;
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
