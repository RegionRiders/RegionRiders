'use client';

import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MapLibreMap,
} from 'maplibre-gl';
import RBush from 'rbush';
import { MAP_LAYER_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import {
  lngLatToMercator,
  splitFloat64,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapGeometryPacker';
import { computeActivityFboResolution } from '@/components/ActivityMap/hooks/activity/utils/activityFboResolution';
import { getActivityLinePixelWidthFromControl } from '@/components/ActivityMap/hooks/activity/utils/activityThickness';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';

const logger = createComponentLogger('WebGL2LinesLayer');

const FLOATS_PER_LINE_SEGMENT = 9;
const STRIDE_BYTES = FLOATS_PER_LINE_SEGMENT * 4;

/**
 * Douglas-Peucker simplification tolerance in degrees (~8m at mid-latitudes).
 */
const RDP_SIMPLIFY_TOLERANCE_DEG = 0.00008;
const RDP_SIMPLIFY_TOLERANCE_SQ = RDP_SIMPLIFY_TOLERANCE_DEG * RDP_SIMPLIFY_TOLERANCE_DEG;

export interface ActivityLinesStyleOptions {
  lineThickness: number;
  lineColor: RGBA;
  lineHoverColor: RGBA;
  layerTransparency: number;
}

export interface LineTrackEntry {
  trackIndex: number;
  trackId: string;
  name: string;
  coords: [number, number][];
  startSegment: number;
  segmentCount: number;
}

interface IndexedLineTrack {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  trackIndex: number;
}

export interface PackedLinesData {
  segments: Float32Array;
  segmentCount: number;
  tracks: LineTrackEntry[];
  spatialIndex: RBush<IndexedLineTrack>;
}

function sqPointToSegmentDist(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  let x = x1;
  let y = y1;
  let dx = x2 - x1;
  let dy = y2 - y1;

  if (dx !== 0 || dy !== 0) {
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = x2;
      y = y2;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
}

/**
 * Iterative Ramer-Douglas-Peucker simplification on [lon, lat] coordinates
 * (non-recursive so long 25,000+ point tracks never risk stack overflow).
 */
export function simplifyCoordinatesRdp(
  coords: [number, number][],
  toleranceSq: number = RDP_SIMPLIFY_TOLERANCE_SQ
): [number, number][] {
  const len = coords.length;
  if (len <= 2 || toleranceSq <= 0) {
    return coords;
  }

  const keep = new Uint8Array(len);
  keep[0] = 1;
  keep[len - 1] = 1;

  const stack: number[] = [0, len - 1];

  while (stack.length > 0) {
    const end = stack.pop()!;
    const start = stack.pop()!;

    let maxSqDist = 0;
    let index = -1;
    const [x1, y1] = coords[start];
    const [x2, y2] = coords[end];

    for (let i = start + 1; i < end; i++) {
      const sqDist = sqPointToSegmentDist(coords[i][0], coords[i][1], x1, y1, x2, y2);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > toleranceSq && index !== -1) {
      keep[index] = 1;
      stack.push(start, index, index, end);
    }
  }

  const result: [number, number][] = [];
  for (let i = 0; i < len; i++) {
    if (keep[i]) {
      result.push(coords[i]);
    }
  }
  return result;
}

const packedLinesCache = new WeakMap<
  Map<string, GPXTrack>,
  { size: number; packed: PackedLinesData }
>();

export function packTracksForLines(tracks: Map<string, GPXTrack>): PackedLinesData {
  const cached = packedLinesCache.get(tracks);
  if (cached && cached.size === tracks.size) {
    return cached.packed;
  }

  const trackEntries: LineTrackEntry[] = [];
  const indexedItems: IndexedLineTrack[] = [];
  let totalSegments = 0;

  const simplifiedPerTrack: {
    trackId: string;
    name: string;
    coords: [number, number][];
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }[] = [];

  tracks.forEach((track, trackId) => {
    if (!track.points || track.points.length < 2) {
      return;
    }

    const rawCoordinates: [number, number][] = [];
    for (let i = 0; i < track.points.length; i++) {
      const point = track.points[i];
      if (Number.isFinite(point.lon) && Number.isFinite(point.lat)) {
        rawCoordinates.push([point.lon, point.lat]);
      }
    }

    if (rawCoordinates.length < 2) {
      return;
    }

    const coords = simplifyCoordinatesRdp(rawCoordinates);
    if (coords.length < 2) {
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < coords.length; i++) {
      const [lon, lat] = coords[i];
      if (lon < minX) {
        minX = lon;
      }
      if (lat < minY) {
        minY = lat;
      }
      if (lon > maxX) {
        maxX = lon;
      }
      if (lat > maxY) {
        maxY = lat;
      }
    }

    simplifiedPerTrack.push({
      trackId,
      name: track.name || trackId || 'Unknown Activity',
      coords,
      minX,
      minY,
      maxX,
      maxY,
    });
    totalSegments += coords.length - 1;
  });

  const segments = new Float32Array(totalSegments * FLOATS_PER_LINE_SEGMENT);
  let segCursor = 0;

  for (let trackIndex = 0; trackIndex < simplifiedPerTrack.length; trackIndex++) {
    const item = simplifiedPerTrack[trackIndex];
    const startSegment = segCursor;
    const segmentCount = item.coords.length - 1;

    const [prevMercX, prevMercY] = lngLatToMercator(item.coords[0][0], item.coords[0][1]);
    let [prevXHi, prevXLo] = splitFloat64(prevMercX);
    let [prevYHi, prevYLo] = splitFloat64(prevMercY);

    for (let i = 1; i < item.coords.length; i++) {
      const [nextMercX, nextMercY] = lngLatToMercator(item.coords[i][0], item.coords[i][1]);
      const [nextXHi, nextXLo] = splitFloat64(nextMercX);
      const [nextYHi, nextYLo] = splitFloat64(nextMercY);

      const offset = segCursor * FLOATS_PER_LINE_SEGMENT;
      segments[offset] = prevXHi;
      segments[offset + 1] = prevYHi;
      segments[offset + 2] = nextXHi;
      segments[offset + 3] = nextYHi;
      segments[offset + 4] = prevXLo;
      segments[offset + 5] = prevYLo;
      segments[offset + 6] = nextXLo;
      segments[offset + 7] = nextYLo;
      segments[offset + 8] = trackIndex;

      segCursor++;
      prevXHi = nextXHi;
      prevXLo = nextXLo;
      prevYHi = nextYHi;
      prevYLo = nextYLo;
    }

    trackEntries.push({
      trackIndex,
      trackId: item.trackId,
      name: item.name,
      coords: item.coords,
      startSegment,
      segmentCount,
    });

    indexedItems.push({
      minX: item.minX,
      minY: item.minY,
      maxX: item.maxX,
      maxY: item.maxY,
      trackIndex,
    });
  }

  const spatialIndex = new RBush<IndexedLineTrack>();
  spatialIndex.load(indexedItems);

  const packed: PackedLinesData = {
    segments,
    segmentCount: totalSegments,
    tracks: trackEntries,
    spatialIndex,
  };

  packedLinesCache.set(tracks, { size: tracks.size, packed });
  return packed;
}

const LINES_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec4 a_segmentHi;
layout(location = 2) in vec4 a_segmentLo;
layout(location = 3) in float a_trackIndex;

uniform mat4 u_matrix;
uniform vec2 u_camCenterHi;
uniform vec2 u_camCenterLo;
uniform vec2 u_viewport;
uniform float u_padPx;
uniform float u_hoveredTrackIndex;
uniform float u_totalTracks;

out vec2 v_alongAcrossPx;
flat out float v_halfLenPx;
flat out float v_trackZ;
flat out float v_trackStep;

void main() {
  if (u_hoveredTrackIndex >= -0.5 && abs(a_trackIndex - u_hoveredTrackIndex) < 0.25) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_alongAcrossPx = vec2(0.0);
    v_halfLenPx = 0.0;
    v_trackZ = 0.0;
    v_trackStep = 0.0;
    return;
  }

  vec2 rel0 = (a_segmentHi.xy - u_camCenterHi) + (a_segmentLo.xy - u_camCenterLo);
  vec2 rel1 = (a_segmentHi.zw - u_camCenterHi) + (a_segmentLo.zw - u_camCenterLo);

  vec4 clip0 = u_matrix * vec4(rel0, 0.0, 1.0);
  vec4 clip1 = u_matrix * vec4(rel1, 0.0, 1.0);

  if (clip0.w <= 0.0 || clip1.w <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_alongAcrossPx = vec2(0.0);
    v_halfLenPx = 0.0;
    v_trackZ = 0.0;
    v_trackStep = 0.0;
    return;
  }

  vec2 ndc0 = clip0.xy / clip0.w;
  vec2 ndc1 = clip1.xy / clip1.w;
  vec2 safeViewport = max(u_viewport, vec2(1.0));
  vec2 padNdc = (2.0 * u_padPx) / safeViewport + 0.05;

  if (
    (ndc0.x < -1.0 - padNdc.x && ndc1.x < -1.0 - padNdc.x) ||
    (ndc0.x >  1.0 + padNdc.x && ndc1.x >  1.0 + padNdc.x) ||
    (ndc0.y < -1.0 - padNdc.y && ndc1.y < -1.0 - padNdc.y) ||
    (ndc0.y >  1.0 + padNdc.y && ndc1.y >  1.0 + padNdc.y)
  ) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_alongAcrossPx = vec2(0.0);
    v_halfLenPx = 0.0;
    v_trackZ = 0.0;
    v_trackStep = 0.0;
    return;
  }

  vec2 p0 = (ndc0 * 0.5 + 0.5) * u_viewport;
  vec2 p1 = (ndc1 * 0.5 + 0.5) * u_viewport;
  vec2 delta = p1 - p0;
  float segLen = length(delta);
  vec2 dir = segLen > 1e-6 ? (delta / segLen) : vec2(1.0, 0.0);
  vec2 normal = vec2(-dir.y, dir.x);

  float halfLen = segLen * 0.5;
  vec2 mid = (p0 + p1) * 0.5;
  vec2 localPx = vec2(a_corner.x * (halfLen + u_padPx), a_corner.y * u_padPx);
  vec2 posPx = mid + dir * localPx.x + normal * localPx.y;

  float denom = max(u_totalTracks + 2.0, 3.0);
  float trackStep = 1.0 / denom;
  float trackZ = 1.0 - (a_trackIndex + 1.0) * trackStep;

  gl_Position = vec4((posPx / safeViewport) * 2.0 - 1.0, 0.0, 1.0);
  v_alongAcrossPx = localPx;
  v_halfLenPx = halfLen;
  v_trackZ = trackZ;
  v_trackStep = trackStep;
}
`;

const LINES_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_alongAcrossPx;
flat in float v_halfLenPx;
flat in float v_trackZ;
flat in float v_trackStep;

uniform float u_halfWidthPx;
uniform float u_alphaScale;
uniform vec4 u_color;

out vec4 outColor;

void main() {
  float clampedAlong = clamp(v_alongAcrossPx.x, -v_halfLenPx, v_halfLenPx);
  float distPx = length(vec2(v_alongAcrossPx.x - clampedAlong, v_alongAcrossPx.y));

  float coverage = (1.0 - smoothstep(u_halfWidthPx - 0.5, u_halfWidthPx + 0.5, distPx)) * u_alphaScale;
  if (coverage <= 0.001) {
    discard;
  }

  gl_FragDepth = v_trackZ + (1.0 - coverage) * v_trackStep * 0.5;
  outColor = u_color * coverage;
}
`;

const COMPOSITE_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_pos;

out vec2 v_uv;

void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const COMPOSITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_linesTex;
uniform float u_transparency;

out vec4 outColor;

void main() {
  vec4 texel = texture(u_linesTex, v_uv);
  if (texel.a <= 0.0005) {
    discard;
  }
  outColor = texel * u_transparency;
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
    logger.error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
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

function toPremultipliedRgba([r, g, b, a]: RGBA): [number, number, number, number] {
  const clampedA = Math.max(0, Math.min(1, a));
  return [
    (Math.max(0, Math.min(255, r)) / 255) * clampedA,
    (Math.max(0, Math.min(255, g)) / 255) * clampedA,
    (Math.max(0, Math.min(255, b)) / 255) * clampedA,
    clampedA,
  ];
}

export class WebGL2LinesLayer implements CustomLayerInterface {
  readonly id = MAP_LAYER_IDS.ACTIVITIES_LINES;
  readonly type = 'custom' as const;
  readonly renderingMode = '2d' as const;

  private map: MapLibreMap | null = null;
  private options: ActivityLinesStyleOptions;
  private packed: PackedLinesData;
  private hoveredTrackIndex: number = -1;

  private linesProgram: WebGLProgram | null = null;
  private compositeProgram: WebGLProgram | null = null;
  private quadVbo: WebGLBuffer | null = null;
  private segmentVbo: WebGLBuffer | null = null;
  private linesVao: WebGLVertexArrayObject | null = null;
  private compositeVao: WebGLVertexArrayObject | null = null;

  private fbo: WebGLFramebuffer | null = null;
  private fboTex: WebGLTexture | null = null;
  private depthRb: WebGLRenderbuffer | null = null;
  private fboWidth: number = 0;
  private fboHeight: number = 0;
  private fboReady: boolean = false;
  private geometryDirty: boolean = true;

  private readonly matrixF32 = new Float32Array(16);

  constructor(tracks: Map<string, GPXTrack>, options: ActivityLinesStyleOptions) {
    this.options = options;
    this.packed = packTracksForLines(tracks);
  }

  updateOptions(nextOptions: ActivityLinesStyleOptions): void {
    this.options = nextOptions;
    this.map?.triggerRepaint();
  }

  setHoveredTrackIndex(trackIndex: number): void {
    const normalized =
      Number.isInteger(trackIndex) && trackIndex >= 0 && trackIndex < this.packed.tracks.length
        ? trackIndex
        : -1;
    if (this.hoveredTrackIndex === normalized) {
      return;
    }
    this.hoveredTrackIndex = normalized;
    this.map?.triggerRepaint();
  }

  getHoveredTrackIndex(): number {
    return this.hoveredTrackIndex;
  }

  hitTest(
    point: { x: number; y: number },
    hitRadiusPx?: number
  ): { trackIndex: number; trackId: string; name: string } | null {
    if (!this.map || this.packed.tracks.length === 0) {
      return null;
    }

    const baseWidth = getActivityLinePixelWidthFromControl(this.options.lineThickness);
    const radiusPx = hitRadiusPx ?? Math.max(8, baseWidth * 0.5 + 5);
    const radiusSq = radiusPx * radiusPx;

    const sw = this.map.unproject([point.x - radiusPx, point.y + radiusPx]);
    const ne = this.map.unproject([point.x + radiusPx, point.y - radiusPx]);

    const minLon = Math.min(sw.lng, ne.lng);
    const maxLon = Math.max(sw.lng, ne.lng);
    const minLat = Math.min(sw.lat, ne.lat);
    const maxLat = Math.max(sw.lat, ne.lat);

    const candidates = this.packed.spatialIndex.search({
      minX: minLon,
      minY: minLat,
      maxX: maxLon,
      maxY: maxLat,
    });

    if (candidates.length === 0) {
      return null;
    }

    // Check in descending trackIndex order so the topmost rendered track wins.
    candidates.sort((a, b) => b.trackIndex - a.trackIndex);

    for (let c = 0; c < candidates.length; c++) {
      const entry = this.packed.tracks[candidates[c].trackIndex];
      const coords = entry.coords;

      let prevProjected = this.map.project(coords[0]);
      for (let i = 1; i < coords.length; i++) {
        const nextProjected = this.map.project(coords[i]);
        const sqDist = sqPointToSegmentDist(
          point.x,
          point.y,
          prevProjected.x,
          prevProjected.y,
          nextProjected.x,
          nextProjected.y
        );
        if (sqDist <= radiusSq) {
          return {
            trackIndex: entry.trackIndex,
            trackId: entry.trackId,
            name: entry.name,
          };
        }
        prevProjected = nextProjected;
      }
    }

    return null;
  }

  onAdd(map: MapLibreMap, gl: WebGL2RenderingContext): void {
    this.map = map;
    this.linesProgram = createProgram(gl, LINES_VERTEX_SHADER, LINES_FRAGMENT_SHADER);
    this.compositeProgram = createProgram(gl, COMPOSITE_VERTEX_SHADER, COMPOSITE_FRAGMENT_SHADER);

    if (!this.linesProgram || !this.compositeProgram) {
      logger.error('Failed to initialize WebGL2LinesLayer shader programs');
      return;
    }

    this.quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.segmentVbo = gl.createBuffer();
    this.geometryDirty = true;

    this.linesVao = gl.createVertexArray();
    gl.bindVertexArray(this.linesVao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    this.bindSegmentAttributes(gl, 0);
    gl.bindVertexArray(null);

    this.compositeVao = gl.createVertexArray();
    gl.bindVertexArray(this.compositeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.fbo = gl.createFramebuffer();
    this.fboTex = gl.createTexture();
    this.depthRb = gl.createRenderbuffer();
  }

  private bindSegmentAttributes(gl: WebGL2RenderingContext, byteOffset: number): void {
    if (!this.segmentVbo) {
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.segmentVbo);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, STRIDE_BYTES, byteOffset);
    gl.vertexAttribDivisor(1, 1);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, STRIDE_BYTES, byteOffset + 16);
    gl.vertexAttribDivisor(2, 1);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, STRIDE_BYTES, byteOffset + 32);
    gl.vertexAttribDivisor(3, 1);
  }

  private uploadGeometryIfNeeded(gl: WebGL2RenderingContext): void {
    if (!this.geometryDirty || !this.segmentVbo) {
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.segmentVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.packed.segments, gl.STATIC_DRAW);
    this.geometryDirty = false;
  }

  private ensureFbo(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    restoreFbo: WebGLFramebuffer | null
  ): boolean {
    if (this.fboWidth === width && this.fboHeight === height && this.fboReady) {
      return true;
    }
    if (!this.fbo || !this.fboTex || !this.depthRb) {
      return false;
    }

    gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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

    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRb);
    const depthFormat =
      typeof gl.DEPTH_COMPONENT24 === 'number' ? gl.DEPTH_COMPONENT24 : gl.DEPTH_COMPONENT16;
    gl.renderbufferStorage(gl.RENDERBUFFER, depthFormat, width, height);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthRb);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, restoreFbo);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      logger.error(`Lines FBO incomplete: status=${status}`);
      this.fboReady = false;
      return false;
    }

    this.fboWidth = width;
    this.fboHeight = height;
    this.fboReady = true;
    return true;
  }

  private resetFixedPipelineState(gl: WebGL2RenderingContext): void {
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
  }

  prerender(gl: WebGL2RenderingContext, options: CustomRenderMethodInput): void {
    const transparency = Math.max(0, Math.min(1, this.options.layerTransparency ?? 1));
    if (!this.map || !this.linesProgram || this.packed.segmentCount === 0 || transparency <= 0) {
      this.fboReady = false;
      return;
    }

    this.uploadGeometryIfNeeded(gl);

    const canvas = this.map.getCanvas();
    const cssW = canvas.clientWidth > 0 ? canvas.clientWidth : canvas.width;
    const cssH = canvas.clientHeight > 0 ? canvas.clientHeight : canvas.height;
    const glMaxTexSize = (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) || 0;
    const {
      width: fboW,
      height: fboH,
      effectiveScale: effectiveRenderScale,
    } = computeActivityFboResolution(cssW, cssH, glMaxTexSize, 'lines');

    const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const prevViewport = gl.getParameter(gl.VIEWPORT) as Int32Array | number[] | null;

    if (!this.ensureFbo(gl, fboW, fboH, prevFbo)) {
      return;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, fboW, fboH);
    this.resetFixedPipelineState(gl);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

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

    gl.useProgram(this.linesProgram);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.linesProgram, 'u_matrix'),
      false,
      this.matrixF32
    );
    gl.uniform2f(gl.getUniformLocation(this.linesProgram, 'u_camCenterHi'), camXHi, camYHi);
    gl.uniform2f(gl.getUniformLocation(this.linesProgram, 'u_camCenterLo'), camXLo, camYLo);
    gl.uniform2f(gl.getUniformLocation(this.linesProgram, 'u_viewport'), fboW, fboH);
    gl.uniform1f(
      gl.getUniformLocation(this.linesProgram, 'u_totalTracks'),
      this.packed.tracks.length
    );

    const baseWidth = getActivityLinePixelWidthFromControl(this.options.lineThickness);
    const rawBaseHalfWidthPx = baseWidth * 0.5 * effectiveRenderScale;
    const effectiveBaseHalfWidthPx = Math.max(rawBaseHalfWidthPx, 0.5);
    const baseAlphaScale = Math.min(1, rawBaseHalfWidthPx / 0.5);
    const baseColor = toPremultipliedRgba(this.options.lineColor);

    gl.bindVertexArray(this.linesVao);
    this.bindSegmentAttributes(gl, 0);

    if (baseColor[3] > 0) {
      gl.uniform1f(
        gl.getUniformLocation(this.linesProgram, 'u_halfWidthPx'),
        effectiveBaseHalfWidthPx
      );
      gl.uniform1f(gl.getUniformLocation(this.linesProgram, 'u_alphaScale'), baseAlphaScale);
      gl.uniform1f(
        gl.getUniformLocation(this.linesProgram, 'u_padPx'),
        effectiveBaseHalfWidthPx + 1.5
      );
      gl.uniform4f(
        gl.getUniformLocation(this.linesProgram, 'u_color'),
        baseColor[0],
        baseColor[1],
        baseColor[2],
        baseColor[3]
      );
      gl.uniform1f(
        gl.getUniformLocation(this.linesProgram, 'u_hoveredTrackIndex'),
        this.hoveredTrackIndex
      );

      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.packed.segmentCount);
    }

    if (this.hoveredTrackIndex >= 0 && this.hoveredTrackIndex < this.packed.tracks.length) {
      const hoveredEntry = this.packed.tracks[this.hoveredTrackIndex];
      const hoverColor = toPremultipliedRgba(this.options.lineHoverColor);
      if (hoverColor[3] > 0 && hoveredEntry.segmentCount > 0) {
        const rawHoverHalfWidthPx = baseWidth * effectiveRenderScale;
        const effectiveHoverHalfWidthPx = Math.max(rawHoverHalfWidthPx, 0.5);
        const hoverAlphaScale = Math.min(1, rawHoverHalfWidthPx / 0.5);

        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.uniform1f(
          gl.getUniformLocation(this.linesProgram, 'u_halfWidthPx'),
          effectiveHoverHalfWidthPx
        );
        gl.uniform1f(gl.getUniformLocation(this.linesProgram, 'u_alphaScale'), hoverAlphaScale);
        gl.uniform1f(
          gl.getUniformLocation(this.linesProgram, 'u_padPx'),
          effectiveHoverHalfWidthPx + 1.5
        );
        gl.uniform4f(
          gl.getUniformLocation(this.linesProgram, 'u_color'),
          hoverColor[0],
          hoverColor[1],
          hoverColor[2],
          hoverColor[3]
        );
        gl.uniform1f(gl.getUniformLocation(this.linesProgram, 'u_hoveredTrackIndex'), -1);

        this.bindSegmentAttributes(gl, hoveredEntry.startSegment * STRIDE_BYTES);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, hoveredEntry.segmentCount);
        this.bindSegmentAttributes(gl, 0);
      }
    }

    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);
    if (prevViewport && prevViewport.length >= 4) {
      gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
    }
  }

  render(gl: WebGL2RenderingContext, _options: CustomRenderMethodInput): void {
    const transparency = Math.max(0, Math.min(1, this.options.layerTransparency ?? 1));
    if (
      !this.fboReady ||
      !this.compositeProgram ||
      !this.compositeVao ||
      !this.fboTex ||
      transparency <= 0
    ) {
      return;
    }

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.compositeProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
    gl.uniform1i(gl.getUniformLocation(this.compositeProgram, 'u_linesTex'), 0);
    gl.uniform1f(gl.getUniformLocation(this.compositeProgram, 'u_transparency'), transparency);

    gl.bindVertexArray(this.compositeVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  onRemove(_map: MapLibreMap, gl: WebGL2RenderingContext): void {
    if (this.linesProgram) {
      gl.deleteProgram(this.linesProgram);
    }
    if (this.compositeProgram) {
      gl.deleteProgram(this.compositeProgram);
    }
    if (this.quadVbo) {
      gl.deleteBuffer(this.quadVbo);
    }
    if (this.segmentVbo) {
      gl.deleteBuffer(this.segmentVbo);
    }
    if (this.linesVao) {
      gl.deleteVertexArray(this.linesVao);
    }
    if (this.compositeVao) {
      gl.deleteVertexArray(this.compositeVao);
    }
    if (this.fbo) {
      gl.deleteFramebuffer(this.fbo);
    }
    if (this.fboTex) {
      gl.deleteTexture(this.fboTex);
    }
    if (this.depthRb) {
      gl.deleteRenderbuffer(this.depthRb);
    }

    this.linesProgram = null;
    this.compositeProgram = null;
    this.quadVbo = null;
    this.segmentVbo = null;
    this.linesVao = null;
    this.compositeVao = null;
    this.fbo = null;
    this.fboTex = null;
    this.depthRb = null;
    this.fboReady = false;
    this.map = null;
  }
}
