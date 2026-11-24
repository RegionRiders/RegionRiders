import type { CustomRenderMethodInput } from 'maplibre-gl';
import { getHeatmapBrushRadiusCssPx } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapLutBuilder';
import {
  computeGaussianBlurTaps,
  computeLowZoomTrackBoost,
  erfcApprox,
  MAX_BLUR_PAIRS,
  SIGMA_0_PX,
  WebGL2HeatmapLayer,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/WebGL2HeatmapLayer';
import { GPXTrack } from '@/lib/types';
import { createMockMapLibreInstance } from '@/test-utils/maplibreMock';

interface MockHandle {
  id: number;
  kind: 'shader' | 'program' | 'buffer' | 'vao' | 'fbo' | 'texture';
  type?: number;
}

interface MockUniformLocation {
  program: MockHandle;
  name: string;
}

interface MockTextureMeta {
  internalFormat?: number;
  width?: number;
  height?: number;
  format?: number;
  type?: number;
  minFilter?: number;
  magFilter?: number;
  wrapS?: number;
  wrapT?: number;
}

interface MockDrawCallSnapshot {
  api: 'drawArraysInstanced' | 'drawArrays';
  mode: number;
  first: number;
  count: number;
  instanceCount?: number;
  program: MockHandle | null;
  fbo: MockHandle | null;
  targetTex: MockHandle | null;
  viewport: number[];
  blendEnabled: boolean;
  blendEquation: number;
  blendFunc: [number, number];
  scissorTestEnabled: boolean;
  textures: {
    0: MockHandle | null;
    1: MockHandle | null;
  };
  uniforms: Record<string, unknown>;
}

interface MockWebGL2Config {
  extensions?: Record<string, object | null>;
  incompleteFloatFbo?: boolean;
  initialViewport?: [number, number, number, number];
  maxTextureSize?: number;
}

interface MockWebGLState {
  created: {
    programs: MockHandle[];
    buffers: MockHandle[];
    vaos: MockHandle[];
    fbos: MockHandle[];
    textures: MockHandle[];
  };
  deleted: {
    programs: MockHandle[];
    buffers: MockHandle[];
    vaos: MockHandle[];
    fbos: MockHandle[];
    textures: MockHandle[];
  };
  nullOrDuplicateDeletes: string[];
  errors: string[];
  textureMeta: Map<MockHandle, MockTextureMeta>;
  fboAttachments: Map<MockHandle, MockHandle | null>;
  vertexAttribPointers: Array<{
    index: number;
    size: number;
    type: number;
    normalized: boolean;
    stride: number;
    offset: number;
  }>;
  texParameterCalls: Array<{ pname: number; param: number }>;
  drawCalls: MockDrawCallSnapshot[];
}

function createMockWebGL2Context(config: MockWebGL2Config = {}) {
  let nextId = 1;
  const extensions = config.extensions ?? { EXT_color_buffer_float: {} };
  const initialViewport = config.initialViewport ?? [0, 0, 800, 600];
  const maxTextureSize = config.maxTextureSize ?? 4096;

  const RGBA16F = 0x881a;
  const RGBA8 = 0x8058;
  const FRAMEBUFFER_COMPLETE = 0x8cd5;
  const FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 0x8cd6;
  const FRAMEBUFFER_BINDING = 0x8ca6;
  const VIEWPORT = 0x0ba2;
  const MAX_TEXTURE_SIZE = 0x0d33;
  const BLEND = 0x0be2;
  const SCISSOR_TEST = 0x0c11;
  const TEXTURE0 = 0x84c0;
  const TEXTURE1 = 0x84c1;
  const TEXTURE2 = 0x84c2;
  const TEXTURE_MIN_FILTER = 0x2801;
  const TEXTURE_MAG_FILTER = 0x2800;
  const TEXTURE_WRAP_S = 0x2802;
  const TEXTURE_WRAP_T = 0x2803;

  let currentProgram: MockHandle | null = null;
  let boundFbo: MockHandle | null = null;
  let currentViewport: number[] = [...initialViewport];
  let activeTextureUnit = TEXTURE0;
  let blendEnabled = false;
  let blendEq = 0x8006;
  let blendSrc = 1;
  let blendDst = 0;
  let scissorTestEnabled = false;
  const boundTextures = new Map<number, MockHandle | null>();
  const programUniforms = new Map<MockHandle, Map<string, unknown>>();

  const state: MockWebGLState = {
    created: {
      programs: [],
      buffers: [],
      vaos: [],
      fbos: [],
      textures: [],
    },
    deleted: {
      programs: [],
      buffers: [],
      vaos: [],
      fbos: [],
      textures: [],
    },
    nullOrDuplicateDeletes: [],
    errors: [],
    textureMeta: new Map(),
    fboAttachments: new Map(),
    vertexAttribPointers: [],
    texParameterCalls: [],
    drawCalls: [],
  };

  function trackDelete(
    kind: keyof MockWebGLState['deleted'],
    handle: MockHandle | null | undefined
  ) {
    if (!handle) {
      state.nullOrDuplicateDeletes.push(`delete ${kind}: null/undefined`);
      return;
    }
    if (state.deleted[kind].includes(handle)) {
      state.nullOrDuplicateDeletes.push(`delete ${kind}: duplicate id=${handle.id}`);
      return;
    }
    state.deleted[kind].push(handle);
  }

  function recordUniform(location: MockUniformLocation | null | undefined, value: unknown): void {
    if (!location) {
      state.errors.push('Uniform set with null location');
      return;
    }
    if (!currentProgram || location.program !== currentProgram) {
      state.errors.push(
        `Uniform ${location.name} set for inactive program (loc=${location.program.id}, active=${currentProgram?.id ?? 'none'})`
      );
      return;
    }
    let uniforms = programUniforms.get(currentProgram);
    if (!uniforms) {
      uniforms = new Map();
      programUniforms.set(currentProgram, uniforms);
    }
    uniforms.set(location.name, value);
  }

  function snapshotDraw(
    api: 'drawArraysInstanced' | 'drawArrays',
    mode: number,
    first: number,
    count: number,
    instanceCount?: number
  ): void {
    const uniformsMap = currentProgram ? programUniforms.get(currentProgram) : undefined;
    const targetTex = boundFbo ? (state.fboAttachments.get(boundFbo) ?? null) : null;
    state.drawCalls.push({
      api,
      mode,
      first,
      count,
      instanceCount,
      program: currentProgram,
      fbo: boundFbo,
      targetTex,
      viewport: [...currentViewport],
      blendEnabled,
      blendEquation: blendEq,
      blendFunc: [blendSrc, blendDst],
      scissorTestEnabled,
      textures: {
        0: boundTextures.get(TEXTURE0) ?? null,
        1: boundTextures.get(TEXTURE1) ?? null,
      },
      uniforms: uniformsMap ? Object.fromEntries(uniformsMap) : {},
    });
  }

  const gl = {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    TEXTURE_2D: 0x0de1,
    TEXTURE_MIN_FILTER,
    TEXTURE_MAG_FILTER,
    TEXTURE_WRAP_S,
    TEXTURE_WRAP_T,
    LINEAR: 0x2601,
    NEAREST: 0x2600,
    CLAMP_TO_EDGE: 0x812f,
    RGBA: 0x1908,
    RGBA8,
    RGBA16F,
    HALF_FLOAT: 0x140b,
    UNSIGNED_BYTE: 0x1401,
    FRAMEBUFFER: 0x8d40,
    COLOR_ATTACHMENT0: 0x8ce0,
    FRAMEBUFFER_COMPLETE,
    FRAMEBUFFER_INCOMPLETE_ATTACHMENT,
    FRAMEBUFFER_BINDING,
    VIEWPORT,
    MAX_TEXTURE_SIZE,
    DEPTH_TEST: 0x0b71,
    STENCIL_TEST: 0x0b90,
    CULL_FACE: 0x0b44,
    SCISSOR_TEST,
    COLOR_BUFFER_BIT: 0x4000,
    BLEND,
    FUNC_ADD: 0x8006,
    ONE: 1,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    TRIANGLE_STRIP: 0x0005,
    TEXTURE0,
    TEXTURE1,
    TEXTURE2,
    _state: state,
    createShader: jest.fn((type: number): MockHandle => {
      const handle: MockHandle = { id: nextId, kind: 'shader', type };
      nextId += 1;
      return handle;
    }),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(() => true),
    getShaderInfoLog: jest.fn(() => ''),
    deleteShader: jest.fn(),
    createProgram: jest.fn((): MockHandle => {
      const handle: MockHandle = { id: nextId, kind: 'program' };
      nextId += 1;
      state.created.programs.push(handle);
      return handle;
    }),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    getProgramInfoLog: jest.fn(() => ''),
    deleteProgram: jest.fn((program: MockHandle | null | undefined) =>
      trackDelete('programs', program)
    ),
    useProgram: jest.fn((program: MockHandle | null) => {
      currentProgram = program;
    }),
    getUniformLocation: jest.fn(
      (program: MockHandle | null, name: string): MockUniformLocation | null => {
        if (!program) {
          return null;
        }
        return { program, name };
      }
    ),
    uniformMatrix4fv: jest.fn(
      (location: MockUniformLocation | null, _transpose: boolean, data: Float32Array) => {
        recordUniform(location, Array.from(data));
      }
    ),
    uniform2f: jest.fn((location: MockUniformLocation | null, x: number, y: number) => {
      recordUniform(location, [x, y]);
    }),
    uniform1f: jest.fn((location: MockUniformLocation | null, v: number) => {
      recordUniform(location, v);
    }),
    uniform1i: jest.fn((location: MockUniformLocation | null, v: number) => {
      recordUniform(location, v);
    }),
    uniform1fv: jest.fn((location: MockUniformLocation | null, data: Float32Array | number[]) => {
      recordUniform(location, Array.from(data));
    }),
    uniform2fv: jest.fn((location: MockUniformLocation | null, data: Float32Array | number[]) => {
      recordUniform(location, Array.from(data));
    }),
    getExtension: jest.fn((name: string) => (name in extensions ? extensions[name] : null)),
    createBuffer: jest.fn((): MockHandle => {
      const handle: MockHandle = { id: nextId, kind: 'buffer' };
      nextId += 1;
      state.created.buffers.push(handle);
      return handle;
    }),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    deleteBuffer: jest.fn((buffer: MockHandle | null | undefined) =>
      trackDelete('buffers', buffer)
    ),
    createVertexArray: jest.fn((): MockHandle => {
      const handle: MockHandle = { id: nextId, kind: 'vao' };
      nextId += 1;
      state.created.vaos.push(handle);
      return handle;
    }),
    bindVertexArray: jest.fn(),
    deleteVertexArray: jest.fn((vao: MockHandle | null | undefined) => trackDelete('vaos', vao)),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(
      (
        index: number,
        size: number,
        type: number,
        normalized: boolean,
        stride: number,
        offset: number
      ) => {
        state.vertexAttribPointers.push({ index, size, type, normalized, stride, offset });
      }
    ),
    vertexAttribDivisor: jest.fn(),
    createFramebuffer: jest.fn((): MockHandle => {
      const handle: MockHandle = { id: nextId, kind: 'fbo' };
      nextId += 1;
      state.created.fbos.push(handle);
      return handle;
    }),
    bindFramebuffer: jest.fn((_target: number, fbo: MockHandle | null) => {
      boundFbo = fbo;
    }),
    framebufferTexture2D: jest.fn(
      (_target: number, _attachment: number, _textarget: number, tex: MockHandle | null) => {
        if (boundFbo) {
          state.fboAttachments.set(boundFbo, tex);
        }
      }
    ),
    checkFramebufferStatus: jest.fn(() => {
      if (config.incompleteFloatFbo && boundFbo) {
        const attachedTex = state.fboAttachments.get(boundFbo);
        const meta = attachedTex ? state.textureMeta.get(attachedTex) : undefined;
        if (meta?.internalFormat === RGBA16F) {
          return FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
        }
      }
      return FRAMEBUFFER_COMPLETE;
    }),
    deleteFramebuffer: jest.fn((fbo: MockHandle | null | undefined) => trackDelete('fbos', fbo)),
    createTexture: jest.fn((): MockHandle => {
      const handle: MockHandle = { id: nextId, kind: 'texture' };
      nextId += 1;
      state.created.textures.push(handle);
      state.textureMeta.set(handle, {});
      return handle;
    }),
    bindTexture: jest.fn((_target: number, tex: MockHandle | null) => {
      boundTextures.set(activeTextureUnit, tex);
    }),
    texParameteri: jest.fn((_target: number, pname: number, param: number) => {
      state.texParameterCalls.push({ pname, param });
      const boundTex = boundTextures.get(activeTextureUnit);
      if (boundTex) {
        const meta = state.textureMeta.get(boundTex) ?? {};
        if (pname === TEXTURE_MIN_FILTER) {
          meta.minFilter = param;
        } else if (pname === TEXTURE_MAG_FILTER) {
          meta.magFilter = param;
        } else if (pname === TEXTURE_WRAP_S) {
          meta.wrapS = param;
        } else if (pname === TEXTURE_WRAP_T) {
          meta.wrapT = param;
        }
        state.textureMeta.set(boundTex, meta);
      }
    }),
    texImage2D: jest.fn(
      (
        _target: number,
        _level: number,
        internalFormat: number,
        width: number,
        height: number,
        _border: number,
        format: number,
        type: number
      ) => {
        const boundTex = boundTextures.get(activeTextureUnit);
        if (boundTex) {
          const meta = state.textureMeta.get(boundTex) ?? {};
          meta.internalFormat = internalFormat;
          meta.width = width;
          meta.height = height;
          meta.format = format;
          meta.type = type;
          state.textureMeta.set(boundTex, meta);
        }
      }
    ),
    deleteTexture: jest.fn((tex: MockHandle | null | undefined) => trackDelete('textures', tex)),
    activeTexture: jest.fn((unit: number) => {
      activeTextureUnit = unit;
    }),
    getParameter: jest.fn((param: number) => {
      if (param === MAX_TEXTURE_SIZE) {
        return maxTextureSize;
      }
      if (param === VIEWPORT) {
        return new Int32Array(currentViewport);
      }
      if (param === FRAMEBUFFER_BINDING) {
        return boundFbo;
      }
      return null;
    }),
    viewport: jest.fn((x: number, y: number, w: number, h: number) => {
      currentViewport = [x, y, w, h];
    }),
    disable: jest.fn((cap: number) => {
      if (cap === BLEND) {
        blendEnabled = false;
      } else if (cap === SCISSOR_TEST) {
        scissorTestEnabled = false;
      }
    }),
    enable: jest.fn((cap: number) => {
      if (cap === BLEND) {
        blendEnabled = true;
      } else if (cap === SCISSOR_TEST) {
        scissorTestEnabled = true;
      }
    }),
    colorMask: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    blendEquation: jest.fn((mode: number) => {
      blendEq = mode;
    }),
    blendFunc: jest.fn((sfactor: number, dfactor: number) => {
      blendSrc = sfactor;
      blendDst = dfactor;
    }),
    drawArraysInstanced: jest.fn(
      (mode: number, first: number, count: number, instanceCount: number) => {
        snapshotDraw('drawArraysInstanced', mode, first, count, instanceCount);
      }
    ),
    drawArrays: jest.fn((mode: number, first: number, count: number) => {
      snapshotDraw('drawArrays', mode, first, count);
    }),
  };

  return gl as unknown as WebGL2RenderingContext & { _state: MockWebGLState };
}

function createRenderInput(): CustomRenderMethodInput {
  const mainMatrixF64 = new Float64Array([2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, -1.0, -0.5, 0, 1]);
  return {
    farZ: 1000,
    nearZ: 1,
    fov: 0.6,
    modelViewProjectionMatrix: new Float64Array(16) as unknown as mat4Like,
    projectionMatrix: new Float64Array(16) as unknown as mat4Like,
    defaultProjectionData: {
      mainMatrix: mainMatrixF64 as unknown as ProjectionMatrixLike,
      fallbackMatrix: mainMatrixF64 as unknown as ProjectionMatrixLike,
      tileMercatorCoords: [0, 0, 1, 1],
      clippingPlane: [0, 0, 0, 0],
      projectionTransition: 0,
      clipAntimeridian: false,
    },
    shaderData: { variantName: 'mercator', vertexShaderPrelude: '', define: '' },
    getProjectionData: jest.fn(),
  };
}

type mat4Like = CustomRenderMethodInput['modelViewProjectionMatrix'];
type ProjectionMatrixLike = NonNullable<
  CustomRenderMethodInput['defaultProjectionData']
>['mainMatrix'];

function withDevicePixelRatio<T>(dpr: number, fn: () => T): T {
  const prevDesc = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: dpr,
  });
  try {
    return fn();
  } finally {
    if (prevDesc) {
      Object.defineProperty(window, 'devicePixelRatio', prevDesc);
    } else {
      delete (window as unknown as Record<string, unknown>).devicePixelRatio;
    }
  }
}

