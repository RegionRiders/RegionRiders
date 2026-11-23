import { lngLatToMercator } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapGeometryPacker';
import { WebGL2HeatmapLayer } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/WebGL2HeatmapLayer';
import { GPXTrack } from '@/lib/types';
import { createMockMapLibreInstance } from '@/test-utils/maplibreMock';

function createMockWebGL2Context(maxDrawBuffers: number = 4) {
  return {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    TEXTURE_2D: 0x0de1,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    LINEAR: 0x2601,
    NEAREST: 0x2600,
    CLAMP_TO_EDGE: 0x812f,
    RGBA: 0x1908,
    RGBA16F: 0x881a,
    HALF_FLOAT: 0x140b,
    UNSIGNED_BYTE: 0x1401,
    FRAMEBUFFER: 0x8d40,
    COLOR_ATTACHMENT0: 0x8ce0,
    FRAMEBUFFER_COMPLETE: 0x8cd5,
    FRAMEBUFFER_BINDING: 0x8ca6,
    VIEWPORT: 0x0ba2,
    MAX_TEXTURE_SIZE: 0x0d33,
    MAX_DRAW_BUFFERS: 0x8824,
    DEPTH_TEST: 0x0b71,
    STENCIL_TEST: 0x0b90,
    CULL_FACE: 0x0b44,
    SCISSOR_TEST: 0x0c11,
    COLOR_BUFFER_BIT: 0x4000,
    BLEND: 0x0be2,
    FUNC_ADD: 0x8006,
    MAX: 0x8008,
    ONE: 1,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    TRIANGLE_STRIP: 0x0005,
    TEXTURE0: 0x84c0,
    TEXTURE1: 0x84c1,
    createShader: jest.fn(() => ({})),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(() => true),
    getShaderInfoLog: jest.fn(() => ''),
    deleteShader: jest.fn(),
    createProgram: jest.fn(() => ({})),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    getProgramInfoLog: jest.fn(() => ''),
    deleteProgram: jest.fn(),
    useProgram: jest.fn(),
    getUniformLocation: jest.fn((_prog, name: string) => name),
    uniformMatrix4fv: jest.fn(),
    uniform2f: jest.fn(),
    uniform1f: jest.fn(),
    uniform1i: jest.fn(),
    getExtension: jest.fn((name: string) => (name === 'EXT_color_buffer_float' ? {} : null)),
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
    createFramebuffer: jest.fn(() => ({})),
    bindFramebuffer: jest.fn(),
    framebufferTexture2D: jest.fn(),
    drawBuffers: jest.fn(),
    checkFramebufferStatus: jest.fn(() => 0x8cd5),
    deleteFramebuffer: jest.fn(),
    createTexture: jest.fn(() => ({})),
    bindTexture: jest.fn(),
    texParameteri: jest.fn(),
    texImage2D: jest.fn(),
    deleteTexture: jest.fn(),
    activeTexture: jest.fn(),
    getParameter: jest.fn((param: number) => {
      if (param === 0x0d33) {
        return 4096;
      }
      if (param === 0x8824) {
        return maxDrawBuffers;
      }
      if (param === 0x0ba2) {
        return new Int32Array([0, 0, 800, 600]);
      }
      return null;
    }),
    viewport: jest.fn(),
    scissor: jest.fn(),
    disable: jest.fn(),
    enable: jest.fn(),
    colorMask: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    blendEquation: jest.fn(),
    blendFunc: jest.fn(),
    drawArraysInstanced: jest.fn(),
    drawArrays: jest.fn(),
  } as unknown as WebGL2RenderingContext;
}

function createRenderInput(mainMatrix: Float64Array) {
  return {
    farZ: 1000,
    nearZ: 1,
    fov: 0.6,
    modelViewProjectionMatrix: new Float64Array(16) as any,
    projectionMatrix: new Float64Array(16) as any,
    defaultProjectionData: {
      mainMatrix: mainMatrix as any,
      fallbackMatrix: mainMatrix as any,
      tileMercatorCoords: [0, 0, 1, 1] as [number, number, number, number],
      clippingPlane: [0, 0, 0, 0] as [number, number, number, number],
      projectionTransition: 0,
      clipAntimeridian: false,
    },
    shaderData: { variantName: 'mercator', vertexShaderPrelude: '', define: '' },
    getProjectionData: jest.fn(),
  };
}

