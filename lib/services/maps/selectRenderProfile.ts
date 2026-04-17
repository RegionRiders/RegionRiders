export type RegionRenderProfile = 'mobile' | 'desktop';

/**
 * Picks a rendering profile based on device and network hints.
 * Falls back safely when browser APIs are unavailable.
 */
export function selectRegionRenderProfile(): RegionRenderProfile {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
    };
    deviceMemory?: number;
  };

  const width = window.innerWidth || 1280;
  const memory = nav.deviceMemory ?? 8;
  const connection = nav.connection?.effectiveType ?? '';
  const saveData = Boolean(nav.connection?.saveData);

  const isSmallScreen = width < 1024;
  const isLowMemory = memory <= 4;
  const isSlowNetwork = connection === 'slow-2g' || connection === '2g' || connection === '3g';

  if (saveData || isSmallScreen || isLowMemory || isSlowNetwork) {
    return 'mobile';
  }

  return 'desktop';
}