function erfDiffFloat32(u0: number, u1: number): number {
  const f0 = Math.fround(u0);
  const f1 = Math.fround(u1);
  if (f0 > 0) {
    return Math.fround(erfcApprox(f0) - erfcApprox(f1));
  }
  if (f1 < 0) {
    return Math.fround(erfcApprox(Math.fround(-f1)) - erfcApprox(Math.fround(-f0)));
  }
  return Math.fround(
    Math.fround(1 - erfcApprox(f1)) + Math.fround(1 - erfcApprox(Math.fround(-f0)))
  );
}

function evalStage1SegmentDensityFloat32(
  alongPx: number,
  acrossPx: number,
  halfLenPx: number,
  sigma0: number = SIGMA_0_PX
): number {
  const invSqrt2Pi = Math.fround(0.3989422804014327);
  const inv2Pi = Math.fround(0.15915494309189535);
  const invSqrt2 = Math.fround(0.7071067811865476);
  const s0 = Math.fround(sigma0);
  const a = Math.fround(alongPx);
  const y = Math.fround(acrossPx);
  const h = Math.fround(halfLenPx);
  const invTwoS0Sq = Math.fround(1 / (2 * s0 * s0));

  if (h < Math.fround(0.05 * s0)) {
    const rSq = Math.fround(a * a + y * y);
    const segLen = Math.fround(2 * h);
    return Math.fround(((segLen * inv2Pi) / (s0 * s0)) * Math.exp(-rSq * invTwoS0Sq));
  }

  const invSqrt2S0 = Math.fround(invSqrt2 / s0);
  const u0 = Math.fround((a - h) * invSqrt2S0);
  const u1 = Math.fround((a + h) * invSqrt2S0);
  const erfDiff = Math.max(0, erfDiffFloat32(u0, u1));
  return Math.fround(0.5 * erfDiff * (invSqrt2Pi / s0) * Math.exp(-(y * y) * invTwoS0Sq));
}