describe('WebGL2HeatmapLayer', () => {
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

  it('uses MRT gl.MAX pass + gl.FUNC_ADD resolve pass with 64-bit RTC uniforms, scissor culling, and full cleanup', () => {
    const mockMap = createMockMapLibreInstance({
      center: { lat: 54.352375, lng: 18.656686 },
      zoom: 14,
    });
    const gl = createMockWebGL2Context(4);

    const layer = new WebGL2HeatmapLayer(sampleTracks, {
      lineThickness: 10,
      layerTransparency: 0.85,
      heatmapDensity: 0.75,
    });

    layer.onAdd(mockMap as any, gl);

    // MapLibre v6 passes Float64Array(16) in defaultProjectionData.mainMatrix
    // Matrix maps camera center (camX, camY) to NDC (0, 0)
    const [camX, camY] = lngLatToMercator(18.656686, 54.352375);
    const mainMatrixF64 = new Float64Array([
      2000,
      0,
      0,
      0,
      0,
      2000,
      0,
      0,
      0,
      0,
      1,
      0,
      -2000 * camX,
      -2000 * camY,
      0,
      1,
    ]);

    layer.prerender(gl, createRenderInput(mainMatrixF64));

    expect(gl.drawBuffers).toHaveBeenCalledWith([
      gl.COLOR_ATTACHMENT0,
      gl.COLOR_ATTACHMENT0 + 1,
      gl.COLOR_ATTACHMENT0 + 2,
      gl.COLOR_ATTACHMENT0 + 3,
    ]);
    expect(gl.uniformMatrix4fv).toHaveBeenCalledWith('u_matrix', false, expect.any(Float32Array));
    expect(gl.uniform2f).toHaveBeenCalledWith(
      'u_camCenterHi',
      expect.any(Number),
      expect.any(Number)
    );
    expect(gl.uniform2f).toHaveBeenCalledWith(
      'u_camCenterLo',
      expect.any(Number),
      expect.any(Number)
    );
    expect(gl.enable).toHaveBeenCalledWith(gl.SCISSOR_TEST);
    expect(gl.scissor).toHaveBeenCalledTimes(1);
    expect(gl.blendEquation).toHaveBeenCalledWith(gl.MAX);
    expect(gl.blendEquation).toHaveBeenCalledWith(gl.FUNC_ADD);
    expect(gl.drawArraysInstanced).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4, 1);
    expect(gl.disable).toHaveBeenCalledWith(gl.SCISSOR_TEST);

    layer.render(gl);
    expect(gl.uniform1f).toHaveBeenCalledWith('u_intensity', 1.0);
    expect(gl.uniform1f).toHaveBeenCalledWith('u_gamma', expect.any(Number));
    // 1 resolve drawArrays in prerender + 1 composite drawArrays in render
    expect(gl.drawArrays).toHaveBeenCalledTimes(2);

    layer.onRemove(mockMap as any, gl);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(3);
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(4);
    expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(2);
    // 4 scratch MRT textures + 1 densityTex + 1 lutTex
    expect(gl.deleteTexture).toHaveBeenCalledTimes(6);
  });

  it('scales to 8 MRT attachments (32 channels/batch) on desktop GPUs and culls offscreen batches', () => {
    const mockMap = createMockMapLibreInstance({
      center: { lat: 0, lng: 0 },
      zoom: 14,
    });
    const gl = createMockWebGL2Context(8);

    const layer = new WebGL2HeatmapLayer(sampleTracks, {
      lineThickness: 3,
      layerTransparency: 1,
      heatmapDensity: 0.75,
    });

    layer.onAdd(mockMap as any, gl);

    // Camera centered at (0, 0) with high zoom -> Gdansk track is far offscreen and must be culled
    const mainMatrixF64 = new Float64Array([
      2000, 0, 0, 0, 0, 2000, 0, 0, 0, 0, 1, 0, -1000, -1000, 0, 1,
    ]);

    layer.prerender(gl, createRenderInput(mainMatrixF64));

    expect(gl.drawBuffers).toHaveBeenCalledWith(
      Array.from({ length: 8 }, (_, i) => gl.COLOR_ATTACHMENT0 + i)
    );
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
    expect(gl.scissor).not.toHaveBeenCalled();

    layer.onRemove(mockMap as any, gl);
    // 8 scratch MRT textures + 1 densityTex + 1 lutTex
    expect(gl.deleteTexture).toHaveBeenCalledTimes(10);
  });
});
