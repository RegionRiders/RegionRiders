import {
  packTracksForLines,
  WebGL2LinesLayer,
} from '@/components/ActivityMap/hooks/activity/activitiesLines/WebGL2LinesLayer';
import { GPXTrack } from '@/lib/types';
import { createMockMapLibreInstance } from '@/test-utils/maplibreMock';

function createMockWebGL2Context() {
  const uniformLocations = new Map<object, string>();
  const uniformCalls: Array<{ name: string; values: number[] }> = [];
  const programs: object[] = [];
  let fboCounter = 1;

  const gl: Record<string, any> = {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    TEXTURE_2D: 0x0de1,
    TEXTURE0: 0x84c0,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    LINEAR: 0x2601,
    CLAMP_TO_EDGE: 0x812f,
    RGBA: 0x1908,
    RGBA8: 0x8058,
    UNSIGNED_BYTE: 0x1401,
    RENDERBUFFER: 0x8d41,
    DEPTH_COMPONENT24: 0x81a6,
    DEPTH_COMPONENT16: 0x81a5,
    FRAMEBUFFER: 0x8d40,
    COLOR_ATTACHMENT0: 0x8ce0,
    DEPTH_ATTACHMENT: 0x8d00,
    FRAMEBUFFER_COMPLETE: 0x8cd5,
    FRAMEBUFFER_BINDING: 0x8ca6,
    VIEWPORT: 0x0ba2,
    MAX_TEXTURE_SIZE: 0x0d33,
    COLOR_BUFFER_BIT: 0x4000,
    DEPTH_BUFFER_BIT: 0x0100,
    DEPTH_TEST: 0x0b71,
    SCISSOR_TEST: 0x0c11,
    STENCIL_TEST: 0x0b90,
    CULL_FACE: 0x0b44,
    LESS: 0x0201,
    BLEND: 0x0be2,
    FUNC_ADD: 0x8006,
    ONE: 1,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    TRIANGLE_STRIP: 0x0005,

    createShader: jest.fn(() => ({})),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(() => true),
    getShaderInfoLog: jest.fn(() => ''),
    deleteShader: jest.fn(),

    createProgram: jest.fn(() => {
      const p = { id: programs.length + 1 };
      programs.push(p);
      return p;
    }),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    getProgramInfoLog: jest.fn(() => ''),
    deleteProgram: jest.fn(),
    useProgram: jest.fn(),

    createBuffer: jest.fn(() => ({})),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    deleteBuffer: jest.fn(),

    createVertexArray: jest.fn(() => ({})),
    bindVertexArray: jest.fn(),
    deleteVertexArray: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    vertexAttribDivisor: jest.fn(),

    createFramebuffer: jest.fn(() => ({ fboId: fboCounter++ })),
    bindFramebuffer: jest.fn(),
    framebufferTexture2D: jest.fn(),
    framebufferRenderbuffer: jest.fn(),
    checkFramebufferStatus: jest.fn(() => 0x8cd5),
    deleteFramebuffer: jest.fn(),

    createTexture: jest.fn(() => ({})),
    bindTexture: jest.fn(),
    texParameteri: jest.fn(),
    texImage2D: jest.fn(),
    activeTexture: jest.fn(),
    deleteTexture: jest.fn(),

    createRenderbuffer: jest.fn(() => ({})),
    bindRenderbuffer: jest.fn(),
    renderbufferStorage: jest.fn(),
    deleteRenderbuffer: jest.fn(),

    getParameter: jest.fn((param: number) => {
      if (param === 0x0d33) {
        return 4096;
      }
      if (param === 0x8ca6) {
        return null;
      }
      if (param === 0x0ba2) {
        return [0, 0, 800, 600];
      }
      return 0;
    }),

    viewport: jest.fn(),
    disable: jest.fn(),
    enable: jest.fn(),
    colorMask: jest.fn(),
    depthMask: jest.fn(),
    depthFunc: jest.fn(),
    clearColor: jest.fn(),
    clearDepth: jest.fn(),
    clear: jest.fn(),
    blendEquation: jest.fn(),
    blendFunc: jest.fn(),

    getUniformLocation: jest.fn((_prog: object, name: string) => {
      const loc = { name };
      uniformLocations.set(loc, name);
      return loc;
    }),
    uniform1i: jest.fn((loc: object, v: number) => {
      uniformCalls.push({ name: uniformLocations.get(loc) ?? '', values: [v] });
    }),
    uniform1f: jest.fn((loc: object, v: number) => {
      uniformCalls.push({ name: uniformLocations.get(loc) ?? '', values: [v] });
    }),
    uniform2f: jest.fn((loc: object, x: number, y: number) => {
      uniformCalls.push({ name: uniformLocations.get(loc) ?? '', values: [x, y] });
    }),
    uniform4f: jest.fn((loc: object, x: number, y: number, z: number, w: number) => {
      uniformCalls.push({ name: uniformLocations.get(loc) ?? '', values: [x, y, z, w] });
    }),
    uniformMatrix4fv: jest.fn(),

    drawArraysInstanced: jest.fn(),
    drawArrays: jest.fn(),
  };

  return { gl, uniformCalls };
}