function applySeparableBlurGrid(
  grid: Float32Array,
  size: number,
  sigma1: number,
  finalScale: number
): Float32Array {
  const taps = computeGaussianBlurTaps(sigma1);
  const temp = new Float32Array(size * size);
  const out = new Float32Array(size * size);

  const sampleBilinear1D = (
    buf: Float32Array,
    rowOffset: number,
    stride: number,
    coord: number
  ): number => {
    const clamped = Math.max(0, Math.min(size - 1, coord));
    const i0 = Math.floor(clamped);
    const i1 = Math.min(size - 1, i0 + 1);
    const frac = clamped - i0;
    return (1 - frac) * buf[rowOffset + i0 * stride] + frac * buf[rowOffset + i1 * stride];
  };

  // Horizontal pass
  for (let y = 0; y < size; y++) {
    const rowOff = y * size;
    for (let x = 0; x < size; x++) {
      let sum = grid[rowOff + x] * taps.centerWeight;
      for (let m = 0; m < taps.pairCount; m++) {
        const off = taps.tapOffsets[m];
        const sPlus = sampleBilinear1D(grid, rowOff, 1, x + off);
        const sMinus = sampleBilinear1D(grid, rowOff, 1, x - off);
        sum += (sPlus + sMinus) * taps.tapWeights[m];
      }
      temp[rowOff + x] = sum;
    }
  }

  // Vertical pass
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = temp[y * size + x] * taps.centerWeight;
      for (let m = 0; m < taps.pairCount; m++) {
        const off = taps.tapOffsets[m];
        const sPlus = sampleBilinear1D(temp, x, size, y + off);
        const sMinus = sampleBilinear1D(temp, x, size, y - off);
        sum += (sPlus + sMinus) * taps.tapWeights[m];
      }
      out[y * size + x] = sum * finalScale;
    }
  }

  return out;
}

