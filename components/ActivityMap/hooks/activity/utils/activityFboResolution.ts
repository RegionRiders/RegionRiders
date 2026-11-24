export type ActivityFboMode = 'heatmap' | 'lines';

export interface ActivityFboResolution {
  width: number;
  height: number;
  effectiveScale: number;
  maxTextureDim: number;
  isMobile: boolean;
}

const DESKTOP_PRESETS: Record<
  ActivityFboMode,
  { minScale: number; maxScale: number; maxDim: number }
> = {
  heatmap: { minScale: 1.0, maxScale: 2.0, maxDim: 2560 },
  lines: { minScale: 1.0, maxScale: 2.0, maxDim: 2560 },
};

const MOBILE_PRESETS: Record<
  ActivityFboMode,
  { minScale: number; maxScale: number; maxDim: number }
> = {
  heatmap: { minScale: 1.0, maxScale: 1.5, maxDim: 1600 },
  lines: { minScale: 1.0, maxScale: 2.0, maxDim: 1920 },
};

export function detectMobileDevice(): boolean {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(pointer: coarse)').matches) {
      return true;
    }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string') {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }
  return false;
}

export function getDevicePixelRatio(): number {
  if (typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio)) {
    return Math.max(1, window.devicePixelRatio);
  }
  return 1;
}

export function computeActivityFboResolution(
  cssWidth: number,
  cssHeight: number,
  glMaxTextureSize: number,
  mode: ActivityFboMode,
  options: { dpr?: number; isMobile?: boolean } = {}
): ActivityFboResolution {
  const safeCssW = Math.max(1, cssWidth);
  const safeCssH = Math.max(1, cssHeight);
  const dpr = Math.max(1, options.dpr ?? getDevicePixelRatio());
  const isMobile = options.isMobile ?? detectMobileDevice();

  const preset = isMobile ? MOBILE_PRESETS[mode] : DESKTOP_PRESETS[mode];
  const scale = Math.min(preset.maxScale, Math.max(preset.minScale, dpr));
  const maxTextureDim = Math.max(
    1,
    Math.min(preset.maxDim, glMaxTextureSize > 0 ? glMaxTextureSize : preset.maxDim)
  );

  const targetW = safeCssW * scale;
  const targetH = safeCssH * scale;
  const maxTargetDim = Math.max(targetW, targetH);
  const clampRatio = maxTargetDim > maxTextureDim ? maxTextureDim / maxTargetDim : 1;

  const width = Math.max(1, Math.min(maxTextureDim, Math.round(targetW * clampRatio)));
  const height = Math.max(1, Math.min(maxTextureDim, Math.round(targetH * clampRatio)));
  const effectiveScale = safeCssW > 0 ? width / safeCssW : scale;

  return {
    width,
    height,
    effectiveScale,
    maxTextureDim,
    isMobile,
  };
}