describe('WebGL2LinesLayer', () => {
  const twoTracks = new Map<string, GPXTrack>([
    [
      'track-a',
      {
        id: 'track-a',
        name: 'Track A',
        points: [
          { lat: 54.35, lon: 18.65 },
          { lat: 54.36, lon: 18.66 },
        ],
      },
    ],
    [
      'track-b',
      {
        id: 'track-b',
        name: 'Track B',
        points: [
          { lat: 54.35, lon: 18.65 },
          { lat: 54.36, lon: 18.66 },
        ],
      },
    ],
  ]);

  it('packs tracks into Double-Single Mercator segments and an RBush spatial index', () => {
    const packed = packTracksForLines(twoTracks);
    expect(packed.tracks).toHaveLength(2);
    expect(packed.segmentCount).toBe(2);
    expect(packed.segments.length).toBe(18);
    // Track indices 0 and 1 stored at offset + 8
    expect(packed.segments[8]).toBe(0);
    expect(packed.segments[17]).toBe(1);
  });

  it('hitTest returns the topmost track within pixel radius and null outside', () => {
    const mockMap = createMockMapLibreInstance();
    const layer = new WebGL2LinesLayer(twoTracks, {
      lineThickness: 3,
      lineColor: [255, 0, 0, 0.5],
      lineHoverColor: [255, 100, 100, 0.9],
      layerTransparency: 0.4,
    });
    const { gl } = createMockWebGL2Context();
    layer.onAdd(mockMap as any, gl as any);

    // Midpoint of [18.65, 54.35] -> [18.66, 54.36] in mockMap.project is { x: 1865.5, y: 5435.5 }
    const hit = layer.hitTest({ x: 1865.5, y: 5435.5 });
    expect(hit).toEqual({
      trackIndex: 1,
      trackId: 'track-b',
      name: 'Track B',
    });

    const miss = layer.hitTest({ x: 100, y: 100 });
    expect(miss).toBeNull();
  });

  it('renders lines into offscreen FBO with lineColor and composites whole layer at u_transparency', () => {
    const mockMap = createMockMapLibreInstance();
    const { gl, uniformCalls } = createMockWebGL2Context();
    const layer = new WebGL2LinesLayer(twoTracks, {
      lineThickness: 3,
      lineColor: [255, 0, 0, 0.5],
      lineHoverColor: [0, 255, 0, 0.8],
      layerTransparency: 0.35,
    });

    layer.onAdd(mockMap as any, gl as any);

    const renderInput = {
      modelViewProjectionMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    } as any;

    layer.prerender(gl as any, renderInput);
    layer.render(gl as any, renderInput);

    // Base pass draws with premultiplied lineColor [0.5, 0, 0, 0.5] (NOT multiplied by 0.35!)
    const baseColorCall = uniformCalls.find((c) => c.name === 'u_color');
    expect(baseColorCall?.values).toEqual([0.5, 0, 0, 0.5]);

    // Composite pass applies whole-layer transparency 0.35
    const transparencyCall = uniformCalls.find((c) => c.name === 'u_transparency');
    expect(transparencyCall?.values[0]).toBeCloseTo(0.35);

    expect(gl.drawArraysInstanced).toHaveBeenCalledTimes(1);
    expect(gl.drawArrays).toHaveBeenCalledTimes(1);
  });

  it('draws hovered track in separate FBO pass and skips rendering when layerTransparency is 0', () => {
    const mockMap = createMockMapLibreInstance();
    const { gl, uniformCalls } = createMockWebGL2Context();
    const layer = new WebGL2LinesLayer(twoTracks, {
      lineThickness: 3,
      lineColor: [255, 0, 0, 0.5],
      lineHoverColor: [0, 255, 0, 0.8],
      layerTransparency: 0.6,
    });

    layer.onAdd(mockMap as any, gl as any);
    layer.setHoveredTrackIndex(0);

    const renderInput = {
      modelViewProjectionMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    } as any;

    layer.prerender(gl as any, renderInput);
    layer.render(gl as any, renderInput);

    expect(gl.drawArraysInstanced).toHaveBeenCalledTimes(2);
    const hoveredIndexCalls = uniformCalls.filter((c) => c.name === 'u_hoveredTrackIndex');
    expect(hoveredIndexCalls.map((c) => c.values[0])).toEqual([0, -1]);

    // Setting layerTransparency to 0 skips both FBO pass and composite pass
    gl.drawArraysInstanced.mockClear();
    gl.drawArrays.mockClear();
    layer.updateOptions({
      lineThickness: 3,
      lineColor: [255, 0, 0, 0.5],
      lineHoverColor: [0, 255, 0, 0.8],
      layerTransparency: 0,
    });

    layer.prerender(gl as any, renderInput);
    layer.render(gl as any, renderInput);

    expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
    expect(gl.drawArrays).not.toHaveBeenCalled();

    layer.onRemove(mockMap as any, gl as any);
    expect(gl.deleteFramebuffer).toHaveBeenCalled();
    expect(gl.deleteTexture).toHaveBeenCalled();
    expect(gl.deleteRenderbuffer).toHaveBeenCalled();
  });
});