describe('WebGL2HeatmapLayer (Approach A: 2-stage GPU KDE)', () => {
  const sampleTracks = new Map<string, GPXTrack>([
    [
      'track-1',
      {
        id: 'track-1',
        name: 'Ride 1',
        points: [
          { lat: 54.35, lon: 18.65 },
          { lat: 54.36, lon: 18.66 },
        ],
      },
    ],
  ]);

  it('skips Stage 2 blur at thickness=1, dpr=1 (heatmapDensity=0.75) and runs Stage 2 blur at dpr=2', () => {
    // dpr = 1 -> R_fbo = 0.85, sigmaTotRaw = 0.85 / 1.55 = 0.5484 <= SIGMA_0_PX -> skip blur
    withDevicePixelRatio(1, () => {
      const mockMap = createMockMapLibreInstance({
        center: { lat: 54.352375, lng: 18.656686 },
        zoom: 14,
      });
      const gl = createMockWebGL2Context();
      const layer = new WebGL2HeatmapLayer(sampleTracks, {
        lineThickness: 1,
        layerTransparency: 0.85,
        heatmapDensity: 0.75,
      });

      layer.onAdd(mockMap as never, gl);
      layer.prerender(gl, createRenderInput());
      layer.render(gl);

      const { drawCalls, errors } = gl._state;
      expect(errors).toEqual([]);
      expect(drawCalls).toHaveLength(2);
      expect(new Set(drawCalls.map((d) => d.program?.id)).size).toBe(2);

      // Draw 0: Stage 1 hairline -> rawDensityFbo
      const stage1 = drawCalls[0];
      expect(stage1.api).toBe('drawArraysInstanced');
      expect(stage1.mode).toBe(gl.TRIANGLE_STRIP);
      expect(stage1.first).toBe(0);
      expect(stage1.count).toBe(4);
      expect(stage1.instanceCount).toBe(1);
      expect(stage1.fbo).not.toBeNull();
      expect(stage1.viewport).toEqual([0, 0, 800, 600]);
      expect(stage1.blendEnabled).toBe(true);
      expect(stage1.blendEquation).toBe(gl.FUNC_ADD);
      expect(stage1.blendFunc).toEqual([gl.ONE, gl.ONE]);
      expect((stage1.uniforms.u_matrix as number[]).length).toBe(16);
      expect((stage1.uniforms.u_camCenterHi as number[]).length).toBe(2);
      expect((stage1.uniforms.u_camCenterLo as number[]).length).toBe(2);
      expect(stage1.uniforms.u_viewport).toEqual([800, 600]);
      expect(stage1.uniforms.u_sigma0).toBeCloseTo(SIGMA_0_PX, 6);
      expect(stage1.uniforms.u_pointScale).toBeCloseTo(1.0, 6);
      expect(stage1.uniforms.u_hitWeight).toBeCloseTo(1.0, 6);

      // Draw 1: Composite reading rawDensityTex directly
      const composite = drawCalls[1];
      expect(composite.api).toBe('drawArrays');
      expect(composite.mode).toBe(gl.TRIANGLE_STRIP);
      expect(composite.first).toBe(0);
      expect(composite.count).toBe(4);
      expect(composite.fbo).toBeNull();
      expect(composite.textures[0]).toBe(stage1.targetTex);
      expect(composite.textures[1]).not.toBeNull();
      expect(composite.textures[1]).not.toBe(composite.textures[0]);
      expect(composite.blendEnabled).toBe(true);
      expect(composite.blendFunc).toEqual([gl.ONE, gl.ONE_MINUS_SRC_ALPHA]);
      expect(composite.uniforms.u_densityScale).toBeCloseTo(Math.sqrt(2 * Math.PI) * SIGMA_0_PX, 5);
      expect(composite.uniforms.u_intensity).toBe(1.0);
      expect(composite.uniforms.u_gamma).toBe(1.0);
      expect(composite.uniforms.u_transparency).toBe(0.85);
      expect(composite.uniforms.u_edgeLow).toBeCloseTo(0.42, 4);
      expect(composite.uniforms.u_edgeHigh).toBeCloseTo(0.78, 4);

      layer.onRemove(mockMap as never, gl);
    });

    // dpr = 2 -> R_fbo = 1.70, sigmaTotRaw = 1.0968 > 0.85 + 1e-3 -> Stage 2 blur runs
    withDevicePixelRatio(2, () => {
      const mockMap = createMockMapLibreInstance({
        center: { lat: 54.352375, lng: 18.656686 },
        zoom: 14,
      });
      const gl = createMockWebGL2Context();
      const layer = new WebGL2HeatmapLayer(sampleTracks, {
        lineThickness: 1,
        layerTransparency: 0.85,
        heatmapDensity: 0.75,
      });

      layer.onAdd(mockMap as never, gl);
      layer.prerender(gl, createRenderInput());
      layer.render(gl);

      const { drawCalls, errors } = gl._state;
      expect(errors).toEqual([]);
      expect(drawCalls).toHaveLength(4);
      expect(drawCalls[1].blendEnabled).toBe(false);
      expect(drawCalls[2].blendEnabled).toBe(false);
      expect(drawCalls[3].uniforms.u_densityScale).toBe(1.0);
      expect(drawCalls[3].uniforms.u_edgeLow).toBeCloseTo(0.18, 6);
      expect(drawCalls[3].uniforms.u_edgeHigh).toBeCloseTo(0.42, 6);

      layer.onRemove(mockMap as never, gl);
    });
  });

  it.each([1, 2])(
    'runs full 2-stage KDE pipeline at thickness=10, dpr=%i with 40B VAO, <=24 blur pairs, and disabled blur blending',
    (dpr) => {
      withDevicePixelRatio(dpr, () => {
        const mockMap = createMockMapLibreInstance({
          center: { lat: 54.352375, lng: 18.656686 },
          zoom: 14,
        });
        const gl = createMockWebGL2Context();
        const layer = new WebGL2HeatmapLayer(sampleTracks, {
          lineThickness: 10,
          layerTransparency: 0.85,
          heatmapDensity: 0.75,
        });

        layer.onAdd(mockMap as never, gl);

        // Verify 40-byte (10-float) instanced VAO layout including a_segmentMeta (location 3)
        expect(
          gl._state.vertexAttribPointers.some(
            (p) => p.index === 1 && p.stride === 40 && p.offset === 0
          )
        ).toBe(true);
        expect(
          gl._state.vertexAttribPointers.some(
            (p) => p.index === 2 && p.stride === 40 && p.offset === 16
          )
        ).toBe(true);
        expect(
          gl._state.vertexAttribPointers.some(
            (p) => p.index === 3 && p.size === 2 && p.stride === 40 && p.offset === 32
          )
        ).toBe(true);

        layer.prerender(gl, createRenderInput());

        // After prerender(), previous FBO (null) and viewport ([0,0,800,600]) must be restored
        expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBeNull();
        expect(Array.from(gl.getParameter(gl.VIEWPORT) as Int32Array)).toEqual([0, 0, 800, 600]);

        layer.render(gl);

        const { drawCalls, errors } = gl._state;
        expect(errors).toEqual([]);
        expect(drawCalls).toHaveLength(4);
        expect(new Set(drawCalls.map((d) => d.program?.id)).size).toBe(3);
        expect(Number(drawCalls[0].uniforms.u_pxPerMerc)).toBeGreaterThan(0);
        expect(Number(drawCalls[0].uniforms.u_sigmaTot)).toBeGreaterThanOrEqual(SIGMA_0_PX);

        const fboW = 800 * dpr;
        const fboH = 600 * dpr;
        const sigmaTot = (getHeatmapBrushRadiusCssPx(10) * dpr) / 1.55;
        const sigma1 = Math.sqrt(sigmaTot * sigmaTot - SIGMA_0_PX * SIGMA_0_PX);
        const gutterPx = Math.ceil(3.5 * sigma1);
        const rawW = fboW + 2 * gutterPx;
        const rawH = fboH + 2 * gutterPx;

        // Draw 0: Stage 1 hairline -> rawDensityFbo (overscan gutter)
        const stage1 = drawCalls[0];
        expect(stage1.api).toBe('drawArraysInstanced');
        expect(stage1.blendEnabled).toBe(true);
        expect(stage1.blendFunc).toEqual([gl.ONE, gl.ONE]);
        expect(stage1.viewport).toEqual([0, 0, rawW, rawH]);
        expect(stage1.uniforms.u_pointScale).toBeCloseTo(sigmaTot / SIGMA_0_PX, 4);

        // Draw 1: Stage 2a horizontal blur -> blurTempFbo
        const pass2a = drawCalls[1];
        expect(pass2a.api).toBe('drawArrays');
        expect(pass2a.mode).toBe(gl.TRIANGLE_STRIP);
        expect(pass2a.first).toBe(0);
        expect(pass2a.count).toBe(4);
        expect(pass2a.blendEnabled).toBe(false);
        expect(pass2a.fbo).not.toBeNull();
        expect(pass2a.fbo).not.toBe(stage1.fbo);
        expect(pass2a.textures[0]).toBe(stage1.targetTex);
        const step2a = pass2a.uniforms.u_texelStep as number[];
        expect(step2a[0]).toBeCloseTo(1 / rawW, 8);
        expect(step2a[1]).toBeCloseTo(0, 8);
        expect(pass2a.uniforms.u_outputScale).toBeCloseTo(1.0, 6);

        const pairCount = pass2a.uniforms.u_pairCount as number;
        expect(pairCount).toBeGreaterThanOrEqual(1);
        expect(pairCount).toBeLessThanOrEqual(MAX_BLUR_PAIRS);

        const centerW = pass2a.uniforms.u_centerWeight as number;
        const tapWeights = pass2a.uniforms.u_tapWeights as number[];
        let weightSum = centerW;
        for (let i = 0; i < pairCount; i++) {
          weightSum += 2 * tapWeights[i];
        }
        expect(weightSum).toBeCloseTo(1.0, 5);

        // Draw 2: Stage 2b vertical blur -> densityFbo
        const pass2b = drawCalls[2];
        expect(pass2b.api).toBe('drawArrays');
        expect(pass2b.blendEnabled).toBe(false);
        expect(pass2b.fbo).not.toBeNull();
        expect(pass2b.fbo).not.toBe(stage1.fbo);
        expect(pass2b.fbo).not.toBe(pass2a.fbo);
        expect(pass2b.textures[0]).toBe(pass2a.targetTex);
        const step2b = pass2b.uniforms.u_texelStep as number[];
        expect(step2b[0]).toBeCloseTo(0, 8);
        expect(step2b[1]).toBeCloseTo(1 / rawH, 8);
        expect(pass2b.uniforms.u_outputScale).toBeCloseTo(Math.sqrt(2 * Math.PI) * sigmaTot, 4);
        expect(pass2b.uniforms.u_pairCount).toBe(pairCount);

        // Draw 3: Composite -> screen
        const composite = drawCalls[3];
        expect(composite.api).toBe('drawArrays');
        expect(composite.fbo).toBeNull();
        expect(composite.blendEnabled).toBe(true);
        expect(composite.blendEquation).toBe(gl.FUNC_ADD);
        expect(composite.blendFunc).toEqual([gl.ONE, gl.ONE_MINUS_SRC_ALPHA]);
        expect(composite.textures[0]).toBe(pass2b.targetTex);
        expect(composite.textures[1]).not.toBeNull();
        expect(composite.uniforms.u_densityScale).toBe(1.0);
        expect(composite.uniforms.u_edgeLow).toBeCloseTo(0.18, 6);
        expect(composite.uniforms.u_edgeHigh).toBeCloseTo(0.42, 6);

        layer.onRemove(mockMap as never, gl);
      });
    }
  );

  it('clamps FBO dimensions to MAX_MOBILE_SAFE_FBO_DIM (2560) while preserving aspect ratio and supports edgeStyle glow', () => {
    withDevicePixelRatio(2, () => {
      const mockMap = createMockMapLibreInstance({ zoom: 14 });
      Object.assign(mockMap.getCanvas(), {
        width: 1600,
        height: 900,
        clientWidth: 1600,
        clientHeight: 900,
      });
      const gl = createMockWebGL2Context();
      const layer = new WebGL2HeatmapLayer(sampleTracks, {
        lineThickness: 10,
        layerTransparency: 0.9,
        heatmapDensity: 0.75,
        edgeStyle: 'glow',
      });

      layer.onAdd(mockMap as never, gl);
      layer.prerender(gl, createRenderInput());
      layer.render(gl);

      expect(gl._state.drawCalls[0].viewport).toEqual([0, 0, 2560, 1440]);
      expect(gl._state.drawCalls[3].uniforms.u_edgeLow).toBe(0.0);
      expect(gl._state.drawCalls[3].uniforms.u_edgeHigh).toBeCloseTo(0.88, 6);

      layer.onRemove(mockMap as never, gl);
    });
  });

  it('binds gl.LINEAR unconditionally on RGBA16F density textures even without float-linear extensions (Critical Fix 1)', () => {
    withDevicePixelRatio(1, () => {
      const mockMap = createMockMapLibreInstance({ zoom: 14 });
      const gl = createMockWebGL2Context({
        extensions: { EXT_color_buffer_float: {} },
      });

      expect(gl.getExtension('OES_texture_float_linear')).toBeNull();
      expect(gl.getExtension('OES_texture_half_float_linear')).toBeNull();

      const layer = new WebGL2HeatmapLayer(sampleTracks, {
        lineThickness: 10,
        layerTransparency: 0.85,
        heatmapDensity: 0.75,
      });

      layer.onAdd(mockMap as never, gl);
      layer.prerender(gl, createRenderInput());

      const floatTextures = Array.from(gl._state.textureMeta.values()).filter(
        (m) => m.internalFormat === gl.RGBA16F
      );
      expect(floatTextures).toHaveLength(3);

      for (const meta of floatTextures) {
        expect(meta.type).toBe(gl.HALF_FLOAT);
        expect(meta.minFilter).toBe(gl.LINEAR);
        expect(meta.magFilter).toBe(gl.LINEAR);
        expect(meta.wrapS).toBe(gl.CLAMP_TO_EDGE);
        expect(meta.wrapT).toBe(gl.CLAMP_TO_EDGE);
      }

      expect(gl._state.texParameterCalls.some((c) => c.param === gl.NEAREST)).toBe(false);

      layer.onRemove(mockMap as never, gl);
    });
  });

  it('falls back cleanly to RGBA8 with 1/32 hitWeight and split blur scaling when float FBOs are unavailable or incomplete', () => {
    const runFallbackAssertions = (glConfig: MockWebGL2Config, thickness: number) => {
      withDevicePixelRatio(1, () => {
        const mockMap = createMockMapLibreInstance({ zoom: 14 });
        const gl = createMockWebGL2Context(glConfig);
        const layer = new WebGL2HeatmapLayer(sampleTracks, {
          lineThickness: thickness,
          layerTransparency: 0.85,
          heatmapDensity: 0.75,
        });

        layer.onAdd(mockMap as never, gl);
        layer.prerender(gl, createRenderInput());
        layer.render(gl);

        const { drawCalls, errors, textureMeta } = gl._state;
        expect(errors).toEqual([]);

        const expectedFboTexCount = thickness === 10 ? 3 : 1;
        const fboTextures = Array.from(textureMeta.values()).filter((m) => (m.height ?? 0) >= 600);
        expect(fboTextures).toHaveLength(expectedFboTexCount);

        for (const meta of fboTextures) {
          expect(meta.format).toBe(gl.RGBA);
          expect(meta.type).toBe(gl.UNSIGNED_BYTE);
          expect([gl.RGBA, gl.RGBA8]).toContain(meta.internalFormat);
          expect(meta.minFilter).toBe(gl.LINEAR);
          expect(meta.magFilter).toBe(gl.LINEAR);
          expect(meta.wrapS).toBe(gl.CLAMP_TO_EDGE);
          expect(meta.wrapT).toBe(gl.CLAMP_TO_EDGE);
        }

        const expectedHitWeight = (Math.sqrt(2 * Math.PI) * SIGMA_0_PX) / 32.0;
        expect(drawCalls[0].uniforms.u_hitWeight).toBeCloseTo(expectedHitWeight, 5);

        if (thickness === 10) {
          expect(drawCalls).toHaveLength(4);
          const sigmaTot = getHeatmapBrushRadiusCssPx(10) / 1.55;
          const expectedSplit = Math.sqrt(sigmaTot / SIGMA_0_PX);
          expect(drawCalls[1].uniforms.u_outputScale).toBeCloseTo(expectedSplit, 4);
          expect(drawCalls[2].uniforms.u_outputScale).toBeCloseTo(expectedSplit, 4);
          expect(drawCalls[3].uniforms.u_densityScale).toBe(32.0);
        } else {
          expect(drawCalls).toHaveLength(2);
          expect(drawCalls[1].uniforms.u_densityScale).toBe(32.0);
        }

        layer.onRemove(mockMap as never, gl);
      });
    };

    runFallbackAssertions({ extensions: {} }, 10);
    runFallbackAssertions({ extensions: {} }, 1);
    runFallbackAssertions(
      { extensions: { EXT_color_buffer_float: {} }, incompleteFloatFbo: true },
      10
    );
  });

  it('cleans up all created programs, buffers, VAOs, FBOs, and textures in onRemove() idempotently without leaks', () => {
    // 1. Full thickness=10 render creates 3 programs, 4 buffers, 4 VAOs, 3 FBOs, 4 textures
    withDevicePixelRatio(1, () => {
      const mockMap = createMockMapLibreInstance({ zoom: 14 });
      const gl = createMockWebGL2Context();
      const layer = new WebGL2HeatmapLayer(sampleTracks, {
        lineThickness: 10,
        layerTransparency: 0.85,
        heatmapDensity: 0.75,
      });

      layer.onAdd(mockMap as never, gl);
      layer.prerender(gl, createRenderInput());
      layer.render(gl);
      layer.onRemove(mockMap as never, gl);

      expect(gl.deleteProgram).toHaveBeenCalledTimes(3);
      expect(gl.deleteBuffer).toHaveBeenCalledTimes(4);
      expect(gl.deleteVertexArray).toHaveBeenCalledTimes(4);
      expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(3);
      expect(gl.deleteTexture).toHaveBeenCalledTimes(4);
      expect(gl._state.nullOrDuplicateDeletes).toEqual([]);
      expect(gl._state.deleted.programs).toHaveLength(gl._state.created.programs.length);
      expect(gl._state.deleted.buffers).toHaveLength(gl._state.created.buffers.length);
      expect(gl._state.deleted.vaos).toHaveLength(gl._state.created.vaos.length);
      expect(gl._state.deleted.fbos).toHaveLength(gl._state.created.fbos.length);
      expect(gl._state.deleted.textures).toHaveLength(gl._state.created.textures.length);

      // Idempotent second onRemove() issues 0 additional delete calls
      layer.onRemove(mockMap as never, gl);
      expect(gl.deleteProgram).toHaveBeenCalledTimes(3);
      expect(gl.deleteBuffer).toHaveBeenCalledTimes(4);
      expect(gl.deleteVertexArray).toHaveBeenCalledTimes(4);
      expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(3);
      expect(gl.deleteTexture).toHaveBeenCalledTimes(4);
    });

    // 2. Blur-skipped thickness=1 render (lazy blur FBOs never allocated) deletes 1 FBO & 2 textures cleanly
    withDevicePixelRatio(1, () => {
      const mockMap = createMockMapLibreInstance({ zoom: 14 });
      const gl = createMockWebGL2Context();
      const layer = new WebGL2HeatmapLayer(sampleTracks, {
        lineThickness: 1,
        layerTransparency: 0.85,
        heatmapDensity: 0.75,
      });

      layer.onAdd(mockMap as never, gl);
      layer.prerender(gl, createRenderInput());
      layer.onRemove(mockMap as never, gl);

      expect(gl.deleteProgram).toHaveBeenCalledTimes(3);
      expect(gl.deleteBuffer).toHaveBeenCalledTimes(4);
      expect(gl.deleteVertexArray).toHaveBeenCalledTimes(4);
      expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(1);
      expect(gl.deleteTexture).toHaveBeenCalledTimes(2);
      expect(gl._state.nullOrDuplicateDeletes).toEqual([]);
    });

    // 3. onRemove() immediately after onAdd() before any prerender() leaves 0 leaks
    withDevicePixelRatio(1, () => {
      const mockMap = createMockMapLibreInstance({ zoom: 14 });
      const gl = createMockWebGL2Context();
      const layer = new WebGL2HeatmapLayer(sampleTracks, {
        lineThickness: 10,
        layerTransparency: 0.85,
        heatmapDensity: 0.75,
      });

      layer.onAdd(mockMap as never, gl);
      layer.onRemove(mockMap as never, gl);

      expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(1);
      expect(gl.deleteTexture).toHaveBeenCalledTimes(2);
      expect(gl._state.nullOrDuplicateDeletes).toEqual([]);
    });
  });

  describe('Approach A mathematical invariants', () => {
    it('computes normalized, monotonic bilinear Gaussian blur taps within MAX_BLUR_PAIRS=24', () => {
      const sigmas = [0.69, 0.743, 1.557, 2.944, 6.233, 12.552];
      for (const sigma1 of sigmas) {
        const taps = computeGaussianBlurTaps(sigma1);
        expect(taps.pairCount).toBeGreaterThanOrEqual(1);
        expect(taps.pairCount).toBeLessThanOrEqual(MAX_BLUR_PAIRS);
        expect(taps.centerWeight).toBeGreaterThan(0);

        let sum = taps.centerWeight;
        for (let m = 0; m < taps.pairCount; m++) {
          const w = taps.tapWeights[m];
          const off = taps.tapOffsets[m];
          expect(w).toBeGreaterThan(0);
          expect(off).toBeGreaterThanOrEqual(2 * m + 1);
          expect(off).toBeLessThanOrEqual(2 * m + 2);
          if (m > 0) {
            expect(w).toBeLessThanOrEqual(taps.tapWeights[m - 1]);
            expect(off).toBeGreaterThan(taps.tapOffsets[m - 1]);
          }
          sum += 2 * w;
        }
        expect(sum).toBeCloseTo(1.0, 5);
      }

      const emptyTaps = computeGaussianBlurTaps(0);
      expect(emptyTaps.centerWeight).toBe(1);
      expect(emptyTaps.pairCount).toBe(0);
    });

    it('evaluates A&S 7.1.26 erfcApprox and sign-split erfDiff without float32 cancellation', () => {
      expect(Math.abs(erfcApprox(0) - 1.0)).toBeLessThan(2e-7);
      expect(Math.abs(erfcApprox(1) - 0.157299207)).toBeLessThan(5e-7);
      expect(Math.abs(erfcApprox(3) - 2.2090497e-5)).toBeLessThan(5e-7);
      expect(erfcApprox(1)).toBeGreaterThan(erfcApprox(2));
      expect(erfcApprox(2)).toBeGreaterThan(erfcApprox(3));
      expect(erfcApprox(6)).toBeGreaterThanOrEqual(0);

      // Far positive tail & tight symmetric interval near origin in float32
      const tailDiff = erfDiffFloat32(3.5, 3.501);
      expect(tailDiff).toBeGreaterThan(0);
      const exactTail = erfcApprox(3.5) - erfcApprox(3.501);
      expect(Math.abs(tailDiff - exactTail) / exactTail).toBeLessThan(2e-3);

      const originDiff = erfDiffFloat32(-1e-4, 1e-4);
      // erf(a) - erf(-a) = 2 * erf(a) ≈ (4 / sqrt(pi)) * a
      const exactOrigin = (4 / Math.sqrt(Math.PI)) * 1e-4;
      expect(Math.abs(originDiff - exactOrigin) / exactOrigin).toBeLessThan(1e-4);
    });

    it('matches continuous segment integral at the L < 0.1*sigma0 short-segment crossover and avoids float32 cancellation', () => {
      const halfLenCrossover = 0.05 * SIGMA_0_PX;
      const invSqrt2Pi = 0.3989422804014327;
      const invSqrt2Sigma0 = 1 / (Math.SQRT2 * SIGMA_0_PX);

      for (const [x, y] of [
        [0, 0],
        [0.5, 0],
        [1.5, 0.4],
      ]) {
        const shortLimit =
          ((2 * halfLenCrossover) / (2 * Math.PI * SIGMA_0_PX * SIGMA_0_PX)) *
          Math.exp(-(x * x + y * y) / (2 * SIGMA_0_PX * SIGMA_0_PX));
        const u0 = (x - halfLenCrossover) * invSqrt2Sigma0;
        const u1 = (x + halfLenCrossover) * invSqrt2Sigma0;
        const exactErf =
          0.5 *
          (erfcApprox(u0) - erfcApprox(u1)) *
          (invSqrt2Pi / SIGMA_0_PX) *
          Math.exp(-(y * y) / (2 * SIGMA_0_PX * SIGMA_0_PX));
        // At L = 0.1*sigma0, O((L/sigma0)^2) Taylor remainder is ~4.1e-4 at (0,0) and ~8.8e-4 at x=1.5
        expect(Math.abs(shortLimit - exactErf) / exactErf).toBeLessThan(
          Math.abs(x) <= 0.5 ? 5e-4 : 1e-3
        );
      }

      // Ultra-short segment L = 1e-4 * sigma0 in float32
      const tinyHalfLen = 0.5e-4 * SIGMA_0_PX;
      const tinyFloat32 = evalStage1SegmentDensityFloat32(0.3, 0.2, tinyHalfLen);
      const exactDouble =
        ((2 * tinyHalfLen) / (2 * Math.PI * SIGMA_0_PX * SIGMA_0_PX)) *
        Math.exp(-(0.3 * 0.3 + 0.2 * 0.2) / (2 * SIGMA_0_PX * SIGMA_0_PX));
      expect(Math.abs(tinyFloat32 - exactDouble) / exactDouble).toBeLessThan(1e-5);
      expect(evalStage1SegmentDensityFloat32(0, 0, 0)).toBe(0);
    });

    it('preserves telescoping invariance across non-uniform splits including ultra-short sub-segments in float32', () => {
      const splits = [-20, -5, -4.98, 2, 20];
      const probePoints: Array<[number, number]> = [
        [0, 0],
        [-5, 0],
        [-4.99, 0.3],
        [2, 0.8],
        [-20, 0],
        [20, 0],
        [7.5, -1.2],
      ];

      for (const [px, py] of probePoints) {
        const singleDensity = evalStage1SegmentDensityFloat32(px, py, 20);
        let splitSum = 0;
        for (let i = 0; i < splits.length - 1; i++) {
          const mid = 0.5 * (splits[i] + splits[i + 1]);
          const halfLen = 0.5 * (splits[i + 1] - splits[i]);
          splitSum += evalStage1SegmentDensityFloat32(px - mid, py, halfLen);
        }
        expect(Math.abs(splitSum - singleDensity)).toBeLessThan(1e-5);
      }
    });

    it('compensates #165 single-point tracks to exact 1.000 peak across thickness 1, 2, 3, 5, and 10', () => {
      const size = 121;
      const center = (size - 1) / 2;

      for (const thickness of [1, 2, 3, 5, 10]) {
        const radiusPx = getHeatmapBrushRadiusCssPx(thickness);
        const sigmaTotRaw = radiusPx / 1.55;
        const needsBlur = sigmaTotRaw > SIGMA_0_PX + 1e-3;
        const sigmaTot = Math.max(SIGMA_0_PX, sigmaTotRaw);
        const sigma1 = needsBlur ? Math.sqrt(sigmaTot * sigmaTot - SIGMA_0_PX * SIGMA_0_PX) : 0;
        const pointScale = needsBlur ? sigmaTot / SIGMA_0_PX : 1.0;

        const stage1Grid = new Float32Array(size * size);
        for (let y = 0; y < size; y++) {
          const dy = y - center;
          for (let x = 0; x < size; x++) {
            const dx = x - center;
            const rSq = dx * dx + dy * dy;
            stage1Grid[y * size + x] =
              (pointScale / (Math.sqrt(2 * Math.PI) * SIGMA_0_PX)) *
              Math.exp(-rSq / (2 * SIGMA_0_PX * SIGMA_0_PX));
          }
        }

        const outGrid = needsBlur
          ? applySeparableBlurGrid(stage1Grid, size, sigma1, Math.sqrt(2 * Math.PI) * sigmaTot)
          : stage1Grid.map((v) => v * Math.sqrt(2 * Math.PI) * SIGMA_0_PX);

        const peak = outGrid[center * size + center];
        expect(peak).toBeGreaterThan(0.98);
        expect(peak).toBeLessThan(1.02);
        if (thickness !== 2) {
          expect(Math.abs(peak - 1.0)).toBeLessThan(0.002);
        }
      }
    });

    it('normalizes straight-line centerline density to 1.000 across 0°, 37°, and 45° and thicknesses 1, 2, 5, 10', () => {
      const size = 161;
      const center = (size - 1) / 2;
      const halfLen = 220;

      for (const angleDeg of [0, 37, 45]) {
        const rad = (angleDeg * Math.PI) / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);

        const stage1Grid = new Float32Array(size * size);
        for (let y = 0; y < size; y++) {
          const dy = y - center;
          for (let x = 0; x < size; x++) {
            const dx = x - center;
            const along = dx * cosA + dy * sinA;
            const across = -dx * sinA + dy * cosA;
            stage1Grid[y * size + x] = evalStage1SegmentDensityFloat32(along, across, halfLen);
          }
        }

        for (const thickness of [1, 2, 5, 10]) {
          const radiusPx = getHeatmapBrushRadiusCssPx(thickness);
          const sigmaTotRaw = radiusPx / 1.55;
          const needsBlur = sigmaTotRaw > SIGMA_0_PX + 1e-3;
          const sigmaTot = Math.max(SIGMA_0_PX, sigmaTotRaw);
          const sigma1 = needsBlur ? Math.sqrt(sigmaTot * sigmaTot - SIGMA_0_PX * SIGMA_0_PX) : 0;

          const outGrid = needsBlur
            ? applySeparableBlurGrid(stage1Grid, size, sigma1, Math.sqrt(2 * Math.PI) * sigmaTot)
            : stage1Grid.map((v) => v * Math.sqrt(2 * Math.PI) * SIGMA_0_PX);

          const centerlineDensity = outGrid[center * size + center];
          expect(Math.abs(centerlineDensity - 1.0)).toBeLessThan(thickness === 2 ? 5e-3 : 2e-3);
        }
      }
    });

    it('keeps small-area tracks at ~1.000 peak and preserves multi-loop city heat at low zoom without altering long routes', () => {
      // 1. Long cycling route (extentPx >> sigmaTot) receives 1.000 boost (no change)
      expect(computeLowZoomTrackBoost(500, 6.0)).toBe(1);
      expect(computeLowZoomTrackBoost(0, 6.0)).toBe(1);

      // 2. Short 500m / 2km walk at Europe/World zoom (extentPx = 0.08..1.2 px, thickness = 1..10):
      //    after 2D Gaussian blur, peak density stays ~1.000 (well above edgeAa=0.18 cutoff).
      const size = 65;
      const center = Math.floor(size / 2);

      for (const extentPx of [0.08, 0.4, 1.2]) {
        for (const thickness of [1, 5, 10]) {
          const radiusPx = getHeatmapBrushRadiusCssPx(thickness);
          const sigmaTotRaw = radiusPx / 1.55;
          const needsBlur = sigmaTotRaw > SIGMA_0_PX + 1e-3;
          const sigmaTot = Math.max(SIGMA_0_PX, sigmaTotRaw);
          const sigma1 = needsBlur ? Math.sqrt(sigmaTot * sigmaTot - SIGMA_0_PX * SIGMA_0_PX) : 0;

          const boost = computeLowZoomTrackBoost(extentPx, sigmaTot);
          const halfLen = extentPx * 0.5;
          const stage1Grid = new Float32Array(size * size);

          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              stage1Grid[y * size + x] =
                boost * evalStage1SegmentDensityFloat32(x - center, y - center, halfLen);
            }
          }

          const outGrid = needsBlur
            ? applySeparableBlurGrid(stage1Grid, size, sigma1, Math.sqrt(2 * Math.PI) * sigmaTot)
            : stage1Grid.map((v) => v * Math.sqrt(2 * Math.PI) * SIGMA_0_PX);

          const peakDensity = outGrid[center * size + center];
          expect(peakDensity).toBeGreaterThan(0.95);
          expect(peakDensity).toBeLessThan(1.05);
        }
      }

      // 3. Multi-loop Vienna city walk (totalArc = 20km inside 1km x 1km -> extent = 4km -> 5x overlap):
      //    at z=4 (1px ≈ 3.3km => extentPx ≈ 1.2px, arcPx ≈ 6.0px), peak density preserves ~5.0x heat.
      const viennaExtentPx = 1.2;
      const viennaArcPx = 6.0;
      const sigmaTot = Math.max(SIGMA_0_PX, getHeatmapBrushRadiusCssPx(5) / 1.55);
      const sigma1 = Math.sqrt(sigmaTot * sigmaTot - SIGMA_0_PX * SIGMA_0_PX);
      const boost = computeLowZoomTrackBoost(viennaExtentPx, sigmaTot);
      const arcScale = viennaArcPx / viennaExtentPx; // 5.0x

      const viennaStage1 = new Float32Array(size * size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          viennaStage1[y * size + x] =
            boost *
            arcScale *
            evalStage1SegmentDensityFloat32(x - center, y - center, viennaExtentPx * 0.5);
        }
      }
      const viennaOut = applySeparableBlurGrid(
        viennaStage1,
        size,
        sigma1,
        Math.sqrt(2 * Math.PI) * sigmaTot
      );
      expect(viennaOut[center * size + center]).toBeGreaterThan(4.75);
      expect(viennaOut[center * size + center]).toBeLessThan(5.25);
    });
  });
});
